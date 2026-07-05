import type {
  MatchesRoundContext,
  MatchesTournamentContext,
  TournamentMatchesCreateWorkflowResult,
} from '@/domains/data-provider-v2/contracts/matches';
import { listTournamentRounds } from '@/domains/data-provider-v2/persistence/tournament-round/list-tournament-rounds';
import { SofaScoreRoundProvider } from '@/domains/data-provider-v2/providers/sofascore/round-provider';
import { runTournamentMatchesCreateForRounds } from './run-tournament-matches-create-for-rounds';

export const runTournamentMatchesCreate = async (input: {
  tournament: MatchesTournamentContext;
  roundProvider: SofaScoreRoundProvider;
}): Promise<TournamentMatchesCreateWorkflowResult> => {
  const rounds = await loadTournamentRounds(input.tournament.tournamentId);

  return runTournamentMatchesCreateForRounds({
    tournament: input.tournament,
    rounds,
    roundProvider: input.roundProvider,
  });
};

const loadTournamentRounds = async (tournamentId: string): Promise<MatchesRoundContext[]> => {
  const rounds = await listTournamentRounds({
    tournamentId,
  });

  return rounds.map(round => ({
    id: round.id,
    label: round.label,
    slug: round.slug,
    providerUrl: round.providerUrl,
  }));
};
