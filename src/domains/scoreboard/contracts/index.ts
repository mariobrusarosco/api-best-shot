// TODO: EVALUATE THIS PART OF THE ARCHITECTURE. WHY ARE WE USING `CONTRACTS` outside the DATA PROVIDER V2 DOMAIN?
// SHOULD WE? THIS IS VERY SIMILAR TO A typing.ts or type.ts ESTABLISHED FOR a DOMAIN
export const SCOREBOARD_EXECUTION_STATUSES = {
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  PARTIAL_FAILURE: 'partial_failure',
  FAILED: 'failed',
} as const;

export type ScoreboardExecutionStatus =
  (typeof SCOREBOARD_EXECUTION_STATUSES)[keyof typeof SCOREBOARD_EXECUTION_STATUSES];

export type ScoreboardWorkflowStatus = Exclude<
  ScoreboardExecutionStatus,
  typeof SCOREBOARD_EXECUTION_STATUSES.IN_PROGRESS
>;

export const SCOREBOARD_OPERATION_TYPES = {
  APPLY_PENDING_TOURNAMENT: 'scoreboard_apply_pending_tournament_v1',
} as const;

export type ScoreboardOperationType = (typeof SCOREBOARD_OPERATION_TYPES)[keyof typeof SCOREBOARD_OPERATION_TYPES];

export type TournamentScoreboardExecutionSummary = {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  pendingMatchesDetected: number;
  appliedMatches: number;
  remainingPendingMatches: number;
  appliedMatchIdsPreview?: string[];
  failedMatchIdsPreview?: string[];
  reportUploadStatus?: 'uploaded' | 'failed';
  reportAvailable?: boolean;
  reportUploadError?: string;
};

export type TournamentScoreboardExecutionOutcome = 'applied' | 'unexpected_failure';

export type TournamentScoreboardExecutionMatchDetail = {
  matchId: string;
  externalId?: string;
  roundSlug?: string;
  reason: TournamentScoreboardExecutionOutcome;
  errorMessage?: string;
};

export type TournamentScoreboardExecutionDetails = {
  applied: TournamentScoreboardExecutionMatchDetail[];
  unexpectedFailures: TournamentScoreboardExecutionMatchDetail[];
};

export type TournamentScoreboardExecutionReportData = {
  appliedMatchIds: string[];
  failedMatchIds: string[];
};

export type TournamentScoreboardExecutionResult = {
  tournamentId: string;
  status: ScoreboardWorkflowStatus;
  summary: TournamentScoreboardExecutionSummary;
  details: TournamentScoreboardExecutionDetails;
  data: TournamentScoreboardExecutionReportData;
};

export type TournamentScoreboardExecutionReport = {
  requestId: string;
  operationType: typeof SCOREBOARD_OPERATION_TYPES.APPLY_PENDING_TOURNAMENT;
  status: ScoreboardWorkflowStatus;
  tournament: {
    tournamentId: string;
    tournamentLabel: string;
  };
  startedAt: string;
  completedAt: string;
  summary: TournamentScoreboardExecutionSummary;
  details: TournamentScoreboardExecutionDetails;
  data: TournamentScoreboardExecutionReportData;
};

export type TournamentScoreboardExecutionReportUploadResult = {
  reportUploadStatus: 'uploaded' | 'failed';
  reportAvailable: boolean;
  reportFileKey?: string;
  reportFileUrl?: string;
  reportUploadError?: string;
};
