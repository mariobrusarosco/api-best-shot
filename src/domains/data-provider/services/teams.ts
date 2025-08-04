import type {
  ENDPOINT_ROUND,
  ENDPOINT_STANDINGS,
  I_TEAM_FROM_ROUND,
} from '@/domains/data-provider/providers/sofascore_v2/schemas/endpoints';
import { BaseScraper } from '../providers/playwright/base-scraper';
import { Profiling } from '@/services/profiling';
import { DB_InsertTeam } from '@/domains/team/schema';
import { safeString, sleep } from '@/utils';
import { QUERIES_TEAMS } from '@/domains/team/queries';
import { QUERIES_TOURNAMENT_ROUND } from '@/domains/tournament-round/queries';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';

export class TeamsDataProviderService {
  private scraper: BaseScraper;

  constructor(scraper: BaseScraper) {
    this.scraper = scraper;
  }

  private getTeamLogoUrl(teamId: string | number): string {
    return `https://api.sofascore.app/api/v1/team/${teamId}/image`;
  }

  private async enhanceTeamWithLogo(team: DB_InsertTeam) {
    try {
      const logoUrl = this.getTeamLogoUrl(team.externalId);
      const s3Key = await this.scraper.uploadAsset({
        logoUrl,
        filename: `team-${team.externalId}`,
      });

      return {
        name: team.name,
        externalId: safeString(team.externalId) as string,
        shortName: team.shortName,
        badge: this.scraper.getCloudFrontUrl(s3Key),
        provider: 'sofa',
      } satisfies DB_InsertTeam;
    } catch (error) {
      Profiling.error({
        source: 'TEAMS_SERVICE_enhanceTeamWithLogo',
        error: `Failed to enhance team ${team.name} with logo: ${error}`,
      });
      throw error;
    }
  }

  public mapTeamsFromStandings(standingsResponse: ENDPOINT_STANDINGS): DB_InsertTeam[] {
    const groups = standingsResponse.standings.map(group => {
      const groupTeams = group.rows.map(row => {
        const team = row.team;
        return {
          externalId: team.id.toString(),
          name: team.name,
          shortName: team.shortName,
          slug: team.slug,
          nameCode: team.nameCode,
          provider: 'sofa',
          badge: '',
        };
      });
      return groupTeams;
    });

    const teams = groups.flat();

    Profiling.log({
      msg: '[SUCCESS] - MAPPED TEAMS FROM STANDINGS',
      source: 'DATA_PROVIDER_TEAMS_mapTeamsFromStandings',
      data: { teams },
    });

    return teams;
  }

  public mapTeamsFromRound(teams: I_TEAM_FROM_ROUND[]): DB_InsertTeam[] {
    return teams.map(team => {
      return {
        name: team.name,
        shortName: team.shortName,
        slug: team.slug,
        nameCode: team.nameCode,
        externalId: team.id.toString(),
        provider: 'sofa',
        badge: '',
      };
    });
  }

  public async fetchTeamsFromStandings(
    tournament: Awaited<ReturnType<typeof SERVICES_TOURNAMENT.getTournament>>
  ) {
    try {
      const url = `${tournament.baseUrl}/standings/total`;
      await this.scraper.goto(url);
      Profiling.log({
        msg: '[START] - FETCHING TEAMS FROM STANDINGS',
        source: 'DATA_PROVIDER_TEAMS_fetchTeamsFromStandings',
        data: { url },
      });
      const fetchResult = (await this.scraper.getPageContent()) as ENDPOINT_STANDINGS;
      return fetchResult;
    } catch (error: unknown) {
      Profiling.error({
        source: 'DATA_PROVIDER_TEAMS_fetchTeamsFromStandings',
        error: error as Error,
      });
      throw error;
    }
  }

  public async fetchTeamsFromKnockoutRounds(
    tournament: Awaited<ReturnType<typeof SERVICES_TOURNAMENT.getTournament>>
  ) {
    try {
      const rounds = await QUERIES_TOURNAMENT_ROUND.getKnockoutRounds(tournament.id);
      Profiling.log({
        msg: `Knockout rounds we will fetch some teams from...`,
        data: { rounds: rounds.map(round => round.slug || round.label) },
      });

      const ALL_KNOCKOUT_TEAMS = [] as I_TEAM_FROM_ROUND[];
      for (const round of rounds) {
        await this.scraper.goto(round.providerUrl);

        const rawContent = (await this.scraper.getPageContent()) as ENDPOINT_ROUND;

        if (!rawContent?.events || rawContent?.events?.length === 0) {
          Profiling.log({
            msg: `[No data returned from round: (${round.slug}) Skipping to next round]`,
          });
          await sleep(2000);
          continue;
        }

        const roundMatches = rawContent.events;
        const roundTeams = roundMatches.flatMap(match => [
          match.homeTeam,
          match.awayTeam,
        ]);

        Profiling.log({
          msg: `[Fetched teams from round ${round.slug}]`,
          data: { roundTeams },
        });

        ALL_KNOCKOUT_TEAMS.push(...roundTeams);
        await sleep(2000);
      }

      Profiling.log({
        msg: '[SUCCESS] - FETCHED ALL KNOCKOUT TEAMS',
        source: 'DATA_PROVIDER_TEAMS_fetchTeamsFromKnockoutRounds',
        data: { totalTeams: ALL_KNOCKOUT_TEAMS.length },
      });

      return ALL_KNOCKOUT_TEAMS;
    } catch (error: unknown) {
      Profiling.error({
        source: 'DATA_PROVIDER_TEAMS_fetchTeamsFromKnockoutRounds',
        error: error as Error,
      });
      throw error;
    }
  }

  public async createOnDatabase(teams: DB_InsertTeam[]) {
    Profiling.log({
      msg: `[START] - CREATING TEAMS ON DATABASE`,
      source: 'DATA_PROVIDER_TEAMS_createTeamsOnDatabase',
    });

    const createdTeams = await QUERIES_TEAMS.createTeams(teams);

    Profiling.log({
      msg: `[START] - CREATED TEAMS ${createdTeams.length} ON DATABASE`,
      source: 'DATA_PROVIDER_TEAMS_createTeamsOnDatabase',
    });

    return createdTeams;
  }

  public async upsertOnDatabase(teams: DB_InsertTeam[]) {
    Profiling.log({
      msg: '[START] - UPSERTING TEAMS ON DATABASE',
      source: 'DATA_PROVIDER_TEAMS_upsertTeamsOnDatabase',
    });

    await QUERIES_TEAMS.updateTeams(teams);
    Profiling.log({
      msg: '[SUCCESS] - UPSERTING TEAMS ON DATABASE',
      source: 'DATA_PROVIDER_TEAMS_upsertTeamsOnDatabase',
    });
  }

  public async init(
    tournament: Awaited<ReturnType<typeof SERVICES_TOURNAMENT.getTournament>>
  ) {
    Profiling.log({
      msg: `Creating teams for tournament ${tournament.label}]...`,
      data: { tournament },
    });

    const teamsFromStandings = await this.fetchTeamsFromStandings(tournament);
    const mappedTeamsFromStandings = this.mapTeamsFromStandings(teamsFromStandings);
    Profiling.log({
      msg: `Number of teams from standings: ${mappedTeamsFromStandings.length}`,
    });

    const teamsFromKnockoutRounds = await this.fetchTeamsFromKnockoutRounds(tournament);
    const mappedTeamsFromKnockoutRounds = this.mapTeamsFromRound(teamsFromKnockoutRounds);
    Profiling.log({
      msg: `Number of teams from knockout rounds: ${mappedTeamsFromKnockoutRounds.length}`,
    });

    const allTeams = removeDuplicatesTeams(
      mappedTeamsFromStandings,
      mappedTeamsFromKnockoutRounds
    );

    Profiling.log({
      msg: `Teams to be processed`,
      data: allTeams,
    });

    const enhancedTeams: DB_InsertTeam[] = [];
    for (const team of allTeams) {
      try {
        Profiling.log({
          msg: `[START] - ENHANCING TEAM ${team.name}`,
          data: team,
        });
        const enhancedTeam = await this.enhanceTeamWithLogo(team);
        enhancedTeams.push(enhancedTeam);
        Profiling.log({
          msg: `[SUCCESS] - ENHANCED TEAM ${team.name}`,
          data: enhancedTeam,
        });
        await sleep(1000);
      } catch (error) {
        Profiling.error({
          source: 'DATA_PROVIDER_TEAMS_enhanceTeamWithLogo',
          error: `Failed to enhance team ${team.name}: ${error}`,
        });
        // Continue with next team even if one fails
        continue;
      }
    }

    const query = await this.createOnDatabase(enhancedTeams);
    return query;
  }
}

const removeDuplicatesTeams = (
  teamFromStandings: DB_InsertTeam[],
  teamFromKnockoutRounds: DB_InsertTeam[]
) => {
  const allTeams = new Set([...teamFromStandings, ...teamFromKnockoutRounds]);
  return Array.from(allTeams);
};
