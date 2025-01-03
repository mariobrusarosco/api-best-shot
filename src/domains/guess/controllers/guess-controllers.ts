import { Utils } from '@/domains/auth/utils';
import { runGuessAnalysis } from '@/domains/guess/controllers/guess-analysis';
import { ErrorMapper } from '@/domains/guess/error-handling/mapper';
import { T_Guess } from '@/domains/guess/schema';
import { GuessInput } from '@/domains/guess/typing';
import { T_Match } from '@/domains/match/schema';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import db from '@/services/database';
import Profiling from '@/services/profiling';
import { and, eq } from 'drizzle-orm';
import { Request, Response } from 'express';

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
    const guesses = await db
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

    if (!guesses) {
      return [];
    }

    const parsedGuesses = guesses.map(row => runGuessAnalysis(row.guess, row.match));

    return parsedGuesses;
  } catch (error: any) {
    Profiling.error('GETTING MEMBER GUESSES', error);
  }
}

async function createGuess(req: Request, res: Response) {
  try {
    const memberId = Utils.getAuthenticatedUserId(req, res);
    const input = req?.body as GuessInput;

    const homeScore = String(input.home.score);
    const awayScore = String(input.away.score);

    const query = await db
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
      });

    if (!query) {
      console.error(ErrorMapper.FAILED_GUESS_CRETION.debug);
      res
        .status(ErrorMapper.FAILED_GUESS_CRETION.status)
        .send(ErrorMapper.FAILED_GUESS_CRETION.user);
      return;
    }

    res.status(200).send(query);
  } catch (error: any) {
    console.error('[ERROR] [GUESS] [CREATING GUESS]');
    return handleInternalServerErrorResponse(res, error);
  }
}

export default GuessController;
