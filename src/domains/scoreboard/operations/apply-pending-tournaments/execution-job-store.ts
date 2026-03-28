import {
  SCOREBOARD_EXECUTION_STATUSES,
  SCOREBOARD_OPERATION_TYPES,
  type ScoreboardApplyPendingTournamentSummary,
  type ScoreboardExecutionStatus,
} from '@/domains/scoreboard/contracts';
import { QUERIES_SCOREBOARD } from '@/domains/scoreboard/queries';
import type { DB_SelectScoreboardExecution } from '@/domains/scoreboard/schema';

export const SCOREBOARD_APPLY_PENDING_TOURNAMENT_EXECUTION_OPERATION_TYPE =
  SCOREBOARD_OPERATION_TYPES.APPLY_PENDING_TOURNAMENT;

export type ScoreboardApplyPendingTournamentExecutionJobStatus = ScoreboardExecutionStatus;

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
