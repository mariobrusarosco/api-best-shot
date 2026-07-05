import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import type { BrowserSession } from '@/domains/data-provider-v2/transport/playwright/browser-session';
import type {
  CurrentRoundSyncReportUploadResult,
  CurrentRoundSyncSummary,
  CurrentRoundSyncWorkflowStatus,
  CurrentRoundSyncTournamentContext,
  TournamentCurrentRoundSyncResult,
  TournamentCurrentRoundSyncWorkflowResult,
} from '@/domains/data-provider-v2/contracts/current-round-sync';
import { buildSofaScoreTournamentRoundsUrl } from '@/domains/data-provider-v2/providers/sofascore/endpoints';
import { SofaScoreRoundProvider } from '@/domains/data-provider-v2/providers/sofascore/round-provider';
import { runTournamentCurrentRoundSync } from '@/domains/data-provider-v2/use-cases/current-round-sync/run-tournament-current-round-sync';
import { randomUUID } from 'crypto';
import {
  createCurrentRoundSyncExecutionJob,
  failCurrentRoundSyncExecutionJob,
  finalizeCurrentRoundSyncExecutionJob,
} from './execution-job-store';
import {
  buildCurrentRoundSyncDetails,
  buildCurrentRoundSyncReport,
  buildCurrentRoundSyncReportData,
  buildCurrentRoundSyncSummary,
  deriveCurrentRoundSyncWorkflowStatus,
  mergeCurrentRoundSyncSummaryWithReportUpload,
} from './report-builder';
import { uploadCurrentRoundSyncReport } from './report-uploader';
import { notifyCurrentRoundSyncExecution } from './slack-notifier';

export type TournamentCurrentRoundSyncOperationResult = {
  requestId: string;
  tournamentId: string;
  tournamentLabel: string;
  status: CurrentRoundSyncWorkflowStatus;
  summary: CurrentRoundSyncSummary;
  reportUpload?: CurrentRoundSyncReportUploadResult;
  result: TournamentCurrentRoundSyncResult;
};

export const runTournamentCurrentRoundSyncOperation = async (input: {
  session: BrowserSession;
  tournament: CurrentRoundSyncTournamentContext;
  requestId?: string;
  startedAt?: Date;
}): Promise<TournamentCurrentRoundSyncOperationResult> => {
  const requestId = input.requestId ?? randomUUID();
  const startedAt = input.startedAt ?? new Date();

  let executionJobCreated = false;
  let tournamentResult: TournamentCurrentRoundSyncWorkflowResult | null = null;
  let reportUpload: CurrentRoundSyncReportUploadResult | undefined;

  try {
    await createCurrentRoundSyncExecutionJob({
      requestId,
      tournamentId: input.tournament.tournamentId,
      startedAt,
    });
    executionJobCreated = true;

    const provider = SofaScoreRoundProvider.fromSession(input.session);

    tournamentResult = await runTournamentCurrentRoundSync({
      tournament: input.tournament,
      roundProvider: provider,
    });

    const completedAt = new Date();
    const status = deriveCurrentRoundSyncWorkflowStatus(tournamentResult);
    const summary = buildCurrentRoundSyncSummary(tournamentResult);
    const details = buildCurrentRoundSyncDetails(tournamentResult);
    const data = buildCurrentRoundSyncReportData(tournamentResult);
    const report = buildCurrentRoundSyncReport({
      requestId,
      result: tournamentResult,
      startedAt,
      completedAt,
      status,
      summary,
      details,
      data,
    });

    reportUpload = await uploadCurrentRoundSyncReport(report);

    const summaryWithReportUpload = mergeCurrentRoundSyncSummaryWithReportUpload({
      summary,
      reportUpload,
    });

    const finalizedExecutionJob = await finalizeCurrentRoundSyncExecutionJob({
      requestId,
      status,
      completedAt,
      duration: completedAt.getTime() - startedAt.getTime(),
      reportFileKey: reportUpload.reportFileKey,
      reportFileUrl: reportUpload.reportFileUrl,
      summary: summaryWithReportUpload,
    });

    if (!finalizedExecutionJob) {
      throw new Error(`Current round sync execution finalization returned no row for requestId=${requestId}`);
    }

    await notifyCurrentRoundSyncExecution({
      requestId,
      tournamentId: input.tournament.tournamentId,
      tournamentLabel: input.tournament.tournamentLabel,
      currentRoundSlug: data.currentRoundSlug,
      status,
      summary: summaryWithReportUpload,
      reportUpload,
    });

    return {
      requestId,
      tournamentId: input.tournament.tournamentId,
      tournamentLabel: input.tournament.tournamentLabel,
      status,
      summary: summaryWithReportUpload,
      reportUpload,
      result: {
        tournamentId: input.tournament.tournamentId,
        tournamentLabel: input.tournament.tournamentLabel,
        status,
        summary: summaryWithReportUpload,
        details,
        data,
      },
    };
  } catch (error) {
    const completedAt = new Date();
    const errorMessage = error instanceof Error ? error.message : String(error);
    const fallbackResult = tournamentResult ?? createUnexpectedFailureResult(input.tournament, errorMessage);
    const fallbackSummary = buildCurrentRoundSyncSummary(fallbackResult);
    const fallbackDetails = buildCurrentRoundSyncDetails(fallbackResult);
    const fallbackData = buildCurrentRoundSyncReportData(fallbackResult);
    const fallbackStatus = deriveCurrentRoundSyncWorkflowStatus(fallbackResult);

    if (!reportUpload) {
      reportUpload = await uploadCurrentRoundSyncReport(
        buildCurrentRoundSyncReport({
          requestId,
          result: fallbackResult,
          startedAt,
          completedAt,
          status: fallbackStatus,
          summary: fallbackSummary,
          details: fallbackDetails,
          data: fallbackData,
        })
      );
    }

    const fallbackSummaryWithReportUpload = reportUpload
      ? mergeCurrentRoundSyncSummaryWithReportUpload({
          summary: fallbackSummary,
          reportUpload,
        })
      : fallbackSummary;

    if (executionJobCreated) {
      try {
        await failCurrentRoundSyncExecutionJob({
          requestId,
          completedAt,
          duration: completedAt.getTime() - startedAt.getTime(),
          reportFileKey: reportUpload?.reportFileKey,
          reportFileUrl: reportUpload?.reportFileUrl,
          summary: fallbackSummaryWithReportUpload,
        });
      } catch (finalizeError) {
        Logger.error(finalizeError as Error, {
          domain: DOMAINS.DATA_PROVIDER,
          component: 'operations',
          operation: 'runTournamentCurrentRoundSyncOperation.finalizeFailure',
          requestId,
          tournamentId: input.tournament.tournamentId,
        });
      }
    }

    Logger.error(error instanceof Error ? error : new Error(errorMessage), {
      domain: DOMAINS.DATA_PROVIDER,
      component: 'operations',
      operation: 'runTournamentCurrentRoundSyncOperation.failed',
      requestId,
      tournamentId: input.tournament.tournamentId,
      tournamentLabel: input.tournament.tournamentLabel,
      reportFileUrl: reportUpload?.reportFileUrl,
      reportAvailable: String(reportUpload?.reportAvailable ?? false),
    });

    await notifyCurrentRoundSyncExecution({
      requestId,
      tournamentId: input.tournament.tournamentId,
      tournamentLabel: input.tournament.tournamentLabel,
      currentRoundSlug: fallbackData.currentRoundSlug,
      status: 'failed',
      summary: fallbackSummaryWithReportUpload,
      reportUpload,
      errorMessage,
    });

    throw error;
  }
};

const createUnexpectedFailureResult = (
  tournament: CurrentRoundSyncTournamentContext,
  errorMessage: string
): TournamentCurrentRoundSyncWorkflowResult => {
  return {
    outcome: 'unexpected_failure',
    tournament,
    requestUrl: buildSofaScoreTournamentRoundsUrl(tournament.baseUrl),
    fetchedRounds: 0,
    providerIssues: [],
    unexpectedFailure: {
      requestUrl: buildSofaScoreTournamentRoundsUrl(tournament.baseUrl),
      errorMessage: 'Unexpected tournament current round sync failure',
      causeMessage: errorMessage,
    },
  };
};
