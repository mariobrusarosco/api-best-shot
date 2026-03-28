import Logger from '@/core/logger';
import { QUERIES_MATCH } from '@/domains/match/queries';
import { QUERIES_SCOREBOARD } from '@/domains/scoreboard/queries';
import { SCOREBOARD_OPERATION_TYPES } from '@/domains/scoreboard/contracts';

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

  Logger.audit(
    `[CRON_TARGET:scoreboard.apply_pending_tournaments] eligible=${eligibleTournaments.length} runnable=${runnableTournaments.length} locked=${skippedLockedTournaments.length}`,
    {
      eligibleTournaments,
      runnableTournaments,
      skippedLockedTournaments,
      lockedTournamentIds,
    }
  );
};
