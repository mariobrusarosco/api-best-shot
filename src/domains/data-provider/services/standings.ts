import type { ENDPOINT_STANDINGS } from '@/domains/data-provider/providers/sofascore_v2/schemas/endpoints';
import { QUERIES_TOURNAMENT } from '@/domains/tournament/queries';
import { DB_InsertTournamentStandings, T_TournamentStandings } from '@/domains/tournament/schema';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import db from '@/services/database';
import { Profiling } from '@/services/profiling';
import { safeString } from '@/utils';
import { BaseScraper } from '../providers/playwright/base-scraper';
import { DataProviderReport } from './reporter';

export class StandingsDataProviderService {
  private scraper: BaseScraper;
  private report: DataProviderReport;

  constructor(scraper: BaseScraper, reporter: DataProviderReport) {
    this.scraper = scraper;
    this.report = reporter;
  }

  public async mapTournamentStandings(
    standingsResponse: ENDPOINT_STANDINGS,
    tournament: Awaited<ReturnType<typeof SERVICES_TOURNAMENT.getTournament>>
  ): Promise<DB_InsertTournamentStandings[]> {
    // this.addOperation('transformation', 'map_standings', 'started', {
    //   tournamentId: tournament.id,
    //   groupsCount: standingsResponse.standings.length,
    // });

    try {
      const standings = standingsResponse.standings.map(group => {
        // this.addOperation('transformation', 'process_group', 'started', {
        //   groupId: group.id,
        //   groupName: group.name,
        //   teamsInGroup: group.rows.length,
        // });

        const groupsStandings = group.rows.map(row => ({
          teamExternalId: safeString(row.team.id),
          tournamentId: tournament.id,
          order: safeString(row.position),
          groupName: group.name,
          shortName: safeString(row.team.shortName),
          longName: safeString(row.team.name),
          points: safeString(row.points),
          games: safeString(row.matches),
          wins: safeString(row.wins),
          draws: safeString(row.draws),
          losses: safeString(row.losses),
          gf: safeString(row.scoresFor),
          ga: safeString(row.scoresAgainst),
          gd: row.scoreDiffFormatted,
          provider: 'sofascore',
        }));

        // this.addOperation('transformation', 'process_group', 'completed', {
        //   groupId: group.id,
        //   groupName: group.name,
        //   standingsCreated: groupsStandings.length,
        // });

        // this.report.summary.standingsCounts.groupsProcessed++;
        // this.report.summary.standingsCounts.totalTeams += groupsStandings.length;

        return {
          groupId: group.id,
          groupName: group.name,
          standings: groupsStandings,
        };
      });

      const results = standings.flatMap(group => group.standings) as DB_InsertTournamentStandings[];

      // this.report.summary.standingsCounts.totalGroups = standingsResponse.standings.length;

      // this.addOperation('transformation', 'map_standings', 'completed', {
      //   totalStandingsCreated: results.length,
      //   groupsProcessed: standings.length,
      // });

      return results;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // this.addOperation('transformation', 'map_standings', 'failed', {
      //   error: errorMessage,
      // });
      Profiling.error({
        source: 'DATA_PROVIDER_V2_STANDINGS_mapTournamentStandings',
        error: error instanceof Error ? error : new Error(errorMessage),
      });
      throw error;
    }
  }

  public async fetchStandings(
    tournament: Awaited<ReturnType<typeof SERVICES_TOURNAMENT.getTournament>>
  ): Promise<ENDPOINT_STANDINGS | null> {
    const getStandingsOperation = this.report.createOperation('scraping', 'fetch_standings');
    const url = `${tournament.baseUrl}/standings/total`;

    try {
      await this.scraper.goto(url);
      const rawContent = await this.scraper.getPageContent();

      if (!rawContent?.standings || rawContent?.standings?.length === 0) {
        getStandingsOperation.success({
          url,
          standingsCount: 0,
        });
        return null;
      }

      getStandingsOperation.success({
        url,
        groupsCount: rawContent.standings.length,
        totalTeamsInStandings: rawContent.standings.reduce(
          (total: number, group: { rows: unknown[] }) => total + group.rows.length,
          0
        ),
      });

      return rawContent;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      getStandingsOperation.fail({
        url,
        error: errorMessage,
      });

      Profiling.error({
        source: 'DATA_PROVIDER_V2_STANDINGS_getStandings',
        error: error instanceof Error ? error : new Error(errorMessage),
      });
      throw error;
    }
  }

  public async createOnDatabase(standings: DB_InsertTournamentStandings[]) {
    // this.addOperation('database', 'create_standings', 'started', {
    //   standingsCount: standings.length,
    // });

    try {
      const query = await db.insert(T_TournamentStandings).values(standings);

      // this.addOperation('database', 'create_standings', 'completed', {
      //   createdStandingsCount: standings.length,
      // });

      // this.report.summary.standingsCounts.totalStandingsCreated = standings.length;

      return query;
    } catch (error: unknown) {
      // this.addOperation('database', 'create_standings', 'failed', {
      //   error: errorMessage,
      // });
      throw error;
    }
  }

  public async updateOnDatabase(standings: DB_InsertTournamentStandings[]) {
    // this.addOperation('database', 'update_standings', 'started', {
    //   standingsCount: standings.length,
    // });

    if (standings.length === 0) {
      // this.addOperation('database', 'update_standings', 'failed', {
      //   error: 'No standings to update',
      // });
      Profiling.error({
        error: new Error('No standings to update in the database'),
        source: 'StandingsDataProviderService.updateOnDatabase',
      });
      return [];
    }

    try {
      const query = await QUERIES_TOURNAMENT.upsertTournamentStandings(standings);

      // this.addOperation('database', 'update_standings', 'completed', {
      //   updatedStandingsCount: query.length,
      // });

      return query;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // this.addOperation('database', 'update_standings', 'failed', {
      //   error: errorMessage,
      // });
      Profiling.error({
        error: error instanceof Error ? error : new Error(errorMessage),
        source: 'StandingsDataProviderService.updateOnDatabase',
      });
      throw error;
    }
  }

  public async init(tournament: Awaited<ReturnType<typeof SERVICES_TOURNAMENT.getTournament>>) {
    try {
      this.report.setTournament(tournament);

      // Fetching Standings
      const rawStandings = await this.fetchStandings(tournament);

      // const standings = await this.mapTournamentStandings(rawStandings, tournament);
      // const query = await this.createOnDatabase(standings);

      // return query;

      console.log(rawStandings);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // this.addOperation('initialization', 'process_standings', 'failed', {
      //   error: errorMessage,
      // });
      // await this.generateOperationReport();

      // Complete execution tracking with failure
      // await DataProviderExecutionService.completeExecution(this.report.requestId, {
      //   status: 'failed',
      //   summary: this.report.summary,
      //   duration: Date.now() - startTime,
      // });

      Profiling.error({
        source: 'DATA_PROVIDER_V2_STANDINGS_init',
        error: error instanceof Error ? error : new Error(errorMessage),
      });
      throw error;
    }
  }

  public async updateTournament(tournament: Awaited<ReturnType<typeof SERVICES_TOURNAMENT.getTournament>>) {
    // Create execution tracking record
    // await DataProviderExecutionService.createExecution({
    //   requestId: this.report.requestId,
    //   tournamentId: tournament.id,
    //   operationType: 'standings_update',
    // });

    // Initialize report tournament data
    this.report.tournament = {
      id: tournament.id,
      label: tournament.label,
    };
    this.report.operationType = 'update';

    // this.addOperation('initialization', 'validate_input', 'started', {
    //   tournamentId: tournament.id,
    //   tournamentLabel: tournament.label,
    // });

    try {
      // this.addOperation('initialization', 'validate_input', 'completed', {
      //   tournamentId: tournament.id,
      // });

      const rawStandings = await this.fetchStandings(tournament);

      if (!rawStandings) {
        // this.addOperation('update', 'process_standings', 'completed', {
        //   note: 'No standings data found for tournament',
        // });
        // await this.generateOperationReport();

        // Complete execution tracking with success
        // await DataProviderExecutionService.completeExecution(this.report.requestId, {
        //   status: 'completed',
        //   summary: this.report.summary,
        //   duration: Date.now() - startTime,
        // });

        return [];
      }

      const standings = await this.mapTournamentStandings(rawStandings, tournament);
      const query = await this.updateOnDatabase(standings);

      // Generate operation report at the very end
      // await this.generateOperationReport();

      // Complete execution tracking with success
      // await DataProviderExecutionService.completeExecution(this.report.requestId, {
      //   status: 'completed',
      //   summary: this.report.summary,
      //   duration: Date.now() - startTime,
      // });

      return query;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // this.addOperation('update', 'process_standings', 'failed', {
      //   error: errorMessage,
      // });
      // await this.generateOperationReport();

      // Complete execution tracking with failure
      // await DataProviderExecutionService.completeExecution(this.report.requestId, {
      //   status: 'failed',
      //   summary: this.report.summary,
      //   duration: Date.now() - startTime,
      // });

      Profiling.error({
        source: 'DATA_PROVIDER_V2_STANDINGS_updateTournament',
        error: error instanceof Error ? error : new Error(errorMessage),
      });
      throw error;
    }
  }
}
