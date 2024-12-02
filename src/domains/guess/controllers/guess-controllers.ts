import { Utils } from '@/domains/auth/utils';
import { DB_SelectGuess, T_Guess } from '@/domains/guess/schema';
import { DB_SelectMatch, T_Match } from '@/domains/match/schema';
import { and, eq } from 'drizzle-orm';
import { Request, Response } from 'express';
import db from '../../../services/database';
import { handleInternalServerErrorResponse } from '../../shared/error-handling/httpResponsesHelper';
import { ErrorMapper } from '../error-handling/mapper';

// const test = (a: any) => {
//   console.log('--------------', a);
// };

// const setGuessStatus = (guess, match) => {
//   if (match.status === 'ended' && guess.homeScore === null && guess.awayScore === null) {
//     return 'missed';
//   }

//   return 'avaialable';
// };

interface IGuessAnalysis {
  id: string;
  matchId: string;
  home: {
    guessOutcome: string;
    value: number | null;
    points: number | null;
  };
  away: { guessOutcome: string; value: number | null; points: number | null };
  fullMatch: {
    guessOutcome: string;
    points: number | null;
  };
  total: number | null;
}

const runGuessAnalysis = (guess: DB_SelectGuess, match: DB_SelectMatch) => {
  const home = {
    guessOutcome:
      Number(guess.homeScore) === Number(match.homeScore)
        ? 'correct_guess'
        : 'incorrect_guess',
    value: Number(guess.homeScore),
    points: Number(guess.homeScore) === Number(match.homeScore) ? 2 : 0,
  };

  const away = {
    guessOutcome:
      Number(guess.awayScore) === Number(match.awayScore)
        ? 'correct_guess'
        : 'incorrect_guess',
    value: Number(guess.awayScore),
    points: Number(guess.awayScore) === Number(match.awayScore) ? 2 : 0,
  };

  const fullMatch = {
    guessOutcome:
      Number(guess.homeScore) === Number(match.homeScore) &&
      Number(guess.awayScore) === Number(match.awayScore)
        ? 'correct_guess'
        : 'incorrect_guess',
    points: Number(guess.awayScore) === Number(match.awayScore) ? 1 : 0,
  };

  const total = home.points + away.points + fullMatch.points;

  if (match.status === 'ended') {
    return {
      id: guess.id,
      matchId: guess.matchId,
      home,
      away,
      fullMatch,
      total,
    } satisfies IGuessAnalysis;
  }

  // if (match.status === 'open') {
  return {
    id: guess.id,
    matchId: guess.matchId,
    home: { guessOutcome: 'open', value: Number(guess.homeScore), points: null },
    away: { guessOutcome: 'open', value: Number(guess.awayScore), points: null },
    fullMatch: { guessOutcome: 'open', points: null },
    total: null,
  } satisfies IGuessAnalysis;
  // }
};

async function getMemberGuesses(req: Request, res: Response) {
  try {
    const memberId = Utils.getAuthenticatedUserId(req, res);
    const tournamentId = req.params.tournamentId as string;
    const query = req.query as { round: string };

    const rows = await db
      .select()
      .from(T_Guess)
      .innerJoin(T_Match, eq(T_Match.id, T_Guess.matchId))
      .where(
        and(
          eq(T_Guess.memberId, memberId),
          eq(T_Match.tournamentId, tournamentId),
          eq(T_Match.roundId, query?.round)
        )
      );

    const guesses = rows?.map(row => runGuessAnalysis(row.guess, row.match));

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
  createGuess,
  getMemberGuesses,
  runGuessAnalysis,
};

export default GuessController;
