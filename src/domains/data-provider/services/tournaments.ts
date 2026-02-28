import db from '@/core/database';
import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import { BaseScraper } from '@/domains/data-provider/providers/playwright/base-scraper';
import { DataProviderExecution } from '@/domains/data-provider/services/execution';
import { DataProviderReport } from '@/domains/data-provider/services/report';
import {
  API_SOFASCORE_ROUNDS,
  CreateTournamentInput,
  DataProviderExecutionOperationType,
} from '@/domains/data-provider/typing';
import { QUERIES_TOURNAMENT } from '@/domains/tournament/queries';
import { DB_InsertTournament, DB_UpdateTournament, T_Tournament } from '@/domains/tournament/schema';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import { randomUUID } from 'crypto';
import { and, eq } from 'drizzle-orm';

export type SyncTournamentCurrentRoundInput = {
  tournamentId: string;
  tournamentSlug: string;
  baseUrl: string;
  label: string;
  provider: string;
};

type SyncTournamentCurrentRoundResult = {
  tournamentId: string;
  tournamentSlug: string;
  currentRoundSlug: string;
  roundsCount: number;
};

type SyncTournamentCurrentRoundBatchResult = {
  results: Array<SyncTournamentCurrentRoundResult & { requestId: string }>;
  failures: Array<{ tournamentId: string; requestId: string; error: Error }>;
};

export class TournamentDataProvider {
  private scraper: BaseScraper;
  private reporter: DataProviderReport;
  private requestId: string;
  private execution: DataProviderExecution | null = null;

  constructor(scraper: BaseScraper, requestId: string) {
    this.scraper = scraper;
    this.requestId = requestId;
    this.reporter = new DataProviderReport(requestId);
    this.execution = null;
  }

  public async createOnDatabase(input: DB_InsertTournament) {
    this.reporter.addOperation('database', 'create_tournament', 'started', {
      externalId: input.externalId,
      label: input.label,
    });

    try {
      const tournament = await SERVICES_TOURNAMENT.createTournament(input);

      this.reporter.addOperation('database', 'create_tournament', 'completed', {
        createdTournamentId: tournament.id,
        label: tournament.label,
      });
      return tournament;
    } catch (error) {
      const errorMessage = (error as Error).message;
      this.reporter.addOperation('database', 'create_tournament', 'failed', {
        error: errorMessage,
      });
      Logger.error(new Error(errorMessage), {
        domain: DOMAINS.DATA_PROVIDER,
        component: 'service',
        operation: 'createOnDatabase',
      });
      throw error;
    }
  }

  public async updateOnDatabase(data: DB_UpdateTournament) {
    this.reporter.addOperation('database', 'update_tournament', 'started', {
      externalId: data.externalId,
      provider: data.provider,
    });

    try {
      const [tournament] = await db
        .update(T_Tournament)
        .set(data)
        .where(and(eq(T_Tournament.externalId, data.externalId), eq(T_Tournament.provider, data.provider)))
        .returning();

      this.reporter.addOperation('database', 'update_tournament', 'completed', {
        updatedTournamentId: tournament.id,
        label: tournament.label,
      });
      return tournament;
    } catch (error) {
      const errorMessage = (error as Error).message;
      this.reporter.addOperation('database', 'update_tournament', 'failed', {
        error: errorMessage,
      });
      Logger.error(new Error(errorMessage), {
        domain: DOMAINS.DATA_PROVIDER,
        component: 'service',
        operation: 'updateOnDatabase',
      });
      throw error;
    }
  }

  public getTournamentLogoUrl(tournamentId: string | number): string {
    return `https://api.sofascore.app/api/v1/unique-tournament/${tournamentId}/image/dark`;
  }

  public async syncCurrentRound(payload: SyncTournamentCurrentRoundInput): Promise<SyncTournamentCurrentRoundResult> {
    const startTime = Date.now();
    this.execution = new DataProviderExecution({
      requestId: this.requestId,
      tournamentId: payload.tournamentId,
      operationType: DataProviderExecutionOperationType.TOURNAMENT_CURRENT_ROUND_SYNC,
    });

    this.reporter.setTournamentInfo({
      label: payload.label,
      tournamentId: payload.tournamentId,
      provider: payload.provider,
    });

    try {
      this.validateSyncCurrentRoundInput(payload);
      const roundsResponse = await this.fetchRounds(payload.baseUrl);
      const currentRoundSlug = this.extractCurrentRoundSlug(roundsResponse);
      await this.persistCurrentRound(payload.tournamentId, currentRoundSlug);

      const reportUploadResult = await this.reporter.createFileAndUpload();
      const reportSummaryResult = this.reporter.getSummary();
      const duration = Date.now() - startTime;

      await this.execution.complete({
        reportFileKey: reportUploadResult?.s3Key,
        reportFileUrl: reportUploadResult?.s3Url,
        tournamentLabel: payload.label,
        duration,
        summary: {
          tournamentId: payload.tournamentId,
          tournamentLabel: payload.label,
          provider: payload.provider,
          currentRoundSlug,
          roundsCount: Array.isArray(roundsResponse.rounds) ? roundsResponse.rounds.length : 0,
          ...reportSummaryResult,
        },
      });

      return {
        tournamentId: payload.tournamentId,
        tournamentSlug: payload.tournamentSlug,
        currentRoundSlug,
        roundsCount: Array.isArray(roundsResponse.rounds) ? roundsResponse.rounds.length : 0,
      };
    } catch (error) {
      const errorMessage = (error as Error).message;

      let reportUploadResult: { s3Key?: string; s3Url?: string } = {};
      try {
        reportUploadResult = await this.reporter.createFileAndUpload();
      } catch (reportError) {
        console.error('Failed to upload report file:', reportError);
        Logger.error(reportError as Error, {
          domain: DOMAINS.DATA_PROVIDER,
          component: 'service',
          operation: 'syncCurrentRound',
          context: 'report_upload_failed',
          requestId: this.requestId,
          originalError: errorMessage,
        });
      }

      const duration = Date.now() - startTime;
      const reportSummaryResult = this.reporter.getSummary();

      try {
        await this.execution?.failure({
          reportFileKey: reportUploadResult.s3Key,
          reportFileUrl: reportUploadResult.s3Url,
          tournamentLabel: payload.label,
          duration,
          error: errorMessage,
          summary: {
            error: errorMessage,
            ...reportSummaryResult,
          },
        });
      } catch (notificationError) {
        console.error('Failed to send failure notification:', notificationError);
        Logger.error(notificationError as Error, {
          domain: DOMAINS.DATA_PROVIDER,
          component: 'service',
          operation: 'syncCurrentRound',
          context: 'notification_failed',
          requestId: this.requestId,
          originalError: errorMessage,
        });
      }

      throw error;
    }
  }

  public static async syncCurrentRoundsForTournamentIds(
    tournamentIds: string[]
  ): Promise<SyncTournamentCurrentRoundBatchResult> {
    if (tournamentIds.length === 0) {
      return { results: [], failures: [] };
    }

    let scraper: BaseScraper | null = null;
    const results: Array<SyncTournamentCurrentRoundResult & { requestId: string }> = [];
    const failures: Array<{ tournamentId: string; requestId: string; error: Error }> = [];

    try {
      scraper = await BaseScraper.createInstance();

      for (const tournamentId of tournamentIds) {
        const requestId = randomUUID();

        try {
          const tournament = await SERVICES_TOURNAMENT.getTournament(tournamentId);
          const service = new TournamentDataProvider(scraper, requestId);
          const result = await service.syncCurrentRound({
            tournamentId: tournament.id,
            tournamentSlug: tournament.slug,
            baseUrl: tournament.baseUrl,
            label: tournament.label,
            provider: tournament.provider,
          });

          results.push({ ...result, requestId });
        } catch (error) {
          const normalizedError = error instanceof Error ? error : new Error(String(error));
          failures.push({ tournamentId, requestId, error: normalizedError });
        }
      }
    } finally {
      if (scraper) {
        await scraper.close();
      }
    }

    return { results, failures };
  }

  private async uploadTournamentLogo(tournamentId: string) {
    this.reporter.addOperation('scraping', 'tournament_logo', 'started');
    const logoUrl = this.getTournamentLogoUrl(tournamentId);
    const s3Key = await this.scraper.uploadAsset({
      logoUrl,
      filename: `tournament-${tournamentId}`,
    });
    const logo = this.scraper.getCloudFrontUrl(s3Key);

    this.reporter.addOperation('scraping', 'tournament_logo', 'completed', {
      logoUrl: logo,
      s3Key,
    });

    return logo;
  }

  private validateTournament(payload: CreateTournamentInput) {
    // ------ INPUT VALIDATION ------
    this.reporter.addOperation('initialization', 'validate_input', 'started');
    // Validate input
    if (!payload.tournamentPublicId) {
      this.reporter.addOperation('initialization', 'validate_input', 'failed', {
        error: 'Tournament ID is null',
      });

      throw new Error('Tournament ID is null');
    }

    this.reporter.addOperation('initialization', 'validate_input', 'completed');
  }

  private validateSyncCurrentRoundInput(payload: SyncTournamentCurrentRoundInput): void {
    this.reporter.addOperation('initialization', 'validate_input', 'started');

    if (!payload.tournamentId || !payload.tournamentId.trim()) {
      this.reporter.addOperation('initialization', 'validate_input', 'failed', {
        error: 'Tournament ID is required',
      });
      throw new Error('Tournament ID is required');
    }

    if (!payload.baseUrl || !payload.baseUrl.trim()) {
      this.reporter.addOperation('initialization', 'validate_input', 'failed', {
        error: 'Tournament baseUrl is required',
      });
      throw new Error('Tournament baseUrl is required');
    }

    this.reporter.addOperation('initialization', 'validate_input', 'completed');
  }

  private async fetchRounds(baseUrl: string): Promise<API_SOFASCORE_ROUNDS> {
    this.reporter.addOperation('scraping', 'fetch_rounds', 'started');

    try {
      const url = `${baseUrl}/rounds`;
      await this.scraper.goto(url);

      const rawContent = (await this.scraper.getPageContent()) as API_SOFASCORE_ROUNDS;
      const roundsCount = Array.isArray(rawContent?.rounds) ? rawContent.rounds.length : 0;

      this.reporter.addOperation('scraping', 'fetch_rounds', 'completed', {
        roundsCount,
        hasCurrentRound: !!rawContent?.currentRound,
      });

      return rawContent;
    } catch (error) {
      const errorMessage = (error as Error).message;

      this.reporter.addOperation('scraping', 'fetch_rounds', 'failed', {
        error: errorMessage,
      });

      throw error;
    }
  }

  private extractCurrentRoundSlug(roundsResponse: API_SOFASCORE_ROUNDS): string {
    this.reporter.addOperation('transformation', 'extract_current_round_slug', 'started');

    const currentRoundSlug = roundsResponse?.currentRound?.slug || roundsResponse?.currentRound?.round.toString();

    if (!currentRoundSlug) {
      this.reporter.addOperation('transformation', 'extract_current_round', 'failed', {
        error: 'current round is missing in rounds response',
      });
      throw new Error('currentRound.slug is missing in rounds response');
    }

    const normalizedSlug = currentRoundSlug.trim().toLowerCase();

    this.reporter.addOperation('transformation', 'extract_current_round', 'completed', {
      currentRoundSlug: normalizedSlug,
    });

    return normalizedSlug;
  }

  private async persistCurrentRound(tournamentId: string, currentRoundSlug: string): Promise<void> {
    this.reporter.addOperation('database', 'update_tournament_current_round', 'started', {
      currentRoundSlug,
    });

    const updatedTournament = await QUERIES_TOURNAMENT.updateTournamentCurrentRound(tournamentId, currentRoundSlug);

    if (!updatedTournament) {
      this.reporter.addOperation('database', 'update_tournament_current_round', 'failed', {
        error: 'Tournament not found while updating current round',
      });
      throw new Error(`Tournament "${tournamentId}" not found while updating current round`);
    }

    this.reporter.addOperation('database', 'update_tournament_current_round', 'completed', {
      updatedTournamentId: updatedTournament.id,
      currentRoundSlug: updatedTournament.currentRound,
    });
  }

  public async init(payload: CreateTournamentInput) {
    const startTime = Date.now();

    try {
      // ------ CREATE EXECUTION TRACKING RECORD AT THE START (IMPLICITLY STARTS EXECUTION) ------
      this.execution = new DataProviderExecution({
        requestId: this.requestId,
        tournamentId: '00000000-0000-0000-0000-000000000000', // Temporary UUID, will be updated after tournament creation
        operationType: DataProviderExecutionOperationType.TOURNAMENT_CREATE,
      });

      // ------ INITIALIZE REPORT TOURNAMENT DATA ------
      this.reporter.setTournamentInfo({
        label: payload.label,
        tournamentId: payload.tournamentPublicId,
        provider: payload.provider,
      });
      // ------ INPUT VALIDATION ------
      this.validateTournament(payload);

      const logo = await this.uploadTournamentLogo(payload.tournamentPublicId);
      const tournament = await this.createOnDatabase({
        externalId: payload.tournamentPublicId,
        baseUrl: payload.baseUrl,
        provider: 'sofascore',
        season: payload.season,
        mode: payload.mode,
        label: payload.label,
        logo,
        standingsMode: payload.standingsMode,
        slug: payload.slug,
      });

      // Update execution with actual tournament ID
      await this.execution?.updateTournamentId(tournament.id);

      // Generate report file
      const reportUpload = await this.reporter.createFileAndUpload();

      // Complete execution tracking with report information and correct tournament ID
      const duration = Date.now() - startTime;
      const summary = this.reporter.getSummary();

      await this.execution?.complete({
        reportFileKey: reportUpload?.s3Key,
        reportFileUrl: reportUpload?.s3Url,
        tournamentLabel: tournament.label,
        summary: {
          tournamentId: tournament.id,
          tournamentLabel: tournament.label,
          provider: payload.provider,
          ...summary,
        },
        duration,
      });

      return tournament;
    } catch (error) {
      console.log('------error payload:', payload);
      console.log('------payload type:', typeof payload);
      console.log('------payload keys:', payload ? Object.keys(payload) : 'no keys');
      const errorMessage = (error as Error).message;

      // ------ GENERATE REPORT FILE EVEN ON FAILURE (with fallback) ------
      let reportResult: { s3Key?: string; s3Url?: string } = {};
      try {
        reportResult = await this.reporter.createFileAndUpload();
      } catch (reportError) {
        console.error('Failed to upload report file:', reportError);
        Logger.error(reportError as Error, {
          domain: DOMAINS.DATA_PROVIDER,
          component: 'service',
          operation: 'init',
          context: 'report_upload_failed',
          requestId: this.requestId,
          originalError: errorMessage,
        });
      }

      // ------ COMPLETE EXECUTION TRACKING AS FAILED (always notify) ------
      const duration = Date.now() - startTime;
      const summary = this.reporter.getSummary();

      try {
        await this.execution?.failure({
          reportFileKey: reportResult.s3Key,
          reportFileUrl: reportResult.s3Url,
          tournamentLabel: payload.label,
          error: errorMessage,
          summary: {
            error: errorMessage,
            ...summary,
          },
          duration,
        });
      } catch (notificationError) {
        console.error('Failed to send failure notification:', notificationError);
        Logger.error(notificationError as Error, {
          domain: DOMAINS.DATA_PROVIDER,
          component: 'service',
          operation: 'init',
          context: 'notification_failed',
          requestId: this.requestId,
          originalError: errorMessage,
        });
      }

      throw error;
    }
  }
}
