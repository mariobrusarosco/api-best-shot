import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import { QUERIES_MATCH } from '@/domains/match/queries';
import { QUERIES_SCOREBOARD } from '@/domains/scoreboard/queries';
import { SCOREBOARD_OPERATION_TYPES } from '@/domains/scoreboard/contracts';
import { processEndedMatchForScoreboard } from '@/domains/scoreboard/operations/apply-pending-tournaments/process-ended-match-for-scoreboard';
import { runTournamentScoreboardExecution } from '@/domains/scoreboard/operations/apply-pending-tournaments/tournament-execution';

export const scoreboardApplyPendingTournamentsHandler = async (): Promise<void> => {
  const query = await QUERIES_MATCH.listTournamentsWithMatchesAwaitingScoreboardCalculation();
  const eligibleTournaments = query.map(tournament => ({
    id: tournament.tournamentId,
    label: tournament.tournamentLabel,
  }));
  const lockedTournamentIds = await QUERIES_SCOREBOARD.listTournamentIdsWithInProgressExecutions({
    operationType: SCOREBOARD_OPERATION_TYPES.APPLY_PENDING_TOURNAMENT,
    tournamentIds: eligibleTournaments.map(tournament => tournament.id),
  });
  const lockedTournamentIdSet = new Set(lockedTournamentIds);
  const runnableTournaments = eligibleTournaments.filter(tournament => !lockedTournamentIdSet.has(tournament.id));
  const skippedLockedTournaments = eligibleTournaments.filter(tournament => lockedTournamentIdSet.has(tournament.id));
  const completedExecutions: Array<{
    tournamentId: string;
    tournamentLabel: string | null;
    requestId: string;
    appliedMatchCount: number;
    backlogPassCount: number;
  }> = [];
  const partialFailureExecutions: Array<{
    tournamentId: string;
    tournamentLabel: string | null;
    requestId: string;
    appliedMatchCount: number;
    backlogPassCount: number;
  }> = [];
  const lockedDuringExecution: Array<{
    tournamentId: string;
    tournamentLabel: string | null;
  }> = [];
  const failedExecutions: Array<{
    tournamentId: string;
    tournamentLabel: string | null;
    errorMessage: string;
  }> = [];

  for (const tournament of runnableTournaments) {
    try {
      const executionResult = await runTournamentScoreboardExecution({
        tournamentId: tournament.id,
        tournamentLabel: tournament.label ?? undefined,
        processEndedMatchForScoreboard,
      });

      if (executionResult.outcome === 'already_locked') {
        lockedDuringExecution.push({
          tournamentId: tournament.id,
          tournamentLabel: tournament.label,
        });
        continue;
      }

      const summary = {
        tournamentId: tournament.id,
        tournamentLabel: tournament.label,
        requestId: executionResult.requestId,
        appliedMatchCount: executionResult.appliedMatchCount,
        backlogPassCount: executionResult.backlogPassCount,
      };

      if (executionResult.outcome === 'completed') {
        completedExecutions.push(summary);
      } else {
        partialFailureExecutions.push(summary);
      }
    } catch (error: unknown) {
      const executionError = error instanceof Error ? error : new Error(String(error));

      failedExecutions.push({
        tournamentId: tournament.id,
        tournamentLabel: tournament.label,
        errorMessage: executionError.message,
      });

      Logger.error(executionError, {
        domain: DOMAINS.TOURNAMENT,
        component: 'scoreboard',
        operation: 'scoreboardApplyPendingTournamentsHandler.executeTournament',
        tournamentId: tournament.id,
        tournamentLabel: tournament.label ?? undefined,
      });
    }
  }

  Logger.audit(
    `[CRON_TARGET:scoreboard.apply_pending_tournaments] eligible=${eligibleTournaments.length} runnable=${runnableTournaments.length} locked=${skippedLockedTournaments.length} completed=${completedExecutions.length} partialFailure=${partialFailureExecutions.length} failed=${failedExecutions.length}`,
    {
      eligibleTournaments,
      runnableTournaments,
      skippedLockedTournaments,
      lockedTournamentIds,
      lockedDuringExecution,
      completedExecutions,
      partialFailureExecutions,
      failedExecutions,
    }
  );

  if (partialFailureExecutions.length > 0 || failedExecutions.length > 0) {
    throw new Error(
      `Scoreboard apply pending tournaments completed=${completedExecutions.length} partialFailure=${partialFailureExecutions.length} failed=${failedExecutions.length}`
    );
  }
};
