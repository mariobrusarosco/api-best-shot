import { Utils } from '@/domains/auth/utils';
import { and, eq } from 'drizzle-orm';
import { Request, Response } from 'express';
import db from '../../../services/database';
import { T_Guess, T_Match } from '../../../services/database/schema';
import { handleInternalServerErrorResponse } from '../../shared/error-handling/httpResponsesHelper';
import { ErrorMapper } from '../error-handling/mapper';

async function getMemberGuesses(req: Request, res: Response) {
  try {
    const memberId = Utils.getAuthenticatedUserId(req, res);
    const tournamentId = req.params.tournamentId as string;
    const query = req.query as { round: string };

    const guesses = await db
      .select({
        memberId: T_Guess.memberId,
        matchId: T_Guess.matchId,
        home: { score: T_Guess.homeScore },
        away: { score: T_Guess.awayScore },
        round: T_Match.roundId,
      })
      .from(T_Guess)
      .innerJoin(T_Match, eq(T_Match.id, T_Guess.matchId))
      .where(
        and(
          eq(T_Guess.memberId, memberId),
          eq(T_Match.tournamentId, tournamentId),
          eq(T_Match.roundId, query?.round)
        )
      );

    return res.status(200).send(guesses);
  } catch (error: any) {
    return handleInternalServerErrorResponse(res, error);
  }
}

export type GuessInput = {
  matchId: string;
  home: {
    score: number;
  };
  away: {
    score: number;
  };
};

async function createGuess(req: Request, res: Response) {
  try {
    const memberId = Utils.getAuthenticatedUserId(req, res);
    const input = req?.body as GuessInput;

    const query = await db.insert(T_Guess).values({
      awayScore: String(input.away.score),
      homeScore: String(input.home.score),
      matchId: input.matchId,
      memberId,
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
    console.log('[GUESS] [CREATING GUESS]');
    return handleInternalServerErrorResponse(res, error);
  }
}

const GuessController = {
  getMemberGuesses,
  createGuess,
};

export default GuessController;
