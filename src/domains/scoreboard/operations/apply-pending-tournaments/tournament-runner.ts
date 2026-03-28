import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import { QUERIES_MATCH } from '@/domains/match/queries';
import { randomUUID } from 'crypto';
import {
  completeTournamentScoreboardExecutionJob,
  failTournamentScoreboardExecutionJob,
  tryAcquireTournamentScoreboardExecutionLock,
  type TournamentScoreboardExecutionJob,
} from './execution-job-store';
import type { MatchAwaitingScoreboardCalculation, ProcessMatchAwaitingScoreboardCalculationResult } from './types';

export type TournamentScoreboardBacklogExecutionResult =
  | {
      outcome: 'already_locked';
      requestId: string;
      tournamentId: string;
      executionJob: null;
      backlogPassCount: number;
      appliedMatchCount: number;
    }
  | {
      outcome: 'completed';
      requestId: string;
      tournamentId: string;
      executionJob: TournamentScoreboardExecutionJob;
      backlogPassCount: number;
      appliedMatchCount: number;
    };

export type RunTournamentScoreboardBacklogExecutionInput = {
  tournamentId: string;
  requestId?: string;
  startedAt?: Date;
  batchSize?: number;
  processMatchAwaitingScoreboardCalculation: (
    match: MatchAwaitingScoreboardCalculation
  ) => Promise<ProcessMatchAwaitingScoreboardCalculationResult>;
};

export const runTournamentScoreboardBacklogExecution = async (
  input: RunTournamentScoreboardBacklogExecutionInput
): Promise<TournamentScoreboardBacklogExecutionResult> => {
  const requestId = input.requestId ?? randomUUID();
  const startedAt = input.startedAt ?? new Date();
  const lockAcquisitionResult = await tryAcquireTournamentScoreboardExecutionLock({
    requestId,
    tournamentId: input.tournamentId,
    startedAt,
  });

  if (lockAcquisitionResult.outcome === 'already_locked') {
    return {
      outcome: 'already_locked',
      requestId,
      tournamentId: input.tournamentId,
      executionJob: null,
      backlogPassCount: 0,
      appliedMatchCount: 0,
    };
  }

  const tournamentExecutionJob = lockAcquisitionResult.executionJob;
  let backlogPassCount = 0;
  let appliedMatchCount = 0;
  const listMatchesAwaitingScoreboardCalculationForTournament = () =>
    QUERIES_MATCH.listMatchesAwaitingScoreboardCalculationForTournament({
      tournamentId: input.tournamentId,
      limit: input.batchSize,
    });

  try {
    let matchesAwaitingScoreboardCalculation = await listMatchesAwaitingScoreboardCalculationForTournament();

    while (matchesAwaitingScoreboardCalculation.length > 0) {
      backlogPassCount += 1;

      for (const matchAwaitingScoreboardCalculation of matchesAwaitingScoreboardCalculation) {
        await input.processMatchAwaitingScoreboardCalculation(matchAwaitingScoreboardCalculation);
        appliedMatchCount += 1;
      }

      matchesAwaitingScoreboardCalculation = await listMatchesAwaitingScoreboardCalculationForTournament();
    }

    const completedAt = new Date();

    await completeTournamentScoreboardExecutionJob({
      requestId,
      completedAt,
      duration: completedAt.getTime() - startedAt.getTime(),
    });

    return {
      outcome: 'completed',
      requestId,
      tournamentId: input.tournamentId,
      executionJob: tournamentExecutionJob,
      backlogPassCount,
      appliedMatchCount,
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
        operation: 'runTournamentScoreboardBacklogExecution.finalizeFailure',
        requestId,
        tournamentId: input.tournamentId,
      });
    }

    throw error;
  }
};
