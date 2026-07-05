import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import type {
  RoundsCreateReportUploadResult,
  RoundsCreateWorkflowStatus,
  RoundsTournamentContext,
  TournamentRoundsCreateSummary,
  TournamentRoundsCreateWorkflowResult,
} from '@/domains/data-provider-v2/contracts/rounds';
import { SofaScoreRoundProvider } from '@/domains/data-provider-v2/providers/sofascore/round-provider';
import { PlaywrightRuntime } from '@/domains/data-provider-v2/transport/playwright/runtime';
import { randomUUID } from 'crypto';
import { runTournamentRoundsCreate } from '@/domains/data-provider-v2/use-cases/rounds/run-tournament-rounds-create';
import {
  createRoundsCreateExecutionJob,
  failRoundsCreateExecutionJob,
  finalizeRoundsCreateExecutionJob,
  type RoundsCreateExecutionJob,
} from './execution-job-store';
import {
  buildRoundsCreateDetails,
  buildRoundsCreateReport,
  buildRoundsCreateReportData,
  buildRoundsCreateSummary,
  deriveRoundsCreateWorkflowStatus,
  mergeRoundsCreateSummaryWithReportUpload,
} from './report-builder';
import { uploadRoundsCreateReport } from './report-uploader';
import { notifyRoundsCreateExecution } from './slack-notifier';

export type RoundsCreateOperationResult = {
  requestId: string;
  tournamentId: string;
  tournamentLabel: string;
  status: RoundsCreateWorkflowStatus;
  summary: TournamentRoundsCreateSummary;
  reportUpload?: RoundsCreateReportUploadResult;
  result: TournamentRoundsCreateWorkflowResult;
  executionJob: RoundsCreateExecutionJob;
};

export const runTournamentRoundsCreateOperation = async (input: {
  tournament: RoundsTournamentContext;
  requestId?: string;
  startedAt?: Date;
}): Promise<RoundsCreateOperationResult> => {
  const requestId = input.requestId ?? randomUUID();
  const startedAt = input.startedAt ?? new Date();

  let executionJobCreated = false;
  let runtime: PlaywrightRuntime | null = null;
  let roundsResult: TournamentRoundsCreateWorkflowResult | null = null;
  let reportUpload: RoundsCreateReportUploadResult | undefined;

  try {
    await createRoundsCreateExecutionJob({
      requestId,
      tournamentId: input.tournament.tournamentId,
      startedAt,
    });
    executionJobCreated = true;

    runtime = await PlaywrightRuntime.create();
    const session = await runtime.createSession();

    try {
      roundsResult = await runTournamentRoundsCreate({
        tournament: input.tournament,
        roundProvider: SofaScoreRoundProvider.fromSession(session),
      });
    } finally {
      await session.close();
    }

    const completedAt = new Date();
    const status = deriveRoundsCreateWorkflowStatus(roundsResult);
    const summary = buildRoundsCreateSummary(roundsResult);
    const details = buildRoundsCreateDetails(roundsResult);
    const data = buildRoundsCreateReportData(roundsResult);
    const report = buildRoundsCreateReport({
      requestId,
      result: roundsResult,
      startedAt,
      completedAt,
      status,
      summary,
      details,
      data,
    });

    reportUpload = await uploadRoundsCreateReport(report);

    const summaryWithReportUpload = mergeRoundsCreateSummaryWithReportUpload({
      summary,
      reportUpload,
    });

    const finalizedExecutionJob = await finalizeRoundsCreateExecutionJob({
      requestId,
      status,
      completedAt,
      duration: completedAt.getTime() - startedAt.getTime(),
      reportFileKey: reportUpload.reportFileKey,
      reportFileUrl: reportUpload.reportFileUrl,
      summary: summaryWithReportUpload,
    });

    if (!finalizedExecutionJob) {
      throw new Error(`Rounds create execution finalization returned no row for requestId=${requestId}`);
    }

    await notifyRoundsCreateExecution({
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
      result: roundsResult,
      executionJob: finalizedExecutionJob,
    };
  } catch (error) {
    const completedAt = new Date();
    const errorMessage = error instanceof Error ? error.message : String(error);
    const fallbackSummary = roundsResult ? buildRoundsCreateSummary(roundsResult) : createFallbackSummary();
    const fallbackSummaryWithReportUpload = reportUpload
      ? mergeRoundsCreateSummaryWithReportUpload({
          summary: fallbackSummary,
          reportUpload,
        })
      : fallbackSummary;

    if (executionJobCreated) {
      try {
        await failRoundsCreateExecutionJob({
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
          operation: 'runTournamentRoundsCreateOperation.finalizeFailure',
          requestId,
          tournamentId: input.tournament.tournamentId,
        });
      }
    }

    await notifyRoundsCreateExecution({
      requestId,
      tournamentId: input.tournament.tournamentId,
      tournamentLabel: input.tournament.tournamentLabel,
      status: 'failed',
      summary: fallbackSummaryWithReportUpload,
      reportUpload,
      errorMessage,
    });

    throw error;
  } finally {
    await runtime?.close();
  }
};

const createFallbackSummary = (): TournamentRoundsCreateSummary => {
  return {
    totalOperations: 0,
    successfulOperations: 0,
    failedOperations: 0,
    fetchedRounds: 0,
    normalizedRounds: 0,
    createdRounds: 0,
    skippedExistingRounds: 0,
    seasonRoundsCount: 0,
    knockoutRoundsCount: 0,
    providerIssuesCount: 0,
    invalidProviderRoundsCount: 0,
  };
};
