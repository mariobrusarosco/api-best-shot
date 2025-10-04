import { QUERIES_TOURNAMENT } from '@/domains/tournament/queries';
import { DB_InsertTournamentStandings, T_TournamentStandings } from '@/domains/tournament/schema';
import db from '@/services/database';
import { Profiling } from '@/services/profiling';
import { safeString } from '@/utils';
import { BaseScraper } from '../providers/playwright/base-scraper';
import { API_SOFASCORE_STANDINGS } from '../providers/sofascore/standings/typing';
import { DataProviderExecutionOperationType } from '../typing';
import { DataProviderExecution } from './execution';
import { DataProviderReport } from '@/domains/data-provider/services/reporter';

export interface CreateStandingsInput {
  tournamentId: string;
  baseUrl: string;
  label: string;
  provider: string;
}

export class StandingsDataProviderService {
  private scraper: BaseScraper;
  private reporter: DataProviderReport;
  private requestId: string;
  private execution: DataProviderExecution | null = null;

  constructor(scraper: BaseScraper, requestId: string) {
    this.scraper = scraper;
    this.requestId = requestId;
    this.reporter = new DataProviderReport(requestId);
  }

  public async init(payload: CreateStandingsInput) {
    // Create execution tracking
    this.execution = new DataProviderExecution({
      requestId: this.requestId,
      tournamentId: payload.tournamentId,
      operationType: DataProviderExecutionOperationType.STANDINGS_CREATE,
    });
    this.reporter.setTournamentInfo({
      label: payload.label,
      tournamentId: payload.tournamentId,
      provider: payload.provider,
    });

    try {
      // ------ INPUT VALIDATION ------
      this.validateTournament(payload);
      // ------ FETCH STANDINGS ------
      const fetchedStandings = await this.fetchStandings(payload.baseUrl);
      // ------ MAP STANDINGS ------
      const mappedStandings = await this.mapStandings(fetchedStandings, payload.tournamentId);
      // ------ CREATE STANDINGS ------
      const createdStandings = await this.createOnDatabase(mappedStandings);
      // ------ UPLOAD REPORT ------
      const reportUploadResult = await this.reporter.createFileAndUpload();
      // ------ GENERATE REPORT SUMMARY ------
      const reportSummaryResult = this.reporter.getSummary();
      // ------ MARK EXECUTION AS COMPLETED ------
      await this.execution?.complete({
        reportFileKey: reportUploadResult?.s3Key,
        reportFileUrl: reportUploadResult?.s3Url,
        tournamentLabel: payload.label,
        summary: {
          tournamentId: payload.tournamentId,
          tournamentLabel: payload.label,
          provider: payload.provider,
          standingsCount: createdStandings.length,
          ...reportSummaryResult,
        },
      });
    } catch (error) {
      const errorMessage = (error as Error).message;

      // ------ GENERATE REPORT EVEN ON FAILURE ------
      const reportUploadResult = await this.reporter.createFileAndUpload();
      // ------ MARK EXECUTION AS FAILED ------
      const reportSummaryResult = this.reporter.getSummary();
      // ------ MARK EXECUTION AS FAILED ------
      await this.execution?.failure({
        reportFileKey: reportUploadResult.s3Key,
        reportFileUrl: reportUploadResult.s3Url,
        tournamentLabel: payload.label,
        error: errorMessage,
        summary: {
          error: errorMessage,
          ...reportSummaryResult,
        },
      });

      throw error;
    }
  }

  public async update(payload: CreateStandingsInput) {
    // Create execution tracking
    this.execution = new DataProviderExecution({
      requestId: this.requestId,
      tournamentId: payload.tournamentId,
      operationType: DataProviderExecutionOperationType.STANDINGS_CREATE,
    });
    this.reporter.setTournamentInfo({
      label: payload.label,
      tournamentId: payload.tournamentId,
      provider: payload.provider,
    });

    try {
      // ------ INPUT VALIDATION ------
      this.validateTournament(payload);
      // ------ FETCH STANDINGS ------
      const fetchedStandings = await this.fetchStandings(payload.baseUrl);
      // ------ MAP STANDINGS ------
      const mappedStandings = await this.mapStandings(fetchedStandings, payload.tournamentId);
      // ------ CREATE STANDINGS ------
      const createdStandings = await this.updateOnDatabase(mappedStandings);
      // ------ UPLOAD REPORT ------
      const reportUploadResult = await this.reporter.createFileAndUpload();
      // ------ GENERATE REPORT SUMMARY ------
      const reportSummaryResult = this.reporter.getSummary();
      // ------ MARK EXECUTION AS COMPLETED ------
      await this.execution?.complete({
        reportFileKey: reportUploadResult?.s3Key,
        reportFileUrl: reportUploadResult?.s3Url,
        tournamentLabel: payload.label,
        summary: {
          tournamentId: payload.tournamentId,
          tournamentLabel: payload.label,
          provider: payload.provider,
          standingsCount: createdStandings.length,
          ...reportSummaryResult,
        },
      });
    } catch (error) {
      const errorMessage = (error as Error).message;

      // ------ GENERATE REPORT EVEN ON FAILURE ------
      const reportUploadResult = await this.reporter.createFileAndUpload();
      // ------ MARK EXECUTION AS FAILED ------
      const reportSummaryResult = this.reporter.getSummary();
      // ------ MARK EXECUTION AS FAILED ------
      await this.execution?.failure({
        reportFileKey: reportUploadResult.s3Key,
        reportFileUrl: reportUploadResult.s3Url,
        tournamentLabel: payload.label,
        error: errorMessage,
        summary: {
          error: errorMessage,
          ...reportSummaryResult,
        },
      });

      throw error;
    }
  }

  private validateTournament(payload: CreateStandingsInput) {
    // ------ INPUT VALIDATION ------
    this.reporter.addOperation('initialization', 'validate_input', 'started');

    // Validate input
    if (!payload.tournamentId) {
      this.reporter.addOperation('initialization', 'validate_input', 'failed', {
        error: 'Tournament ID is null',
      });

      throw new Error('Tournament ID is null');
    }

    this.reporter.addOperation('initialization', 'validate_input', 'completed');
  }

  private async fetchStandings(baseUrl: string) {
    this.reporter.addOperation('scraping', 'fetch_standings', 'started');

    const url = `${baseUrl}/standings/total`;
    await this.scraper.goto(url);
    const rawContent = await this.scraper.getPageContent();

    if (!rawContent?.standings || rawContent?.standings?.length === 0) {
      this.reporter.addOperation('scraping', 'fetch_standings', 'completed', {
        note: 'No standings data found',
      });
      return [];
    }

    this.reporter.addOperation('scraping', 'fetch_standings', 'completed', {
      groupsCount: rawContent.standings.length,
    });

    return rawContent;
  }

  private async mapStandings(fetchedStandings: API_SOFASCORE_STANDINGS, tournamentId: string) {
    this.reporter.addOperation('transformation', 'map_standings', 'started');

    const standings = fetchedStandings.standings.flatMap((group: any) =>
      group.rows.map((row: any) => ({
        teamExternalId: safeString(row.team.id),
        tournamentId: tournamentId,
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
      }))
    );

    if (standings.length === 0) {
      this.reporter.addOperation('transformation', 'map_standings', 'failed', {
        error: 'No standings data found',
      });
      throw new Error('No standings data found');
    }

    this.reporter.addOperation('transformation', 'map_standings', 'completed', {
      standingsCount: standings.length,
    });

    return standings;
  }

  public async createOnDatabase(standings: DB_InsertTournamentStandings[]) {
    this.reporter.addOperation('database', 'create_standings', 'started', {
      standingsCount: standings.length,
    });

    try {
      const query = await db.insert(T_TournamentStandings).values(standings).returning();

      this.reporter.addOperation('database', 'create_standings', 'completed', {
        createdStandingsCount: query.length,
      });

      return query;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.reporter.addOperation('database', 'create_standings', 'failed', {
        error: errorMessage,
      });
      Profiling.error({
        error: errorMessage,
        data: { error: errorMessage },
        source: 'StandingsDataProviderService.createOnDatabase',
      });
      throw error;
    }
  }

  public async updateOnDatabase(standings: DB_InsertTournamentStandings[]) {
    this.reporter.addOperation('database', 'update_standings', 'started', {
      standingsCount: standings.length,
    });

    if (standings.length === 0) {
      this.reporter.addOperation('database', 'update_standings', 'failed', {
        error: 'No standings to update',
      });
      const error = new Error('No standings to update in the database');
      Profiling.error({
        error,
        source: 'StandingsDataProviderService.updateOnDatabase',
      });
      throw error;
    }

    try {
      const query = await QUERIES_TOURNAMENT.upsertTournamentStandings(standings);

      this.reporter.addOperation('database', 'update_standings', 'completed', {
        updatedStandingsCount: query.length,
      });

      return query;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.reporter.addOperation('database', 'update_standings', 'failed', {
        error: errorMessage,
      });
      Profiling.error({
        error: error instanceof Error ? error : new Error(errorMessage),
        source: 'StandingsDataProviderService.updateOnDatabase',
      });
      throw error;
    }
  }
}
