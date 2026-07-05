import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import type {
  RoundsTournamentContext,
  RoundsUpdateReportUploadResult,
  RoundsUpdateWorkflowStatus,
  TournamentRoundsUpdateSummary,
  TournamentRoundsUpdateWorkflowResult,
} from '@/domains/data-provider-v2/contracts/rounds';
import { SofaScoreRoundProvider } from '@/domains/data-provider-v2/providers/sofascore/round-provider';
import { PlaywrightRuntime } from '@/domains/data-provider-v2/transport/playwright/runtime';
import { randomUUID } from 'crypto';
import { runTournamentRoundsUpdate } from '@/domains/data-provider-v2/use-cases/rounds/run-tournament-rounds-update';
import {
  createRoundsUpdateExecutionJob,
  failRoundsUpdateExecutionJob,
  finalizeRoundsUpdateExecutionJob,
  type RoundsUpdateExecutionJob,
} from './execution-job-store';
import {
  buildRoundsUpdateDetails,
  buildRoundsUpdateReport,
  buildRoundsUpdateReportData,
  buildRoundsUpdateSummary,
  deriveRoundsUpdateWorkflowStatus,
  mergeRoundsUpdateSummaryWithReportUpload,
} from './report-builder';
import { uploadRoundsUpdateReport } from './report-uploader';
import { notifyRoundsUpdateExecution } from './slack-notifier';

export type RoundsUpdateOperationResult = {
  requestId: string;
  tournamentId: string;
  tournamentLabel: string;
  status: RoundsUpdateWorkflowStatus;
  summary: TournamentRoundsUpdateSummary;
  reportUpload?: RoundsUpdateReportUploadResult;
  result: TournamentRoundsUpdateWorkflowResult;
  executionJob: RoundsUpdateExecutionJob;
};

export const runTournamentRoundsUpdateOperation = async (input: {
  tournament: RoundsTournamentContext;
  requestId?: string;
  startedAt?: Date;
}): Promise<RoundsUpdateOperationResult> => {
  const requestId = input.requestId ?? randomUUID();
  const startedAt = input.startedAt ?? new Date();

  let executionJobCreated = false;
  let runtime: PlaywrightRuntime | null = null;
  let roundsResult: TournamentRoundsUpdateWorkflowResult | null = null;
  let reportUpload: RoundsUpdateReportUploadResult | undefined;

  try {
    await createRoundsUpdateExecutionJob({
      requestId,
      tournamentId: input.tournament.tournamentId,
      startedAt,
    });
    executionJobCreated = true;

    runtime = await PlaywrightRuntime.create();
    const session = await runtime.createSession();

    try {
      roundsResult = await runTournamentRoundsUpdate({
        tournament: input.tournament,
        roundProvider: SofaScoreRoundProvider.fromSession(session),
      });
    } finally {
      await session.close();
    }

    const completedAt = new Date();
    const status = deriveRoundsUpdateWorkflowStatus(roundsResult);
    const summary = buildRoundsUpdateSummary(roundsResult);
    const details = buildRoundsUpdateDetails(roundsResult);
    const data = buildRoundsUpdateReportData(roundsResult);
    const report = buildRoundsUpdateReport({
      requestId,
      result: roundsResult,
      startedAt,
      completedAt,
      status,
      summary,
      details,
      data,
    });

    reportUpload = await uploadRoundsUpdateReport(report);

    const summaryWithReportUpload = mergeRoundsUpdateSummaryWithReportUpload({
      summary,
      reportUpload,
    });

    const finalizedExecutionJob = await finalizeRoundsUpdateExecutionJob({
      requestId,
      status,
      completedAt,
      duration: completedAt.getTime() - startedAt.getTime(),
      reportFileKey: reportUpload.reportFileKey,
      reportFileUrl: reportUpload.reportFileUrl,
      summary: summaryWithReportUpload,
    });

    if (!finalizedExecutionJob) {
      throw new Error(`Rounds update execution finalization returned no row for requestId=${requestId}`);
    }

    await notifyRoundsUpdateExecution({
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
    const fallbackSummary = roundsResult ? buildRoundsUpdateSummary(roundsResult) : createFallbackSummary();
    const fallbackSummaryWithReportUpload = reportUpload
      ? mergeRoundsUpdateSummaryWithReportUpload({
          summary: fallbackSummary,
          reportUpload,
        })
      : fallbackSummary;

    if (executionJobCreated) {
      try {
        await failRoundsUpdateExecutionJob({
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
          operation: 'runTournamentRoundsUpdateOperation.finalizeFailure',
          requestId,
          tournamentId: input.tournament.tournamentId,
        });
      }
    }

    await notifyRoundsUpdateExecution({
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

const createFallbackSummary = (): TournamentRoundsUpdateSummary => {
  return {
    totalOperations: 0,
    successfulOperations: 0,
    failedOperations: 0,
    fetchedRounds: 0,
    normalizedRounds: 0,
    upsertedRounds: 0,
    createdRounds: 0,
    updatedRounds: 0,
    seasonRoundsCount: 0,
    knockoutRoundsCount: 0,
    providerIssuesCount: 0,
    invalidProviderRoundsCount: 0,
  };
};
