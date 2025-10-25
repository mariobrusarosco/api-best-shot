import { DataProviderReport } from '@/domains/data-provider/services/report';
import { QUERIES_TOURNAMENT } from '@/domains/tournament/queries';
import { DB_InsertTournamentStandings, T_TournamentStandings } from '@/domains/tournament/schema';
import db from '@/services/database';
import { Profiling } from '@/services/profiling';
import { safeString } from '@/utils';
import { BaseScraper } from '../providers/playwright/base-scraper';
import { API_SOFASCORE_STANDINGS } from '../typing';
import { DataProviderExecutionOperationType } from '../typing';
import { DataProviderExecution } from './execution';

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

      return createdStandings;
    } catch (error) {
      const errorMessage = (error as Error).message;

      // ------ GENERATE REPORT EVEN ON FAILURE (with fallback) ------
      let reportUploadResult: { s3Key?: string; s3Url?: string } = {};
      try {
        reportUploadResult = await this.reporter.createFileAndUpload();
      } catch (reportError) {
        console.error('Failed to upload report file:', reportError);
        Profiling.error({
          error: reportError,
          data: { requestId: this.requestId, originalError: errorMessage },
          source: 'STANDINGS_DATA_PROVIDER_INIT_report_upload_failed',
        });
      }

      // ------ MARK EXECUTION AS FAILED (always notify) ------
      const reportSummaryResult = this.reporter.getSummary();
      try {
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
      } catch (notificationError) {
        console.error('Failed to send failure notification:', notificationError);
        Profiling.error({
          error: notificationError,
          data: { requestId: this.requestId, originalError: errorMessage },
          source: 'STANDINGS_DATA_PROVIDER_INIT_notification_failed',
        });
      }

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

      return createdStandings;
    } catch (error) {
      const errorMessage = (error as Error).message;

      // ------ GENERATE REPORT EVEN ON FAILURE (with fallback) ------
      let reportUploadResult: { s3Key?: string; s3Url?: string } = {};
      try {
        reportUploadResult = await this.reporter.createFileAndUpload();
      } catch (reportError) {
        console.error('Failed to upload report file:', reportError);
        Profiling.error({
          error: reportError,
          data: { requestId: this.requestId, originalError: errorMessage },
          source: 'STANDINGS_DATA_PROVIDER_UPDATE_report_upload_failed',
        });
      }

      // ------ MARK EXECUTION AS FAILED (always notify) ------
      const reportSummaryResult = this.reporter.getSummary();
      try {
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
      } catch (notificationError) {
        console.error('Failed to send failure notification:', notificationError);
        Profiling.error({
          error: notificationError,
          data: { requestId: this.requestId, originalError: errorMessage },
          source: 'STANDINGS_DATA_PROVIDER_UPDATE_notification_failed',
        });
      }

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

    const standings = fetchedStandings.standings.flatMap((group: unknown) => {
      const groupData = group as { name: string; rows: unknown[] };
      return groupData.rows.map((row: unknown) => {
        const rowData = row as {
          team: { id: unknown; shortName: unknown; name: unknown };
          position: unknown;
          points: unknown;
          matches: unknown;
          wins: unknown;
          draws: unknown;
          losses: unknown;
          scoresFor: unknown;
          scoresAgainst: unknown;
          scoreDiffFormatted: unknown;
        };
        return {
          teamExternalId: safeString(rowData.team.id) || '',
          tournamentId: tournamentId,
          order: safeString(rowData.position) || '',
          groupName: groupData.name,
          shortName: safeString(rowData.team.shortName) || '',
          longName: safeString(rowData.team.name) || '',
          points: safeString(rowData.points) || '',
          games: safeString(rowData.matches) || '',
          wins: safeString(rowData.wins) || '',
          draws: safeString(rowData.draws) || '',
          losses: safeString(rowData.losses) || '',
          gf: safeString(rowData.scoresFor) || '',
          ga: safeString(rowData.scoresAgainst) || '',
          gd: safeString(rowData.scoreDiffFormatted) || '',
          provider: 'sofascore',
        };
      });
    });

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
