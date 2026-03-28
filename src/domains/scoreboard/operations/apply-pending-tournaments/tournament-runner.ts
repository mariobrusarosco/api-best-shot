import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import { QUERIES_MATCH } from '@/domains/match/queries';
import { randomUUID } from 'crypto';
import {
  completeScoreboardApplyPendingTournamentExecutionJob,
  failScoreboardApplyPendingTournamentExecutionJob,
  tryAcquireScoreboardApplyPendingTournamentExecutionLock,
  type ScoreboardApplyPendingTournamentExecutionJob as TournamentScoreboardExecutionJob,
} from './execution-job-store';
import type { PendingScoreboardMatch, ProcessPendingScoreboardMatchResult } from './types';

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
  processPendingMatch: (match: PendingScoreboardMatch) => Promise<ProcessPendingScoreboardMatchResult>;
};

export const runTournamentScoreboardBacklogExecution = async (
  input: RunTournamentScoreboardBacklogExecutionInput
): Promise<TournamentScoreboardBacklogExecutionResult> => {
  const requestId = input.requestId ?? randomUUID();
  const startedAt = input.startedAt ?? new Date();
  const lockAcquisitionResult = await tryAcquireScoreboardApplyPendingTournamentExecutionLock({
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
  const listPendingScoreboardMatchesForTournament = () =>
    QUERIES_MATCH.listPendingScoreboardMatchesForTournament({
      tournamentId: input.tournamentId,
      limit: input.batchSize,
    });

  try {
    let pendingScoreboardMatches = await listPendingScoreboardMatchesForTournament();

    while (pendingScoreboardMatches.length > 0) {
      backlogPassCount += 1;

      for (const pendingScoreboardMatch of pendingScoreboardMatches) {
        await input.processPendingMatch(pendingScoreboardMatch);
        appliedMatchCount += 1;
      }

      pendingScoreboardMatches = await listPendingScoreboardMatchesForTournament();
    }

    const completedAt = new Date();

    await completeScoreboardApplyPendingTournamentExecutionJob({
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
      await failScoreboardApplyPendingTournamentExecutionJob({
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
