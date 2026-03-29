import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import {
  SCOREBOARD_EXECUTION_STATUSES,
  type TournamentScoreboardExecutionReportUploadResult,
} from '@/domains/scoreboard/contracts';
import { randomUUID } from 'crypto';
import {
  completeTournamentScoreboardExecutionJob,
  failTournamentScoreboardExecutionJob,
  partiallyFailTournamentScoreboardExecutionJob,
  type TournamentScoreboardExecutionJob,
} from './execution-job-store';
import {
  buildAppliedMatchDetail,
  buildExecutionDetails,
  buildExecutionReport,
  buildExecutionReportData,
  buildExecutionSummary,
  buildUnexpectedFailureMatchDetail,
  mergeExecutionSummaryWithReportUpload,
} from './report-builder';
import { uploadTournamentScoreboardExecutionReport } from './report-uploader';
import {
  runTournamentScoreboardBacklogProcessing,
  type TournamentScoreboardBacklogProcessingResult,
} from './tournament-runner';
import { notifyTournamentScoreboardExecution } from './slack-notifier';
import type { MatchAwaitingScoreboardCalculation, ProcessEndedMatchForScoreboardResult } from './types';

export type RunTournamentScoreboardExecutionInput = {
  tournamentId: string;
  tournamentLabel?: string;
  requestId?: string;
  startedAt?: Date;
  batchSize?: number;
  processEndedMatchForScoreboard: (
    match: MatchAwaitingScoreboardCalculation
  ) => Promise<ProcessEndedMatchForScoreboardResult>;
};

export type TournamentScoreboardExecutionResult =
  | {
      outcome: 'already_locked';
      requestId: string;
      tournamentId: string;
      executionJob: null;
      backlogPassCount: number;
      appliedMatchCount: number;
    }
  | {
      outcome: 'completed' | 'partial_failure';
      requestId: string;
      tournamentId: string;
      executionJob: TournamentScoreboardExecutionJob;
      backlogPassCount: number;
      appliedMatchCount: number;
    };

export const runTournamentScoreboardExecution = async (
  input: RunTournamentScoreboardExecutionInput
): Promise<TournamentScoreboardExecutionResult> => {
  const requestId = input.requestId ?? randomUUID();
  const startedAt = input.startedAt ?? new Date();
  const tournamentLabel = input.tournamentLabel?.trim() || input.tournamentId;
  let backlogProcessingResult: Exclude<
    TournamentScoreboardBacklogProcessingResult,
    { outcome: 'already_locked' }
  > | null = null;
  let reportUpload: TournamentScoreboardExecutionReportUploadResult | undefined;

  try {
    const tournamentBacklogProcessingResult = await runTournamentScoreboardBacklogProcessing({
      tournamentId: input.tournamentId,
      requestId,
      startedAt,
      batchSize: input.batchSize,
      processEndedMatchForScoreboard: input.processEndedMatchForScoreboard,
    });

    if (tournamentBacklogProcessingResult.outcome === 'already_locked') {
      return {
        outcome: 'already_locked',
        requestId,
        tournamentId: input.tournamentId,
        executionJob: null,
        backlogPassCount: 0,
        appliedMatchCount: 0,
      };
    }

    backlogProcessingResult = tournamentBacklogProcessingResult;

    const completedAt = new Date();
    const appliedMatchDetails = backlogProcessingResult.appliedMatchResults.map(buildAppliedMatchDetail);
    const unexpectedFailureDetails =
      backlogProcessingResult.failedMatch !== null
        ? [buildUnexpectedFailureMatchDetail(backlogProcessingResult.failedMatch)]
        : [];
    const executionStatus =
      backlogProcessingResult.outcome === 'completed'
        ? SCOREBOARD_EXECUTION_STATUSES.COMPLETED
        : SCOREBOARD_EXECUTION_STATUSES.PARTIAL_FAILURE;
    const executionSummary = buildExecutionSummary({
      appliedDetails: appliedMatchDetails,
      unexpectedFailures: unexpectedFailureDetails,
    });
    const executionDetails = buildExecutionDetails({
      appliedDetails: appliedMatchDetails,
      unexpectedFailures: unexpectedFailureDetails,
    });
    const executionReportData = buildExecutionReportData({
      appliedDetails: appliedMatchDetails,
      unexpectedFailures: unexpectedFailureDetails,
    });
    const executionReport = buildExecutionReport({
      requestId,
      tournamentId: input.tournamentId,
      tournamentLabel,
      startedAt,
      completedAt,
      status: executionStatus,
      summary: executionSummary,
      details: executionDetails,
      data: executionReportData,
    });
    reportUpload = await uploadTournamentScoreboardExecutionReport(executionReport);
    const executionSummaryWithReportUpload = mergeExecutionSummaryWithReportUpload({
      summary: executionSummary,
      reportUpload,
    });
    let finalizedExecutionJob: TournamentScoreboardExecutionJob | null;

    try {
      finalizedExecutionJob =
        executionStatus === SCOREBOARD_EXECUTION_STATUSES.COMPLETED
          ? await completeTournamentScoreboardExecutionJob({
              requestId,
              completedAt,
              duration: completedAt.getTime() - startedAt.getTime(),
              summary: executionSummaryWithReportUpload,
              reportFileKey: reportUpload.reportFileKey,
              reportFileUrl: reportUpload.reportFileUrl,
            })
          : await partiallyFailTournamentScoreboardExecutionJob({
              requestId,
              completedAt,
              duration: completedAt.getTime() - startedAt.getTime(),
              summary: executionSummaryWithReportUpload,
              reportFileKey: reportUpload.reportFileKey,
              reportFileUrl: reportUpload.reportFileUrl,
            });
    } catch (finalizeError) {
      Logger.error(finalizeError as Error, {
        domain: DOMAINS.TOURNAMENT,
        component: 'scoreboard',
        operation: 'runTournamentScoreboardExecution.persistFinalStatusFailure',
        requestId,
        tournamentId: input.tournamentId,
        executionStatus,
        reportUploadStatus: reportUpload.reportUploadStatus,
        reportFileKey: reportUpload.reportFileKey,
        reportFileUrl: reportUpload.reportFileUrl,
        appliedMatchCount: String(backlogProcessingResult.appliedMatchResults.length),
      });

      throw finalizeError;
    }

    if (!finalizedExecutionJob) {
      const finalizeError = new Error(
        `Tournament scoreboard execution finalization returned no row for requestId=${requestId}`
      );

      Logger.error(finalizeError, {
        domain: DOMAINS.TOURNAMENT,
        component: 'scoreboard',
        operation: 'runTournamentScoreboardExecution.persistFinalStatusFailure',
        requestId,
        tournamentId: input.tournamentId,
        executionStatus,
        reportUploadStatus: reportUpload.reportUploadStatus,
        reportFileKey: reportUpload.reportFileKey,
        reportFileUrl: reportUpload.reportFileUrl,
        appliedMatchCount: String(backlogProcessingResult.appliedMatchResults.length),
      });

      throw finalizeError;
    }

    await notifyTournamentScoreboardExecution({
      requestId,
      tournamentId: input.tournamentId,
      tournamentLabel,
      status: executionStatus,
      summary: executionSummaryWithReportUpload,
      reportUpload,
    });

    return {
      outcome: executionStatus,
      requestId,
      tournamentId: input.tournamentId,
      executionJob: finalizedExecutionJob,
      backlogPassCount: backlogProcessingResult.backlogPassCount,
      appliedMatchCount: backlogProcessingResult.appliedMatchResults.length,
    };
  } catch (error) {
    const completedAt = new Date();

    try {
      await failTournamentScoreboardExecutionJob({
        requestId,
        completedAt,
        duration: completedAt.getTime() - startedAt.getTime(),
      });
    } catch (finalizeError) {
      Logger.error(finalizeError as Error, {
        domain: DOMAINS.TOURNAMENT,
        component: 'scoreboard',
        operation: 'runTournamentScoreboardExecution.finalizeFailure',
        requestId,
        tournamentId: input.tournamentId,
      });
    }

    const appliedMatchDetails = backlogProcessingResult?.appliedMatchResults.map(buildAppliedMatchDetail) ?? [];
    const unexpectedFailureDetails =
      backlogProcessingResult?.failedMatch !== null && backlogProcessingResult?.failedMatch !== undefined
        ? [buildUnexpectedFailureMatchDetail(backlogProcessingResult.failedMatch)]
        : [];
    const failedExecutionSummary = buildExecutionSummary({
      appliedDetails: appliedMatchDetails,
      unexpectedFailures: unexpectedFailureDetails,
    });
    const failedExecutionSummaryWithReportUpload = reportUpload
      ? mergeExecutionSummaryWithReportUpload({
          summary: failedExecutionSummary,
          reportUpload,
        })
      : failedExecutionSummary;
    const errorMessage = error instanceof Error ? error.message : String(error);

    await notifyTournamentScoreboardExecution({
      requestId,
      tournamentId: input.tournamentId,
      tournamentLabel,
      status: SCOREBOARD_EXECUTION_STATUSES.FAILED,
      summary: failedExecutionSummaryWithReportUpload,
      reportUpload,
      errorMessage,
    });

    throw error;
  }
};
