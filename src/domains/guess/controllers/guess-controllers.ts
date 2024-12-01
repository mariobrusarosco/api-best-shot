import { and, eq } from 'drizzle-orm';
import { Request, Response } from 'express';
import db from '../../../services/database';
import { T_Guess } from '../../../services/database/schema';
import { handleInternalServerErrorResponse } from '../../shared/error-handling/httpResponsesHelper';

async function getMemberGuesses(req: Request, res: Response) {
  const memberId = req?.query.memberId as string;
  const tournamentId = req?.query.tournamentId as string;

  try {
    const guesses = await db
      .select({
        memberId: T_Guess.memberId,
        matchId: T_Guess.matchId,
        tournamentId: T_Guess.tournamentId,
        home: { score: T_Guess.homeScore },
        away: { score: T_Guess.awayScore },
      })
      .from(T_Guess)
      .where(and(eq(T_Guess.memberId, memberId), eq(T_Guess.tournamentId, tournamentId)));

    return res.status(200).send(guesses);
  } catch (error: any) {
    return handleInternalServerErrorResponse(res, error);
  }
}

export type GuessInput = {
  matchId: string;
  memberId: string;
  tournamentId: string;
  home: {
    score: string;
  };
  away: {
    score: string;
  };
};

async function createGuess(req: Request, res: Response) {
  try {
    const input = req?.body as GuessInput;
    // const result = Provider.createGuessOnDatabase(input);

    return res.status(200).send(null);
  } catch (error: any) {
    return handleInternalServerErrorResponse(res, error);
  }
}

const GuessController = {
  getMemberGuesses,
  createGuess,
};

export default GuessController;
