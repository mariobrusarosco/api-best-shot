import { Utils } from '@/domains/auth/utils';
import { runGuessAnalysis } from '@/domains/guess/controllers/guess-analysis';
import { ErrorMapper } from '@/domains/guess/error-handling/mapper';
import { T_Guess } from '@/domains/guess/schema';
import { CreateGuessRequest, GuessInput } from '@/domains/guess/typing';
import { T_Match } from '@/domains/match/schema';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import db from '@/services/database';
import Profiling from '@/services/profiling';
import { and, eq } from 'drizzle-orm';
import { Response } from 'express';

const GuessController = {
  createGuess,
  getMemberGuesses,
  runGuessAnalysis,
};

async function getMemberGuesses({
  memberId,
  round,
  tournamentId,
}: {
  memberId: string;
  tournamentId: string;
  round: string;
}) {
  try {
    let guesses: any[] | null = null;

    const guessesResult = await db
      .select()
      .from(T_Guess)
      .innerJoin(T_Match, eq(T_Match.id, T_Guess.matchId))
      .where(
        and(
          eq(T_Match.tournamentId, tournamentId),
          eq(T_Match.roundSlug, round),
          eq(T_Guess.memberId, memberId)
        )
      );

    guesses = guessesResult;

    if (guesses.length === 0) {
      const roundMatches = await db
        .select()
        .from(T_Match)
        .where(and(eq(T_Match.roundSlug, round), eq(T_Match.tournamentId, tournamentId)));

      const promises = roundMatches.map(async (match: (typeof roundMatches)[number]) =>
        db
          .insert(T_Guess)
          .values({
            awayScore: null,
            homeScore: null,
            matchId: match.id,
            memberId,
          })
          .onConflictDoNothing()
          .returning()
      );

      await Promise.all(promises);
      const finalGuessesResult = await db
        .select()
        .from(T_Guess)
        .innerJoin(T_Match, eq(T_Match.id, T_Guess.matchId))
        .where(
          and(
            eq(T_Match.tournamentId, tournamentId),
            eq(T_Match.roundSlug, round),
            eq(T_Guess.memberId, memberId)
          )
        );
      guesses = finalGuessesResult;
    }

    const parsedGuesses =
      guesses?.map((row: any) => runGuessAnalysis(row.guess, row.match)) || [];

    return parsedGuesses;
  } catch (error: unknown) {
    Profiling.error({
      source: 'GUESS_CONTROLLERS_getMemberGuesses',
      error,
    });
  }
}

async function createGuess(req: CreateGuessRequest, res: Response) {
  try {
    const memberId = Utils.getAuthenticatedUserId(req, res);
    const input = req?.body as GuessInput;

    const homeScore = String(input.home.score);
    const awayScore = String(input.away.score);

    const [guess] = await db
      .insert(T_Guess)
      .values({
        id: input.id,
        awayScore,
        homeScore,
        matchId: input.matchId,
        memberId,
      })
      .onConflictDoUpdate({
        target: [T_Guess.memberId, T_Guess.matchId],
        set: { awayScore: String(input.away.score), homeScore: String(input.home.score) },
      })
      .returning();

    if (!guess) {
      console.error(ErrorMapper.FAILED_GUESS_CRETION.debug);
      res
        .status(ErrorMapper.FAILED_GUESS_CRETION.status)
        .send(ErrorMapper.FAILED_GUESS_CRETION.user);
      return;
    }

    const [guessAndMatch] = await db
      .select()
      .from(T_Guess)
      .innerJoin(T_Match, eq(T_Match.id, T_Guess.matchId))
      .where(and(eq(T_Guess.id, guess.id), eq(T_Guess.memberId, memberId)));

    const parsed = runGuessAnalysis(guessAndMatch.guess, guessAndMatch.match);

    res.status(200).send(parsed);
  } catch (error: unknown) {
    console.error('[ERROR] [GUESS] [CREATING GUESS]');
    return handleInternalServerErrorResponse(res, error);
  }
}

const selectMemberGuessesForTournament = async (
  memberId: string,
  tournamentId: string
) => {
  const guesses = await db
    .select()
    .from(T_Guess)
    .innerJoin(T_Match, eq(T_Match.id, T_Guess.matchId))
    .where(and(eq(T_Match.tournamentId, tournamentId), eq(T_Guess.memberId, memberId)));

  return guesses;
};

export const QUERIES_Guess = {
  selectMemberGuessesForTournament,
};

export default GuessController;
