import { Utils } from '@/domains/auth/utils';
import { runGuessAnalysis } from '@/domains/guess/controllers/guess-analysis';
import { ErrorMapper } from '@/domains/guess/error-handling/mapper';
import { DB_InsertGuess, T_Guess } from '@/domains/guess/schema';
import { GuessInput } from '@/domains/guess/typing';
import { T_Match } from '@/domains/match/schema';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { TournamentRoundsQueries } from '@/domains/tournament-round/queries';
import db from '@/services/database';
import { and, eq } from 'drizzle-orm';
import { Request, Response } from 'express';

const GuessController = {
  createGuess,
  getMemberGuesses,
  runGuessAnalysis,
};

async function getMemberGuesses(req: Request, res: Response) {
  try {
    const memberId = Utils.getAuthenticatedUserId(req, res);
    const tournamentId = req.params.tournamentId as string;
    const query = req.query as { round: string };

    const round = await TournamentRoundsQueries.getRound({
      tournamentId,
      roundSlug: query.round,
    });

    const guesses = await db
      .select()
      .from(T_Guess)
      .innerJoin(T_Match, eq(T_Match.id, T_Guess.matchId))
      .where(
        and(
          eq(T_Match.tournamentId, tournamentId),
          eq(T_Match.roundSlug, round.slug!),
          eq(T_Guess.memberId, memberId)
        )
      );

    // TODO - Refactor this
    if (guesses.length === 0) {
      const matches = await db
        .select()
        .from(T_Match)
        .where(
          and(eq(T_Match.tournamentId, tournamentId), eq(T_Match.roundSlug, round.slug!))
        );

      const guessesToInsert = matches.map(row => {
        return {
          matchId: row.id,
          memberId,
          awayScore: null,
          homeScore: null,
        } satisfies DB_InsertGuess;
      });

      await db.insert(T_Guess).values(guessesToInsert);
      const guesses = await db
        .select()
        .from(T_Guess)
        .innerJoin(T_Match, eq(T_Match.id, T_Guess.matchId))
        .where(
          and(
            eq(T_Match.tournamentId, tournamentId),
            eq(T_Match.roundSlug, round.slug!),
            eq(T_Guess.memberId, memberId)
          )
        );

      const parsedGuesses = guesses.map(row => runGuessAnalysis(row.guess, row.match));
      return res.status(200).send(parsedGuesses);
    }

    const parsedGuesses = guesses.map(row => runGuessAnalysis(row.guess, row.match));

    return res.status(200).send(parsedGuesses);
  } catch (error: any) {
    return handleInternalServerErrorResponse(res, error);
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
