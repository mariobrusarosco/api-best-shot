import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import { QUERIES_TOURNAMENT } from '@/domains/tournament/queries';
import { BaseScraper } from '../providers/playwright/base-scraper';
import { API_SOFASCORE_ROUNDS, DataProviderExecutionOperationType } from '../typing';
import { DataProviderExecution } from './execution';
import { DataProviderReport } from './report';

export type SyncTournamentCurrentRoundInput = {
  tournamentId: string;
  baseUrl: string;
  label: string;
  provider: string;
};

type SyncTournamentCurrentRoundResult = {
  tournamentId: string;
  currentRoundSlug: string;
  roundsCount: number;
};

export class TournamentCurrentRoundDataProviderService {
  private scraper: BaseScraper;
  private reporter: DataProviderReport;
  private requestId: string;
  private execution: DataProviderExecution | null = null;

  constructor(scraper: BaseScraper, requestId: string) {
    this.scraper = scraper;
    this.requestId = requestId;
    this.reporter = new DataProviderReport(requestId);
  }

  public async init(payload: SyncTournamentCurrentRoundInput): Promise<SyncTournamentCurrentRoundResult> {
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
      this.validateInput(payload);
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
          operation: 'syncTournamentCurrentRound',
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
          operation: 'syncTournamentCurrentRound',
          context: 'notification_failed',
          requestId: this.requestId,
          originalError: errorMessage,
        });
      }

      throw error;
    }
  }

  private validateInput(payload: SyncTournamentCurrentRoundInput): void {
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

    const currentRoundSlug = roundsResponse?.currentRound?.slug;

    if (typeof currentRoundSlug !== 'string' || !currentRoundSlug.trim()) {
      this.reporter.addOperation('transformation', 'extract_current_round_slug', 'failed', {
        error: 'currentRound.slug is missing in rounds response',
      });
      throw new Error('currentRound.slug is missing in rounds response');
    }

    const normalizedSlug = currentRoundSlug.trim().toLowerCase();

    this.reporter.addOperation('transformation', 'extract_current_round_slug', 'completed', {
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
}
