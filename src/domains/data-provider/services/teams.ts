import type { ENDPOINT_STANDINGS } from '@/domains/data-provider/providers/sofascore_v2/schemas/endpoints';
import { BaseScraper } from '../providers/playwright/base-scraper';
import { Profiling } from '@/services/profiling';
import { DB_InsertTeam } from '@/domains/team/schema';
import { safeString, sleep } from '@/utils';
import { QUERIES_TEAMS } from '@/domains/team/queries';
import { TournamentQuery } from '@/domains/tournament/queries';
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
      Profiling.error(
        `[TeamsService] Failed to enhance team ${team.name} with logo:`,
        error
      );
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
        msg: '[LOG] - [START] - FETCHING TEAMS FROM STANDINGS AT:',
        data: { url },
        color: 'FgBlue',
      });
      const rawContent = await this.scraper.getPageContent();

      const teams = await this.mapTournamentTeams(rawContent);

      return teams;
    } catch (error) {
      console.error('[SOFASCORE] - [ERROR] - [GET TOURNAMENT TEAMS]', error);
      throw error;
    }
  }

  public async fetchTeamsFromKnockoutRounds(tournamentId: string) {
    try {
      // Query tournament rounds with "type"  "knockout"
      const rounds = await TournamentRoundsQueries.getKnockoutRounds({
        tournamentId,
      });

      const ALL_KNOCKOUT_TEAMS = [];

      for (const round of rounds) {
        console.log('[LOG] - [START] - FETCHING ROUND:', round.providerUrl);
        await this.scraper.goto(round.providerUrl);
        const rawContent = await this.scraper.getPageContent();
        const teams = await this.mapTournamentTeams(rawContent);

        ALL_KNOCKOUT_TEAMS.push(...teams);
        console.log('[LOG] - [END] - FETCHING ROUND:');
        await sleep(3000);
      }

      return ALL_KNOCKOUT_TEAMS;
    } catch (error) {
      console.error('[SOFASCORE] - [ERROR] - [GET TOURNAMENT TEAMS]', error);
      throw error;
    }
  }

  public async createOnDatabase(teams: DB_InsertTeam[]) {
    Profiling.log({ msg: `[LOG] - [START] - CREATING TEAMS ON DATABASE` });

    const createdTeams = await QUERIES_TEAMS.createTeams(teams);

    Profiling.log({
      msg: `[LOG] - [START] - CREATED TEAMS ${createdTeams.length} ON DATABASE`,
    });

    return createdTeams;
  }

  public async upsertOnDatabase(teams: DB_InsertTeam[]) {
    Profiling.log({ msg: '[LOG] - [START] - UPSERTING TEAMS ON DATABASE' });

    await QUERIES_TEAMS.updateTeams(teams);
    Profiling.log({ msg: '[LOG] - [SUCCESS] - UPSERTING TEAMS ON DATABASE' });
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
      msg: `[LOG] - Number of teams from standings: ${teamsFromStandings.length}`,
    });
    Profiling.log({
      msg: `[LOG] - Number of teams from knockout rounds: ${teamsFromKnockoutRounds.length}`,
    });
    Profiling.log({ msg: `[LOG] - Number of teams to be processed: ${allTeams.length}` });

    const enhancedTeams: DB_InsertTeam[] = [];

    // Process teams sequentially
    for (const team of allTeams) {
      try {
        Profiling.log({ msg: `[LOG] - [START] - ENHANCING TEAM ${team.name}` });
        const enhancedTeam = await this.enhanceTeamWithLogo(team);
        enhancedTeams.push(enhancedTeam);
        Profiling.log({ msg: `[LOG] - [SUCCESS] - ENHANCED TEAM ${team.name}` });
        await sleep(1000);
      } catch (error) {
        Profiling.error(`Failed to enhance team ${team.name}:`, error);
        // Continue with next team even if one fails
        continue;
      }
    }

    const query = await this.createOnDatabase(enhancedTeams);
    return query;
  }
}
