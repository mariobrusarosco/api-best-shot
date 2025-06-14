import { T_TournamentRound } from '@/domains/tournament/schema';
import db from '@/services/database';
import { and, asc, eq } from 'drizzle-orm';

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
        eq(T_TournamentRound.type, 'season')
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
        eq(T_TournamentRound.type, 'knockout')
      )
    )
    .orderBy(asc(T_TournamentRound.order));

  return query;
};

const getAllRounds = async (tournamentId: string) => {
  const query = await db
    .select()
    .from(T_TournamentRound)
    .where(eq(T_TournamentRound.tournamentId, tournamentId))
    .orderBy(asc(T_TournamentRound.order));

  return query;
};

export const TournamentRoundsQueries = {
  getRound,
  getRegularSeasonRounds,
  getKnockoutRounds,
  getAllRounds,
};

export const QUERIES_TOURNAMENT_ROUND = {
  getAllRounds,
};
