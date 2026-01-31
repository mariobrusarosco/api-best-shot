import { Utils } from '@/domains/auth/utils';
import { ErrorMapper } from '@/domains/guess/error-handling/mapper';
import { DB_SelectGuess, T_Guess } from '@/domains/guess/schema';
import { runGuessAnalysis } from '@/domains/guess/services/guess-analysis-v2';
import { CreateGuessRequest, GuessInput } from '@/domains/guess/typing';
import { DB_SelectMatch, T_Match } from '@/domains/match/schema';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import db from '@/services/database';
import Logger from '@/services/logger';
import { DOMAINS } from '@/services/logger/constants';
import { randomUUID } from 'crypto';
import { and, eq } from 'drizzle-orm';
import { Response } from 'express';

const buildExpiredGuess = (memberId: string, matchId: string, roundSlug: string) => {
  return {
    id: randomUUID(),
    memberId,
    matchId,
    roundSlug,
    homeScore: null,
    awayScore: null,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

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
    // Single query: Get all matches with their guesses (if they exist) using LEFT JOIN
    const matchesWithGuesses = await db
      .select()
      .from(T_Match)
      .leftJoin(T_Guess, and(eq(T_Match.id, T_Guess.matchId), eq(T_Guess.memberId, memberId)))
      .where(and(eq(T_Match.tournamentId, tournamentId), eq(T_Match.roundSlug, round)));

    // Single loop: Process each match-guess pair
    const parsedGuesses = matchesWithGuesses.map((row: { match: DB_SelectMatch; guess: DB_SelectGuess | null }) => {
      const guess = row.guess || buildExpiredGuess(memberId, row.match.id, round);
      return runGuessAnalysis(guess, row.match);
    });

    console.log('-----------------', parsedGuesses);

    return parsedGuesses;
  } catch (error: unknown) {
    Logger.error(error as Error, {
      domain: DOMAINS.GUESS,
      component: 'controller',
      operation: 'getMemberGuesses',
    });
  }
}

async function createGuess(req: CreateGuessRequest, res: Response) {
  try {
    const memberId = Utils.getAuthenticatedUserId(req, res);
    const input = req?.body as GuessInput;

    const homeScore = input.home.score;
    const awayScore = input.away.score;

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
        set: { awayScore: input.away.score, homeScore: input.home.score },
      })
      .returning();

    if (!guess) {
      console.error(ErrorMapper.FAILED_GUESS_CRETION.debug);
      res.status(ErrorMapper.FAILED_GUESS_CRETION.status).send(ErrorMapper.FAILED_GUESS_CRETION.user);
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

const selectMemberGuessesForTournament = async (memberId: string, tournamentId: string) => {
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
