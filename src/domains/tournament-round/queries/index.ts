import { T_TournamentRound } from '@/domains/tournament/schema';
import db from '@/services/database';
import { and, eq } from 'drizzle-orm';

const getRoundIdBySlug = async (tournamentId: string, roundSlug: string) => {
  const [query] = await db
    .selectDistinct({
      id: T_TournamentRound.id,
    })
    .from(T_TournamentRound)
    .where(
      and(
        eq(T_TournamentRound.tournamentId, tournamentId),
        eq(T_TournamentRound.slug, roundSlug)
      )
    );

  return query.id ?? '';
};

const getBySlugRoundId = async (roundId: string) => {
  const [query] = await db
    .select({
      slug: T_TournamentRound.slug,
    })
    .from(T_TournamentRound)
    .where(eq(T_TournamentRound.id, roundId));

  return query.slug ?? '';
};

export const TournamentRoundsQueries = {
  getRoundIdBySlug,
  getBySlugRoundId,
};
