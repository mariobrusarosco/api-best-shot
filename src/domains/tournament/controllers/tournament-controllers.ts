import { Utils } from '@/domains/auth/utils';
import { ACTIVE_API_PROVIDER } from '@/domains/data-provider-v2';
import { runGuessAnalysis } from '@/domains/guess/controllers/guess-analysis';
import { DB_InsertGuess, T_Guess } from '@/domains/guess/schema';
import { T_Match } from '@/domains/match/schema';
import { T_TournamentPerformance } from '@/domains/performance/schema';
import { T_Tournament } from '@/domains/tournament/schema';
import { and, asc, eq, sql } from 'drizzle-orm';
import { Request, Response } from 'express';
import db from '../../../services/database';
import { handleInternalServerErrorResponse } from '../../shared/error-handling/httpResponsesHelper';

const TournamentController = {
  getTournament,
  getAllTournaments,
  getTournamentScore,
  setupTournament,
};

async function getTournament(req: Request, res: Response) {
  try {
    const tournamentId = req?.params.tournamentId;
    const [tournament] = await db
      .select()
      .from(T_Tournament)
      .where(
        and(
          eq(T_Tournament.id, tournamentId),
          eq(T_Tournament.provider, ACTIVE_API_PROVIDER)
        )
      );

    const [query] = await db
      .select({
        roundId: T_Match.roundId,
      })
      .from(T_Match)
      .where(eq(T_Match.tournamentId, tournamentId)) // Filter by tournament
      .groupBy(T_Match.roundId)
      .having(
        sql`COUNT(*) = SUM(CASE WHEN ${T_Match.homeScore} IS NULL AND ${T_Match.awayScore} IS NULL THEN 1 ELSE 0 END)`
      )
      .orderBy(asc(T_Match.roundId))
      .limit(1);

    const starterRound = query.roundId ?? '1';

    return res.status(200).send({ ...tournament, starterRound });
  } catch (error: any) {
    console.error('Error fetching matches:', error);
    return handleInternalServerErrorResponse(res, error);
  }
}

async function getAllTournaments(_: Request, res: Response) {
  try {
    const result = await db
      .select()
      .from(T_Tournament)
      .where(eq(T_Tournament.provider, ACTIVE_API_PROVIDER));

    return res.status(200).send(result);
  } catch (error: any) {
    return handleInternalServerErrorResponse(res, error);
  }
}

async function getTournamentScore(req: Request, res: Response) {
  try {
    const memberId = Utils.getAuthenticatedUserId(req, res);
    const { tournamentId } = req?.params as { tournamentId: string };

    const guesses = await db
      .select()
      .from(T_Guess)
      .innerJoin(T_Match, eq(T_Match.id, T_Guess.matchId))
      .where(and(eq(T_Guess.memberId, memberId), eq(T_Match.tournamentId, tournamentId)));

    const parsedGuesses = guesses.map(row => runGuessAnalysis(row.guess, row.match));

    return res.status(200).send({
      details: parsedGuesses,
      points: getTotalPoints(parsedGuesses),
    });
  } catch (error: any) {
    console.error('[GET] - [GUESS]', error);
    return handleInternalServerErrorResponse(res, error);
  }
}

const getTotalPoints = (guesses?: ReturnType<typeof runGuessAnalysis>[]) => {
  if (!performance) return null;

  return guesses?.reduce((acc, value) => acc + value.total, 0);
};

async function setupTournament(req: Request, res: Response) {
  try {
    const memberId = Utils.getAuthenticatedUserId(req, res);
    const { tournamentId } = req.params as { tournamentId: string };
    const matches = await db
      .select()
      .from(T_Match)
      .where(eq(T_Match.tournamentId, tournamentId));

    const guessesToInsert = matches.map(row => {
      return {
        matchId: row.id,
        memberId,
        awayScore: null,
        homeScore: null,
      } satisfies DB_InsertGuess;
    });

    await db.insert(T_Guess).values(guessesToInsert);
    await db.insert(T_TournamentPerformance).values({
      memberId,
      tournamentId,
      points: String(0),
    });

    res.status(200).send('SUCCESS');
  } catch (error: any) {
    console.error('[ERROR] [TOURNAMENT] [setupTournament]');
    return handleInternalServerErrorResponse(res, error);
  }
}

// ----------------------------------------------------------------

async function queryMatchesWithNullGuess(
  memberId: string,
  tournamentId: string,
  round: string
) {
  const rows = await db
    .select()
    .from(T_Match)
    .leftJoin(
      T_Guess,
      and(eq(T_Match.id, T_Guess.matchId), eq(T_Guess.memberId, memberId))
    )
    .where(and(eq(T_Match.tournamentId, tournamentId), eq(T_Match.roundId, round)));

  return rows.filter(row => row.guess === null);
}

export default TournamentController;
