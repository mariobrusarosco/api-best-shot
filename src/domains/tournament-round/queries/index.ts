import { T_TournamentRound } from '@/domains/tournament/schema';
import db from '@/services/database';
import { and, eq, like } from 'drizzle-orm';

const getRound = async ({
  tournamentId,
  roundSlug,
}: {
  tournamentId: string;
  roundSlug: string;
}) => {
  const [query] = await db
    .select()
    .from(T_TournamentRound)
    .where(
      and(
        eq(T_TournamentRound.tournamentId, tournamentId),
        eq(T_TournamentRound.slug, roundSlug)
      )
    );

  return query;
};

const getRegularSeasonRounds = async ({ tournamentId }: { tournamentId: string }) => {
  const [query] = await db
    .select()
    .from(T_TournamentRound)
    .where(
      and(
        eq(T_TournamentRound.tournamentId, tournamentId),
        eq(T_TournamentRound.slug, 'season')
      )
    );

  return query;
};

const getKnockoutRounds = async ({ tournamentId }: { tournamentId: string }) => {
  const query = await db
    .select()
    .from(T_TournamentRound)
    .where(
      and(
        eq(T_TournamentRound.tournamentId, tournamentId),
        like(T_TournamentRound.type, 'knockout')
      )
    );

  return query;
};

export const TournamentRoundsQueries = {
  getRound,
  getRegularSeasonRounds,
  getKnockoutRounds,
};
