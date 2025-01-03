import { T_Guess } from '@/domains/guess/schema';
import { T_Match } from '@/domains/match/schema';
import db from '@/services/database';
import Profiling from '@/services/profiling';
import { and, eq } from 'drizzle-orm';

const checkOnboardingStatus = async ({
  memberId,
  tournamentId,
}: {
  memberId: string;
  tournamentId: string;
}) => {
  try {
    const guesses = await db
      .select()
      .from(T_Guess)
      .innerJoin(T_Match, eq(T_Match.id, T_Guess.matchId))
      .where(and(eq(T_Match.tournamentId, tournamentId), eq(T_Guess.memberId, memberId)))
      .offset(1);

    return guesses.length === 0 ? false : true;
  } catch (error: any) {
    Profiling.error('checkOnboardingStatus', error);
    return false;
  }
};
export const GuessQueries = {
  checkOnboardingStatus,
};
