import { DB_SelectGuess, T_Guess } from '@/domains/guess/schema';
import { DB_SelectMatch, T_Match } from '@/domains/match/schema';
import { DB_SelectMember, T_Member } from '@/domains/member/schema';
import { DB_SelectTournament, T_Tournament } from '@/domains/tournament/schema';

import { Utils } from '@/domains/auth/utils';
import { runGuessAnalysis } from '@/domains/guess/controllers/guess-analysis';
import { T_LeagueRole } from '@/domains/league/schema';
import db from '@/services/database';
import { and, eq, gte, lte } from 'drizzle-orm';
import { Request, Response } from 'express';
import { handleInternalServerErrorResponse } from '../../shared/error-handling/httpResponsesHelper';

export interface LeagueScoreQuery {
  member: DB_SelectMember;
  match: DB_SelectMatch;
  guess: DB_SelectGuess;
  tournament: DB_SelectTournament;
}

async function getLeagueScore(req: Request, res: Response) {
  const leagueId = req?.params.leagueId as string;

  try {
    // TODO subquery???
    const query = (await db
      .select()
      .from(T_Guess)
      .leftJoin(T_LeagueRole, eq(T_Guess.memberId, T_LeagueRole.memberId))
      .leftJoin(T_Match, eq(T_Match.id, T_Guess.matchId))
      .leftJoin(T_Member, eq(T_Member.id, T_Guess.memberId))
      .leftJoin(T_Tournament, eq(T_Tournament.id, T_Match.tournamentId))
      .where(
        and(
          eq(T_LeagueRole.leagueId, leagueId),
          gte(T_Match.date, new Date('2024-01-01')),
          lte(T_Match.date, new Date('2024-12-31'))
        )
      )) as LeagueScoreQuery[];

    // const serializedScoreboard = createLeaderboard(query);

    return res.status(200).send(query);
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

    return res.status(200).send(parsedGuesses);
  } catch (error: any) {
    console.error('[GET] - [GUESS]', error);
    return handleInternalServerErrorResponse(res, error);
  }
}

const ScoreController = {
  getLeagueScore,
  getTournamentScore,
};

export default ScoreController;
