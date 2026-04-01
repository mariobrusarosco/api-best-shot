import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import type { BrowserSession } from '@/domains/data-provider-v2/transport/playwright/browser-session';
import type {
  KnockoutRoundsSyncReportUploadResult,
  KnockoutRoundsSyncSummary,
  KnockoutRoundsSyncTournamentContext,
  KnockoutRoundsSyncWorkflowStatus,
  TournamentKnockoutRoundsSyncResult,
  TournamentKnockoutRoundsSyncWorkflowResult,
} from '@/domains/data-provider-v2/contracts/knockout-rounds-sync';
import { randomUUID } from 'crypto';
import { SofaScoreRoundProvider } from '@/domains/data-provider-v2/providers/sofascore/round-provider';
import { runTournamentKnockoutRoundsSync } from '@/domains/data-provider-v2/use-cases/knockout-rounds-sync/run-tournament-knockout-rounds-sync';
import {
  createKnockoutRoundsSyncExecutionJob,
  failKnockoutRoundsSyncExecutionJob,
  finalizeKnockoutRoundsSyncExecutionJob,
} from './execution-job-store';
import {
  buildKnockoutRoundsSyncDetails,
  buildKnockoutRoundsSyncReport,
  buildKnockoutRoundsSyncReportData,
  buildKnockoutRoundsSyncSummary,
  deriveKnockoutRoundsSyncWorkflowStatus,
  mergeKnockoutRoundsSyncSummaryWithReportUpload,
} from './report-builder';
import { uploadKnockoutRoundsSyncReport } from './report-uploader';
import { notifyKnockoutRoundsSyncExecution } from './slack-notifier';

export type TournamentKnockoutRoundsSyncOperationResult = {
  requestId: string;
  tournamentId: string;
  tournamentLabel: string;
  status: KnockoutRoundsSyncWorkflowStatus;
  summary: KnockoutRoundsSyncSummary;
  reportUpload?: KnockoutRoundsSyncReportUploadResult;
  result: TournamentKnockoutRoundsSyncResult;
};

export const runTournamentKnockoutRoundsSyncOperation = async (input: {
  session: BrowserSession;
  tournament: KnockoutRoundsSyncTournamentContext;
  requestId?: string;
  startedAt?: Date;
}): Promise<TournamentKnockoutRoundsSyncOperationResult> => {
  const requestId = input.requestId ?? randomUUID();
  const startedAt = input.startedAt ?? new Date();

  let executionJobCreated = false;
  let tournamentResult: TournamentKnockoutRoundsSyncWorkflowResult | null = null;
  let reportUpload: KnockoutRoundsSyncReportUploadResult | undefined;

  try {
    await createKnockoutRoundsSyncExecutionJob({
      requestId,
      tournamentId: input.tournament.tournamentId,
      startedAt,
    });
    executionJobCreated = true;

    const provider = SofaScoreRoundProvider.fromSession(input.session);

    tournamentResult = await runTournamentKnockoutRoundsSync({
      tournament: input.tournament,
      roundProvider: provider,
    });

    const completedAt = new Date();
    const status = deriveKnockoutRoundsSyncWorkflowStatus(tournamentResult);
    const summary = buildKnockoutRoundsSyncSummary(tournamentResult);
    const details = buildKnockoutRoundsSyncDetails(tournamentResult);
    const data = buildKnockoutRoundsSyncReportData(tournamentResult);
    const report = buildKnockoutRoundsSyncReport({
      requestId,
      result: tournamentResult,
      startedAt,
      completedAt,
      status,
      summary,
      details,
      data,
    });

    reportUpload = await uploadKnockoutRoundsSyncReport(report);

    const summaryWithReportUpload = mergeKnockoutRoundsSyncSummaryWithReportUpload({
      summary,
      reportUpload,
    });

    const finalizedExecutionJob = await finalizeKnockoutRoundsSyncExecutionJob({
      requestId,
      status,
      completedAt,
      duration: completedAt.getTime() - startedAt.getTime(),
      reportFileKey: reportUpload.reportFileKey,
      reportFileUrl: reportUpload.reportFileUrl,
      summary: summaryWithReportUpload,
    });

    if (!finalizedExecutionJob) {
      throw new Error(`Knockout rounds sync execution finalization returned no row for requestId=${requestId}`);
    }

    await notifyKnockoutRoundsSyncExecution({
      requestId,
      tournamentId: input.tournament.tournamentId,
      tournamentLabel: input.tournament.tournamentLabel,
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
    const fallbackSummary = buildKnockoutRoundsSyncSummary(fallbackResult);
    const fallbackDetails = buildKnockoutRoundsSyncDetails(fallbackResult);
    const fallbackData = buildKnockoutRoundsSyncReportData(fallbackResult);
    const fallbackStatus = deriveKnockoutRoundsSyncWorkflowStatus(fallbackResult);

    if (!reportUpload) {
      reportUpload = await uploadKnockoutRoundsSyncReport(
        buildKnockoutRoundsSyncReport({
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
      ? mergeKnockoutRoundsSyncSummaryWithReportUpload({
          summary: fallbackSummary,
          reportUpload,
        })
      : fallbackSummary;

    if (executionJobCreated) {
      try {
        await failKnockoutRoundsSyncExecutionJob({
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
          operation: 'runTournamentKnockoutRoundsSyncOperation.finalizeFailure',
          requestId,
          tournamentId: input.tournament.tournamentId,
        });
      }
    }

    Logger.error(error instanceof Error ? error : new Error(errorMessage), {
      domain: DOMAINS.DATA_PROVIDER,
      component: 'operations',
      operation: 'runTournamentKnockoutRoundsSyncOperation.failed',
      requestId,
      tournamentId: input.tournament.tournamentId,
      tournamentLabel: input.tournament.tournamentLabel,
      reportFileUrl: reportUpload?.reportFileUrl,
      reportAvailable: String(reportUpload?.reportAvailable ?? false),
    });

    await notifyKnockoutRoundsSyncExecution({
      requestId,
      tournamentId: input.tournament.tournamentId,
      tournamentLabel: input.tournament.tournamentLabel,
      status: 'failed',
      summary: fallbackSummaryWithReportUpload,
      reportUpload,
      errorMessage,
    });

    throw error;
  }
};

const createUnexpectedFailureResult = (
  tournament: KnockoutRoundsSyncTournamentContext,
  errorMessage: string
): TournamentKnockoutRoundsSyncWorkflowResult => {
  return {
    outcome: 'unexpected_failure',
    tournament,
    requestUrl: `${tournament.baseUrl.trim()}/rounds`,
    fetchedRounds: 0,
    discoveredRounds: [],
    providerIssues: [],
    invalidProviderRounds: [],
    existingRounds: [],
    candidateKnockoutRounds: [],
    readyKnockoutRounds: [],
    notReadyKnockoutRounds: [],
    upsertableRounds: [],
    upsertedRounds: [],
    createdRounds: [],
    matchesResult: null,
    unexpectedFailure: {
      requestUrl: `${tournament.baseUrl.trim()}/rounds`,
      errorMessage: 'Unexpected knockout rounds sync failure',
      causeMessage: errorMessage,
    },
  };
};
