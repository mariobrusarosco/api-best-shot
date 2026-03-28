import Logger from '@/core/logger';
import { QUERIES_MATCH } from '@/domains/match/queries';

export const scoreboardApplyPendingTournamentsHandler = async (): Promise<void> => {
  const query = await QUERIES_MATCH.listTournamentsWithPendingScoreboardMatches();
  const eligibleTournaments = query.map(tournament => ({
    id: tournament.tournamentId,
    label: tournament.tournamentLabel,
  }));

  Logger.audit(`[CRON_TARGET:scoreboard.apply_pending_tournaments] eligible=${eligibleTournaments.length}`, {
    eligibleTournaments,
  });
};
