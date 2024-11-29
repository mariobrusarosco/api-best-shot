import { and, Column, eq, sql } from 'drizzle-orm';
import { Request, Response } from 'express';
import db from '../../../services/database';
import { TGuess } from '../../../services/database/schema';
import { handleInternalServerErrorResponse } from '../../shared/error-handling/httpResponsesHelper';

const toNumber = (col: Column) => {
  return sql<number>`${col}`.mapWith(Number);
};

async function getMemberGuesses(req: Request, res: Response) {
  const memberId = req?.query.memberId as string;
  const tournamentId = req?.query.tournamentId as string;

  try {
    const guesses = await db
      .select({
        memberId: TGuess.memberId,
        matchId: TGuess.matchId,
        tournamentId: TGuess.tournamentId,
        home: { score: TGuess.homeScore },
        away: { score: TGuess.awayScore },
      })
      .from(TGuess)
      .where(and(eq(TGuess.memberId, memberId), eq(TGuess.tournamentId, tournamentId)));

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
