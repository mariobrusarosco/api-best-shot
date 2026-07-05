import { QUERIES_MATCH } from '@/domains/match/queries';
import {
  tryAcquireTournamentScoreboardExecutionLock,
  type TournamentScoreboardExecutionJob,
} from './execution-job-store';
import type {
  FailedMatchScoreboardProcessing,
  MatchAwaitingScoreboardCalculation,
  ProcessEndedMatchForScoreboardResult,
} from './types';

export type TournamentScoreboardBacklogProcessingResult =
  | {
      outcome: 'already_locked';
      requestId: string;
      tournamentId: string;
      executionJob: null;
      backlogPassCount: number;
      appliedMatchResults: ProcessEndedMatchForScoreboardResult[];
      failedMatch: null;
    }
  | {
      outcome: 'completed';
      requestId: string;
      tournamentId: string;
      executionJob: TournamentScoreboardExecutionJob;
      backlogPassCount: number;
      appliedMatchResults: ProcessEndedMatchForScoreboardResult[];
      failedMatch: null;
    }
  | {
      outcome: 'partial_failure';
      requestId: string;
      tournamentId: string;
      executionJob: TournamentScoreboardExecutionJob;
      backlogPassCount: number;
      appliedMatchResults: ProcessEndedMatchForScoreboardResult[];
      failedMatch: FailedMatchScoreboardProcessing;
    };

export type RunTournamentScoreboardBacklogProcessingInput = {
  tournamentId: string;
  requestId: string;
  startedAt: Date;
  batchSize?: number;
  processEndedMatchForScoreboard: (
    match: MatchAwaitingScoreboardCalculation
  ) => Promise<ProcessEndedMatchForScoreboardResult>;
};

export const runTournamentScoreboardBacklogProcessing = async (
  input: RunTournamentScoreboardBacklogProcessingInput
): Promise<TournamentScoreboardBacklogProcessingResult> => {
  const lockAcquisitionResult = await tryAcquireTournamentScoreboardExecutionLock({
    requestId: input.requestId,
    tournamentId: input.tournamentId,
    startedAt: input.startedAt,
  });

  if (lockAcquisitionResult.outcome === 'already_locked') {
    return {
      outcome: 'already_locked',
      requestId: input.requestId,
      tournamentId: input.tournamentId,
      executionJob: null,
      backlogPassCount: 0,
      appliedMatchResults: [],
      failedMatch: null,
    };
  }

  const appliedMatchResults: ProcessEndedMatchForScoreboardResult[] = [];
  let backlogPassCount = 0;
  const listMatchesAwaitingScoreboardCalculationForTournament = () =>
    QUERIES_MATCH.listMatchesAwaitingScoreboardCalculationForTournament({
      tournamentId: input.tournamentId,
      limit: input.batchSize,
    });
  let matchesAwaitingScoreboardCalculation = await listMatchesAwaitingScoreboardCalculationForTournament();

  while (matchesAwaitingScoreboardCalculation.length > 0) {
    backlogPassCount += 1;

    for (const matchAwaitingScoreboardCalculation of matchesAwaitingScoreboardCalculation) {
      try {
        const processedMatchResult = await input.processEndedMatchForScoreboard(matchAwaitingScoreboardCalculation);
        appliedMatchResults.push(processedMatchResult);
      } catch (error: unknown) {
        return {
          outcome: 'partial_failure',
          requestId: input.requestId,
          tournamentId: input.tournamentId,
          executionJob: lockAcquisitionResult.executionJob,
          backlogPassCount,
          appliedMatchResults,
          failedMatch: {
            matchId: matchAwaitingScoreboardCalculation.id,
            externalId: matchAwaitingScoreboardCalculation.externalId ?? undefined,
            roundSlug: matchAwaitingScoreboardCalculation.roundSlug ?? undefined,
            errorMessage: error instanceof Error ? error.message : String(error),
          },
        };
      }
    }

    matchesAwaitingScoreboardCalculation = await listMatchesAwaitingScoreboardCalculationForTournament();
  }

  return {
    outcome: 'completed',
    requestId: input.requestId,
    tournamentId: input.tournamentId,
    executionJob: lockAcquisitionResult.executionJob,
    backlogPassCount,
    appliedMatchResults,
    failedMatch: null,
  };
};
