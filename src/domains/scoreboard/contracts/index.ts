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

export type ScoreboardApplyPendingTournamentSummary = {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  pendingMatchesDetected: number;
  appliedMatches: number;
  guessesProcessed: number;
  ledgerEntriesInserted: number;
  membersAffected: number;
  batchesProcessed: number;
  totalPointsApplied: number;
  remainingPendingMatches: number;
  appliedMatchIdsPreview?: string[];
  failedMatchIdsPreview?: string[];
  affectedMemberIdsPreview?: string[];
  reportUploadStatus?: 'uploaded' | 'failed';
  reportAvailable?: boolean;
  reportUploadError?: string;
};

export type ScoreboardApplyPendingTournamentOutcome = 'applied' | 'unexpected_failure';

export type ScoreboardApplyPendingTournamentDetail = {
  matchId: string;
  externalId?: string;
  roundSlug?: string;
  guessesProcessed: number;
  ledgerEntriesInserted: number;
  membersAffected: number;
  batchesProcessed: number;
  pointsApplied: number;
  reason: ScoreboardApplyPendingTournamentOutcome;
  errorMessage?: string;
  causeMessage?: string;
};

export type ScoreboardApplyPendingTournamentDetails = {
  applied: ScoreboardApplyPendingTournamentDetail[];
  unexpectedFailures: ScoreboardApplyPendingTournamentDetail[];
};

export type ScoreboardApplyPendingTournamentReportData = {
  appliedMatchIds: string[];
  failedMatchIds: string[];
  affectedMemberIds: string[];
};

export type TournamentScoreboardApplyPendingResult = {
  tournamentId: string;
  status: ScoreboardWorkflowStatus;
  summary: ScoreboardApplyPendingTournamentSummary;
  details: ScoreboardApplyPendingTournamentDetails;
  data: ScoreboardApplyPendingTournamentReportData;
};

export type ScoreboardApplyPendingTournamentReport = {
  requestId: string;
  operationType: typeof SCOREBOARD_OPERATION_TYPES.APPLY_PENDING_TOURNAMENT;
  status: ScoreboardWorkflowStatus;
  tournament: {
    tournamentId: string;
    tournamentLabel: string;
  };
  startedAt: string;
  completedAt: string;
  summary: ScoreboardApplyPendingTournamentSummary;
  details: ScoreboardApplyPendingTournamentDetails;
  data: ScoreboardApplyPendingTournamentReportData;
};

export type ScoreboardReportUploadResult = {
  reportUploadStatus: 'uploaded' | 'failed';
  reportAvailable: boolean;
  reportFileKey?: string;
  reportFileUrl?: string;
  reportUploadError?: string;
};
