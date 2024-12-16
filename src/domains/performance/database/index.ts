import { runGuessAnalysis } from '@/domains/guess/controllers/guess-analysis';
import { T_Guess } from '@/domains/guess/schema';
import { GuessUtils } from '@/domains/guess/utils';
import { T_Match } from '@/domains/match/schema';
import db from '@/services/database';
import { and, eq } from 'drizzle-orm';

const queryTournamentPerformance = async (memberId: string, tournamentId: string) => {
  const guesses = await db
    .select()
    .from(T_Guess)
    .innerJoin(T_Match, eq(T_Match.id, T_Guess.matchId))
    .where(and(eq(T_Guess.memberId, memberId), eq(T_Match.tournamentId, tournamentId)));

  const parsedGuesses = guesses.map(row => runGuessAnalysis(row.guess, row.match));

  //@ts-ignore
  const guessesByStatus = Object.groupBy(parsedGuesses, ({ status }) => status);
  const guessesByStatusQty = (
    Object.entries(guessesByStatus) as [string, any[]][]
  ).reduce((acc, [key, body]) => ({ ...acc, [key]: body?.length }), {});

  return {
    details: guessesByStatusQty,
    points: GuessUtils.getTotalPoints(parsedGuesses),
  };
};

export const DB_Performance = {
  queryTournamentPerformance,
};
