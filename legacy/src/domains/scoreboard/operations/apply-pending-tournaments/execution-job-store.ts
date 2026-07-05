import {
  SCOREBOARD_EXECUTION_STATUSES,
  SCOREBOARD_OPERATION_TYPES,
  type ScoreboardExecutionStatus,
  type TournamentScoreboardExecutionSummary,
} from '@/domains/scoreboard/contracts';
import { QUERIES_SCOREBOARD } from '@/domains/scoreboard/queries';
import type { DB_SelectScoreboardExecution } from '@/domains/scoreboard/schema';
import type { DatabaseError } from '@/domains/shared/error-handling/database';

export const SCOREBOARD_APPLY_PENDING_TOURNAMENT_EXECUTION_OPERATION_TYPE =
  SCOREBOARD_OPERATION_TYPES.APPLY_PENDING_TOURNAMENT;

export type TournamentScoreboardExecutionJobStatus = ScoreboardExecutionStatus;
export type TournamentScoreboardExecutionJobFinalStatus = Exclude<
  TournamentScoreboardExecutionJobStatus,
  typeof SCOREBOARD_EXECUTION_STATUSES.IN_PROGRESS
>;

export type TournamentScoreboardExecutionJob = {
  id: string;
  requestId: string;
  tournamentId: string;
  operationType: typeof SCOREBOARD_APPLY_PENDING_TOURNAMENT_EXECUTION_OPERATION_TYPE;
  status: TournamentScoreboardExecutionJobStatus;
  startedAt: Date;
  completedAt: Date | null;
  duration: number | null;
  reportFileUrl: string | null;
  reportFileKey: string | null;
  summary: TournamentScoreboardExecutionSummary | null;
};

export type TournamentScoreboardExecutionPersistenceFields = {
  summary?: TournamentScoreboardExecutionSummary;
  reportFileKey?: string;
  reportFileUrl?: string;
};

type FinalizeTournamentScoreboardExecutionJobInput = {
  requestId: string;
  status: TournamentScoreboardExecutionJobFinalStatus;
  completedAt?: Date;
  duration?: number;
} & TournamentScoreboardExecutionPersistenceFields;

type FinalizedTournamentScoreboardExecutionJobInput = {
  requestId: string;
  completedAt?: Date;
  duration?: number;
} & TournamentScoreboardExecutionPersistenceFields;

export type TournamentScoreboardExecutionLockAcquisitionResult =
  | {
      outcome: 'acquired';
      executionJob: TournamentScoreboardExecutionJob;
    }
  | {
      outcome: 'already_locked';
      executionJob: null;
    };

export const createTournamentScoreboardExecutionJob = async (input: {
  requestId: string;
  tournamentId: string;
  startedAt?: Date;
}): Promise<TournamentScoreboardExecutionJob> => {
  const executionJob = await QUERIES_SCOREBOARD.createExecution({
    requestId: input.requestId,
    tournamentId: input.tournamentId,
    operationType: SCOREBOARD_APPLY_PENDING_TOURNAMENT_EXECUTION_OPERATION_TYPE,
    status: SCOREBOARD_EXECUTION_STATUSES.IN_PROGRESS,
    startedAt: input.startedAt ?? new Date(),
  });

  return mapExecutionJob(executionJob);
};

export const tryAcquireTournamentScoreboardExecutionLock = async (input: {
  requestId: string;
  tournamentId: string;
  startedAt?: Date;
}): Promise<TournamentScoreboardExecutionLockAcquisitionResult> => {
  try {
    const executionJob = await createTournamentScoreboardExecutionJob(input);

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

export const finalizeTournamentScoreboardExecutionJob = async (
  input: FinalizeTournamentScoreboardExecutionJobInput
): Promise<TournamentScoreboardExecutionJob | null> => {
  const completedAt = input.completedAt ?? new Date();
  const executionJob = await QUERIES_SCOREBOARD.updateExecutionByRequestId(input.requestId, {
    status: input.status,
    completedAt,
    duration: input.duration,
    ...buildTournamentScoreboardExecutionPersistenceUpdate(input),
  });

  return executionJob ? mapExecutionJob(executionJob) : null;
};

// TODO START: Evaluate if we really need these functions.
// They're doing pretty much the same work
export const completeTournamentScoreboardExecutionJob = async (
  input: FinalizedTournamentScoreboardExecutionJobInput
): Promise<TournamentScoreboardExecutionJob | null> => {
  return finalizeTournamentScoreboardExecutionJob({
    ...input,
    status: SCOREBOARD_EXECUTION_STATUSES.COMPLETED,
  });
};

export const failTournamentScoreboardExecutionJob = async (
  input: FinalizedTournamentScoreboardExecutionJobInput
): Promise<TournamentScoreboardExecutionJob | null> => {
  return finalizeTournamentScoreboardExecutionJob({
    ...input,
    status: SCOREBOARD_EXECUTION_STATUSES.FAILED,
  });
};

export const partiallyFailTournamentScoreboardExecutionJob = async (
  input: FinalizedTournamentScoreboardExecutionJobInput
): Promise<TournamentScoreboardExecutionJob | null> => {
  return finalizeTournamentScoreboardExecutionJob({
    ...input,
    status: SCOREBOARD_EXECUTION_STATUSES.PARTIAL_FAILURE,
  });
};
// TODO END

const buildTournamentScoreboardExecutionPersistenceUpdate = (input: TournamentScoreboardExecutionPersistenceFields) => {
  return {
    reportFileUrl: input.reportFileUrl,
    reportFileKey: input.reportFileKey,
    summary: input.summary,
  };
};

const mapExecutionJob = (executionJob: DB_SelectScoreboardExecution): TournamentScoreboardExecutionJob => {
  return {
    id: executionJob.id,
    requestId: executionJob.requestId,
    tournamentId: executionJob.tournamentId,
    operationType: SCOREBOARD_APPLY_PENDING_TOURNAMENT_EXECUTION_OPERATION_TYPE,
    status: executionJob.status as TournamentScoreboardExecutionJobStatus,
    startedAt: executionJob.startedAt,
    completedAt: executionJob.completedAt,
    duration: executionJob.duration,
    reportFileUrl: executionJob.reportFileUrl,
    reportFileKey: executionJob.reportFileKey,
    summary: (executionJob.summary as TournamentScoreboardExecutionSummary | null) ?? null,
  };
};
