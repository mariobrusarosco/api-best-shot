import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import { QUERIES_MATCH } from '@/domains/match/queries';
import { randomUUID } from 'crypto';
import {
  completeScoreboardApplyPendingTournamentExecutionJob,
  failScoreboardApplyPendingTournamentExecutionJob,
  tryAcquireScoreboardApplyPendingTournamentExecutionLock,
  type ScoreboardApplyPendingTournamentExecutionJob,
} from './execution-job-store';

export type PendingScoreboardMatch = Awaited<
  ReturnType<typeof QUERIES_MATCH.listPendingScoreboardMatchesForTournament>
>[number];

export type ScoreboardApplyPendingTournamentRunnerResult =
  | {
      outcome: 'already_locked';
      requestId: string;
      tournamentId: string;
      executionJob: null;
      loopCount: number;
      processedMatches: number;
    }
  | {
      outcome: 'completed';
      requestId: string;
      tournamentId: string;
      executionJob: ScoreboardApplyPendingTournamentExecutionJob;
      loopCount: number;
      processedMatches: number;
    };

export const runScoreboardApplyPendingTournamentLoop = async (input: {
  tournamentId: string;
  requestId?: string;
  startedAt?: Date;
  batchSize?: number;
  processPendingMatch: (match: PendingScoreboardMatch) => Promise<void>;
}): Promise<ScoreboardApplyPendingTournamentRunnerResult> => {
  const requestId = input.requestId ?? randomUUID();
  const startedAt = input.startedAt ?? new Date();
  const lockResult = await tryAcquireScoreboardApplyPendingTournamentExecutionLock({
    requestId,
    tournamentId: input.tournamentId,
    startedAt,
  });

  if (lockResult.outcome === 'already_locked') {
    return {
      outcome: 'already_locked',
      requestId,
      tournamentId: input.tournamentId,
      executionJob: null,
      loopCount: 0,
      processedMatches: 0,
    };
  }

  const executionJob = lockResult.executionJob;
  let loopCount = 0;
  let processedMatches = 0;
  const listPendingMatches = () =>
    QUERIES_MATCH.listPendingScoreboardMatchesForTournament({
      tournamentId: input.tournamentId,
      limit: input.batchSize,
    });

  try {
    let pendingMatches = await listPendingMatches();

    while (pendingMatches.length > 0) {
      loopCount += 1;

      for (const pendingMatch of pendingMatches) {
        await input.processPendingMatch(pendingMatch);
        processedMatches += 1;
      }

      pendingMatches = await listPendingMatches();
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
      executionJob,
      loopCount,
      processedMatches,
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
        operation: 'runScoreboardApplyPendingTournamentLoop.finalizeFailure',
        requestId,
        tournamentId: input.tournamentId,
      });
    }

    throw error;
  }
};
