import {
  SCOREBOARD_EXECUTION_STATUSES,
  SCOREBOARD_OPERATION_TYPES,
  type ScoreboardApplyPendingTournamentSummary,
  type ScoreboardExecutionStatus,
} from '@/domains/scoreboard/contracts';
import { QUERIES_SCOREBOARD } from '@/domains/scoreboard/queries';
import type { DB_SelectScoreboardExecution } from '@/domains/scoreboard/schema';
import type { DatabaseError } from '@/domains/shared/error-handling/database';

export const SCOREBOARD_APPLY_PENDING_TOURNAMENT_EXECUTION_OPERATION_TYPE =
  SCOREBOARD_OPERATION_TYPES.APPLY_PENDING_TOURNAMENT;

export type ScoreboardApplyPendingTournamentExecutionJobStatus = ScoreboardExecutionStatus;
export type ScoreboardApplyPendingTournamentExecutionJobFinalStatus = Exclude<
  ScoreboardApplyPendingTournamentExecutionJobStatus,
  typeof SCOREBOARD_EXECUTION_STATUSES.IN_PROGRESS
>;

export type ScoreboardApplyPendingTournamentExecutionJob = {
  id: string;
  requestId: string;
  tournamentId: string;
  operationType: typeof SCOREBOARD_APPLY_PENDING_TOURNAMENT_EXECUTION_OPERATION_TYPE;
  status: ScoreboardApplyPendingTournamentExecutionJobStatus;
  startedAt: Date;
  completedAt: Date | null;
  duration: number | null;
  reportFileUrl: string | null;
  reportFileKey: string | null;
  summary: ScoreboardApplyPendingTournamentSummary | null;
};

export type ScoreboardApplyPendingTournamentLockResult =
  | {
      outcome: 'acquired';
      executionJob: ScoreboardApplyPendingTournamentExecutionJob;
    }
  | {
      outcome: 'already_locked';
      executionJob: null;
    };

export const createScoreboardApplyPendingTournamentExecutionJob = async (input: {
  requestId: string;
  tournamentId: string;
  startedAt?: Date;
}): Promise<ScoreboardApplyPendingTournamentExecutionJob> => {
  const executionJob = await QUERIES_SCOREBOARD.createExecution({
    requestId: input.requestId,
    tournamentId: input.tournamentId,
    operationType: SCOREBOARD_APPLY_PENDING_TOURNAMENT_EXECUTION_OPERATION_TYPE,
    status: SCOREBOARD_EXECUTION_STATUSES.IN_PROGRESS,
    startedAt: input.startedAt ?? new Date(),
  });

  return mapExecutionJob(executionJob);
};

export const tryAcquireScoreboardApplyPendingTournamentExecutionLock = async (input: {
  requestId: string;
  tournamentId: string;
  startedAt?: Date;
}): Promise<ScoreboardApplyPendingTournamentLockResult> => {
  try {
    const executionJob = await createScoreboardApplyPendingTournamentExecutionJob(input);

    return {
      outcome: 'acquired',
      executionJob,
    };
  } catch (error: unknown) {
    const databaseError = error as DatabaseError;

    if (databaseError.code === '23505') {
      return {
        outcome: 'already_locked',
        executionJob: null,
      };
    }

    throw error;
  }
};

export const finalizeScoreboardApplyPendingTournamentExecutionJob = async (input: {
  requestId: string;
  status: ScoreboardApplyPendingTournamentExecutionJobFinalStatus;
  completedAt?: Date;
  duration?: number;
  reportFileUrl?: string;
  reportFileKey?: string;
  summary?: ScoreboardApplyPendingTournamentSummary;
}): Promise<ScoreboardApplyPendingTournamentExecutionJob | null> => {
  const completedAt = input.completedAt ?? new Date();
  const executionJob = await QUERIES_SCOREBOARD.updateExecutionByRequestId(input.requestId, {
    status: input.status,
    completedAt,
    duration: input.duration,
    reportFileUrl: input.reportFileUrl,
    reportFileKey: input.reportFileKey,
    summary: input.summary,
  });

  return executionJob ? mapExecutionJob(executionJob) : null;
};

// TODO START: Evaluate if we really need these functions.
// They're doing pretty much the same work
export const completeScoreboardApplyPendingTournamentExecutionJob = async (input: {
  requestId: string;
  completedAt?: Date;
  duration?: number;
}): Promise<ScoreboardApplyPendingTournamentExecutionJob | null> => {
  return finalizeScoreboardApplyPendingTournamentExecutionJob({
    ...input,
    status: SCOREBOARD_EXECUTION_STATUSES.COMPLETED,
  });
};

export const failScoreboardApplyPendingTournamentExecutionJob = async (input: {
  requestId: string;
  completedAt?: Date;
  duration?: number;
}): Promise<ScoreboardApplyPendingTournamentExecutionJob | null> => {
  return finalizeScoreboardApplyPendingTournamentExecutionJob({
    ...input,
    status: SCOREBOARD_EXECUTION_STATUSES.FAILED,
  });
};
// TODO END

const mapExecutionJob = (executionJob: DB_SelectScoreboardExecution): ScoreboardApplyPendingTournamentExecutionJob => {
  return {
    id: executionJob.id,
    requestId: executionJob.requestId,
    tournamentId: executionJob.tournamentId,
    operationType: SCOREBOARD_APPLY_PENDING_TOURNAMENT_EXECUTION_OPERATION_TYPE,
    status: executionJob.status as ScoreboardApplyPendingTournamentExecutionJobStatus,
    startedAt: executionJob.startedAt,
    completedAt: executionJob.completedAt,
    duration: executionJob.duration,
    reportFileUrl: executionJob.reportFileUrl,
    reportFileKey: executionJob.reportFileKey,
    summary: (executionJob.summary as ScoreboardApplyPendingTournamentSummary | null) ?? null,
  };
};
