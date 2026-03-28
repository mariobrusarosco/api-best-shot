import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import { SCOREBOARD_EXECUTION_STATUSES } from '@/domains/scoreboard/contracts';
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
import { runTournamentScoreboardBacklogProcessing } from './tournament-runner';
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

  try {
    const backlogProcessingResult = await runTournamentScoreboardBacklogProcessing({
      tournamentId: input.tournamentId,
      requestId,
      startedAt,
      batchSize: input.batchSize,
      processEndedMatchForScoreboard: input.processEndedMatchForScoreboard,
    });

    if (backlogProcessingResult.outcome === 'already_locked') {
      return {
        outcome: 'already_locked',
        requestId,
        tournamentId: input.tournamentId,
        executionJob: null,
        backlogPassCount: 0,
        appliedMatchCount: 0,
      };
    }

    const completedAt = new Date();
    const tournamentLabel = input.tournamentLabel?.trim() || input.tournamentId;
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
    const reportUpload = await uploadTournamentScoreboardExecutionReport(executionReport);
    const executionSummaryWithReportUpload = mergeExecutionSummaryWithReportUpload({
      summary: executionSummary,
      reportUpload,
    });
    const finalizedExecutionJob =
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

    if (!finalizedExecutionJob) {
      throw new Error(`Tournament scoreboard execution finalization returned no row for requestId=${requestId}`);
    }

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

    throw error;
  }
};
