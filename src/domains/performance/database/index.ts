import { runGuessAnalysis } from '@/domains/guess/controllers/guess-analysis';
import { T_Guess } from '@/domains/guess/schema';
import { GuessUtils } from '@/domains/guess/utils';
import { T_Match } from '@/domains/match/schema';
import db from '@/services/database';
import { and, eq } from 'drizzle-orm';
import _ from 'lodash';
import { queryMemberTournamentGuesses } from '../controller';
import { DB_InsertTournamentPerformance, T_TournamentPerformance } from '../schema';


const queryPerformanceForTournament = async (memberId: string, tournamentId: string) => {
  const guesses = await db
    .select()
    .from(T_Guess)
    .innerJoin(T_Match, eq(T_Match.id, T_Guess.matchId))
    .where(and(eq(T_Guess.memberId, memberId), eq(T_Match.tournamentId, tournamentId)));

  const parsedGuesses = guesses.map(row => runGuessAnalysis(row.guess, row.match));
  const guessesByOutcome = parsedGuesses.reduce(
    (acc, guess) => {
      const updateCount = (status: string) => {
        if (status === 'correct') acc.correct++;
        else if (status === 'incorrect') acc.incorrect++;
      };

      updateCount(guess.fullMatch.status);

      return acc;
    },
    { correct: 0, incorrect: 0 }
  );

  const guessesByStatus = _.groupBy(parsedGuesses, ({ status }) => status);
  const guessesByStatusQty = (
    Object.entries(guessesByStatus) as [string, any[]][]
  ).reduce((acc, [key, body]) => ({ ...acc, [key]: body?.length }), {});

  return {
    details: guessesByStatusQty,
    points: GuessUtils.getTotalPoints(parsedGuesses),
    guessesByOutcome,
  };
};

const updateTournamentPerformanceOnDatabase = async (
  memberId: string,
  tournamentId: string,
  parsedGuesses: Awaited<ReturnType<typeof queryMemberTournamentGuesses>>
) => {
  const insertValues: DB_InsertTournamentPerformance = {
    tournamentId,
    memberId,
    points: String(GuessUtils.getTotalPoints(parsedGuesses)),
  };

  console.log('updateTournamentPerformanceOnDatabase -----------', parsedGuesses);

  return await db
    .update(T_TournamentPerformance)
    .set(insertValues)
    .where(
      and(
        eq(T_TournamentPerformance.tournamentId, tournamentId),
        eq(T_TournamentPerformance.memberId, memberId)
      )
    )
    .returning();
};

export const DB_Performance = {
  queryPerformanceForTournament,
  updateTournamentPerformanceOnDatabase,
};
