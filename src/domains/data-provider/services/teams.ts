import type { ENDPOINT_STANDINGS } from '@/domains/data-provider/providers/sofascore_v2/schemas/endpoints';
import { BaseScraper } from '../providers/playwright/base-scraper';
import { Profiling } from '@/services/profiling';
import { DB_InsertTeam } from '@/domains/team/schema';
import { safeString, sleep } from '@/utils';
import { QUERIES_TEAMS } from '@/domains/team/queries';
import { TournamentRoundsQueries } from '@/domains/tournament-round/queries';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';

export class TeamsService {
  private scraper: BaseScraper;

  constructor(scraper: BaseScraper) {
    this.scraper = scraper;
  }

  private getTeamLogoUrl(teamId: string | number): string {
    return `https://api.sofascore.app/api/v1/team/${teamId}/image`;
  }

  private async enhanceTeamWithLogo(team: {
    id: string | number;
    name: string;
    shortName: string;
    nameCode: string;
  }) {
    try {
      const logoUrl = this.getTeamLogoUrl(team.id);
      const s3Key = await this.scraper.uploadAsset({
        logoUrl,
        filename: `team-${team.id}`,
      });

      if (!team.id)
        throw new Error(
          `[TeamsService] - [ERROR] - [ENHANCE TEAM WITH LOGO] - [TEAM ID IS NULL] - [TEAM] ${team.name}`
        );

      return {
        name: team.name,
        externalId: safeString(team.id) as string,
        shortName: team.nameCode,
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

  public async mapTournamentTeams(standingsResponse: ENDPOINT_STANDINGS) {
    const groups = standingsResponse.standings.map(group => {
      const groupTeams = group.rows.map(row => {
        const team = row.team;
        return {
          id: team.id,
          name: team.name,
          shortName: team.shortName,
          slug: team.slug,
          nameCode: team.nameCode,
        };
      });
      return {
        groupId: group.id,
        groupName: group.name,
        teams: groupTeams,
      };
    });

    return groups.flatMap(group => group.teams);
  }

  public async fetchTeamsFromStandings(baseUrl: string) {
    try {
      const url = `${baseUrl}/standings/total`;
      await this.scraper.goto(url);
      Profiling.log({
        msg: '[START] - FETCHING TEAMS FROM STANDINGS',
        source: 'DATA_PROVIDER_TEAMS_fetchTeamsFromStandings',
        data: { url },
      });
      const rawContent = await this.scraper.getPageContent();
      const teams = await this.mapTournamentTeams(rawContent);

      Profiling.log({
        msg: '[SUCCESS] - FETCHED TEAMS FROM STANDINGS',
        source: 'DATA_PROVIDER_TEAMS_fetchTeamsFromStandings',
        data: { teamsCount: teams.length },
      });

      return teams;
    } catch (error: unknown) {
      Profiling.error({
        source: 'DATA_PROVIDER_TEAMS_fetchTeamsFromStandings',
        error: error as Error,
      });
      throw error;
    }
  }

  public async fetchTeamsFromKnockoutRounds(tournamentId: string) {
    try {
      const rounds = await TournamentRoundsQueries.getKnockoutRounds({
        tournamentId,
      });

      Profiling.log({
        msg: '[START] - FETCHING TEAMS FROM KNOCKOUT ROUNDS',
        source: 'DATA_PROVIDER_TEAMS_fetchTeamsFromKnockoutRounds',
        data: { roundsCount: rounds.length },
      });

      const ALL_KNOCKOUT_TEAMS = [];

      for (const round of rounds) {
        Profiling.log({
          msg: '[START] - FETCHING ROUND',
          data: { roundUrl: round.providerUrl },
          source: 'DATA_PROVIDER_TEAMS_fetchTeamsFromKnockoutRounds',
        });

        await this.scraper.goto(round.providerUrl);
        const rawContent = await this.scraper.getPageContent();
        const teams = await this.mapTournamentTeams(rawContent);
        ALL_KNOCKOUT_TEAMS.push(...teams);

        Profiling.log({
          msg: '[SUCCESS] - FETCHED ROUND',
          source: 'DATA_PROVIDER_TEAMS_fetchTeamsFromKnockoutRounds',
          data: { teamsCount: teams.length },
        });

        await sleep(3000);
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
    const teamsFromStandings = await this.fetchTeamsFromStandings(tournament.baseUrl);
    const teamsFromKnockoutRounds = await this.fetchTeamsFromKnockoutRounds(
      tournament.baseUrl
    );
    const allTeams = [...teamsFromStandings, ...teamsFromKnockoutRounds];

    Profiling.log({
      msg: `Number of teams from standings: ${teamsFromStandings.length}`,
      source: 'DATA_PROVIDER_TEAMS_processTeams',
    });
    Profiling.log({
      msg: `Number of teams from knockout rounds: ${teamsFromKnockoutRounds.length}`,
      source: 'DATA_PROVIDER_TEAMS_processTeams',
    });
    Profiling.log({
      msg: `Number of teams to be processed: ${allTeams.length}`,
      source: 'DATA_PROVIDER_TEAMS_processTeams',
    });

    const enhancedTeams: DB_InsertTeam[] = [];

    // Process teams sequentially
    for (const team of allTeams) {
      try {
        Profiling.log({
          msg: `[START] - ENHANCING TEAM ${team.name}`,
          source: 'DATA_PROVIDER_TEAMS_processTeams',
        });
        const enhancedTeam = await this.enhanceTeamWithLogo(team);
        enhancedTeams.push(enhancedTeam);
        Profiling.log({
          msg: `[SUCCESS] - ENHANCED TEAM ${team.name}`,
          source: 'DATA_PROVIDER_TEAMS_processTeams',
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
