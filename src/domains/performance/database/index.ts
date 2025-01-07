import { runGuessAnalysis } from '@/domains/guess/controllers/guess-analysis';
import { T_Guess } from '@/domains/guess/schema';
import { GuessUtils } from '@/domains/guess/utils';
import { T_Match } from '@/domains/match/schema';
import db from '@/services/database';
import { and, eq } from 'drizzle-orm';
import _ from 'lodash';

const queryPerformanceOfAllMemberTournaments = async (memberId: string) => {
  try {
    // const groupedGuesses = await db
    //   .select({
    //     tournamentId: T_Tournament.id,
    //     tournamentName: T_Tournament.label,
    //     tournamentLogo: T_Tournament.logo,
    //     guessesAndMatches: sql`json_agg(json_build_object(
    //       'guess', json_build_object(
    //         'id', ${T_Guess.id},
    //         'homeScore', ${T_Guess.homeScore},
    //         'awayScore', ${T_Guess.awayScore}
    //       ),
    //       'match', json_build_object(
    //         'id', ${T_Match.id},
    //         'homeScore', ${T_Match.homeScore},
    //         'awayScore', ${T_Match.awayScore},
    //         'date', ${T_Match.date}
    //       )
    //     ))`,
    //   })
    //   .from(T_Guess)
    //   .innerJoin(T_Match, eq(T_Match.id, T_Guess.matchId))
    //   .innerJoin(T_Tournament, eq(T_Tournament.id, T_Match.tournamentId))
    //   .where(eq(T_Guess.memberId, memberId))
    //   .groupBy(T_Tournament.id, T_Tournament.label, T_Tournament.logo);

    // const query = await db
    //   .select()
    //   .from(T_Guess)
    //   .innerJoin(T_Match, eq(T_Match.id, T_Guess.matchId))
    //   .innerJoin(T_Tournament, eq(T_Tournament.id, T_Match.tournamentId))
    //   .where(eq(T_Guess.memberId, memberId));

    // if (query.length === 0) return { tournaments: [] };

    // const parsed = query.map(row => {
    //   return {
    //     tournamentId: row.tournament.id,
    //     tournamentLogo: row.tournament.logo,
    //     tournamentLabel: row.tournament.label,
    //     // @ts-ignore
    //     result: runGuessAnalysis(row.guess, row.match)?.total,
    //     // @ts-ignore
    //     // .reduce((acc, prev) => {
    //     //   console.log({ acc, prev });
    //     //   return (acc += prev);
    //     // }, 0),
    //     // ...(guesses as Array<{ guess: any; match: any }>).map(row => {
    //     //   return runGuessAnalysis(row.guess, row.match);
    //     // }),
    //   };
    // });

    // const byTournament = _.groupBy(parsed, 'tournamentId');
    // const tournaments = Object.entries(byTournament).map(([id, guesses]) => {
    //   return {
    //     tournamentId: guesses[0].tournamentId,
    //     badge: guesses[0].tournamentLogo,
    //     label: guesses[0].tournamentLabel,
    //     // @ts-ignore
    //     points: guesses.reduce((acc, prev) => acc + prev.result, 0),
    //   };
    // });
    // return { tournaments };

    return { tournaments: [] };
  } catch (error: any) {
    console.error('[DB_Performance] - [queryPerformanceOfAllMemberTournaments] ', error);
  }
};

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

      updateCount(guess.home.status);
      updateCount(guess.away.status);

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

export const DB_Performance = {
  queryPerformanceForTournament,
  queryPerformanceOfAllMemberTournaments,
};
