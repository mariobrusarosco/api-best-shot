import { T_TournamentRound } from '@/domains/tournament/schema';
import db from '@/services/database';
import { and, eq, or } from 'drizzle-orm';

const getRound = async ({
  tournamentId,
  roundId,
  roundSlug,
}: {
  tournamentId: string;
  roundId?: string;
  roundSlug?: string;
}) => {
  const [query] = await db
    .select()
    .from(T_TournamentRound)
    .where(
      and(
        eq(T_TournamentRound.tournamentId, tournamentId),
        or(eq(T_TournamentRound.id, roundId!), eq(T_TournamentRound.slug, roundSlug!))
      )
    );

  return query;
};

export const TournamentRoundsQueries = {
  getRound,
};
