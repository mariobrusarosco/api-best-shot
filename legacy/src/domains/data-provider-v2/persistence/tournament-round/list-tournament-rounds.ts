import { QUERIES_TOURNAMENT_ROUND } from '@/domains/tournament-round/queries';
import type { RoundsResolvedRound } from '@/domains/data-provider-v2/contracts/rounds';

export const listTournamentRounds = async (input: { tournamentId: string }): Promise<RoundsResolvedRound[]> => {
  const rounds = await QUERIES_TOURNAMENT_ROUND.getAllRounds(input.tournamentId);

  return rounds.map(round => ({
    id: round.id,
    tournamentId: round.tournamentId,
    order: round.order,
    label: round.label,
    slug: round.slug,
    providerUrl: round.providerUrl,
    providerId: round.providerId,
    type: round.type,
  }));
};
