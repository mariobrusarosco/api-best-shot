import type {
  TournamentScoreboardExecutionDetails,
  TournamentScoreboardExecutionMatchDetail,
  TournamentScoreboardExecutionReport,
  TournamentScoreboardExecutionReportData,
  TournamentScoreboardExecutionReportUploadResult,
  TournamentScoreboardExecutionSummary,
  ScoreboardWorkflowStatus,
} from '@/domains/scoreboard/contracts';
import { SCOREBOARD_APPLY_PENDING_TOURNAMENT_EXECUTION_OPERATION_TYPE } from './execution-job-store';
import type { ProcessPendingScoreboardMatchResult } from './types';

export type UnexpectedFailureMatchInput = {
  matchId: string;
  externalId?: string;
  roundSlug?: string;
  errorMessage: string;
};

export const buildAppliedMatchDetail = (
  result: ProcessPendingScoreboardMatchResult
): TournamentScoreboardExecutionMatchDetail => {
  return {
    matchId: result.matchId,
    externalId: result.externalId,
    roundSlug: result.roundSlug,
    reason: 'applied',
  };
};

export const buildUnexpectedFailureMatchDetail = (
  input: UnexpectedFailureMatchInput
): TournamentScoreboardExecutionMatchDetail => {
  return {
    matchId: input.matchId,
    externalId: input.externalId,
    roundSlug: input.roundSlug,
    reason: 'unexpected_failure',
    errorMessage: input.errorMessage,
  };
};

export const buildExecutionSummary = (input: {
  pendingMatchesDetected: number;
  appliedDetails: TournamentScoreboardExecutionMatchDetail[];
  unexpectedFailures: TournamentScoreboardExecutionMatchDetail[];
  remainingPendingMatches: number;
}): TournamentScoreboardExecutionSummary => {
  return {
    totalOperations: input.appliedDetails.length + input.unexpectedFailures.length,
    successfulOperations: input.appliedDetails.length,
    failedOperations: input.unexpectedFailures.length,
    pendingMatchesDetected: input.pendingMatchesDetected,
    appliedMatches: input.appliedDetails.length,
    remainingPendingMatches: input.remainingPendingMatches,
  };
};

export const mergeExecutionSummaryWithReportUpload = (input: {
  summary: TournamentScoreboardExecutionSummary;
  reportUpload: TournamentScoreboardExecutionReportUploadResult;
}): TournamentScoreboardExecutionSummary => {
  return {
    ...input.summary,
    reportUploadStatus: input.reportUpload.reportUploadStatus,
    reportAvailable: input.reportUpload.reportAvailable,
    reportUploadError: input.reportUpload.reportUploadError,
  };
};

export const buildExecutionDetails = (input: {
  appliedDetails: TournamentScoreboardExecutionMatchDetail[];
  unexpectedFailures: TournamentScoreboardExecutionMatchDetail[];
}): TournamentScoreboardExecutionDetails => {
  return {
    applied: input.appliedDetails,
    unexpectedFailures: input.unexpectedFailures,
  };
};

export const buildExecutionReportData = (input: {
  appliedDetails: TournamentScoreboardExecutionMatchDetail[];
  unexpectedFailures: TournamentScoreboardExecutionMatchDetail[];
}): TournamentScoreboardExecutionReportData => {
  return {
    appliedMatchIds: input.appliedDetails.map(detail => detail.matchId),
    failedMatchIds: input.unexpectedFailures.map(detail => detail.matchId),
  };
};

export const buildExecutionReport = (input: {
  requestId: string;
  tournamentId: string;
  tournamentLabel: string;
  startedAt: Date;
  completedAt: Date;
  status: ScoreboardWorkflowStatus;
  summary: TournamentScoreboardExecutionSummary;
  details: TournamentScoreboardExecutionDetails;
  data: TournamentScoreboardExecutionReportData;
}): TournamentScoreboardExecutionReport => {
  return {
    requestId: input.requestId,
    operationType: SCOREBOARD_APPLY_PENDING_TOURNAMENT_EXECUTION_OPERATION_TYPE,
    status: input.status,
    tournament: {
      tournamentId: input.tournamentId,
      tournamentLabel: input.tournamentLabel,
    },
    startedAt: input.startedAt.toISOString(),
    completedAt: input.completedAt.toISOString(),
    summary: input.summary,
    details: input.details,
    data: input.data,
  };
};
