import { ACTIVE_API_PROVIDER } from '@/domains/data-provider-v2';
import { T_Match } from '@/domains/match/schema';
import { DB_SelectTournament, T_Tournament } from '@/domains/tournament/schema';
import { and, eq } from 'drizzle-orm';
import { Request, Response } from 'express';
import db from '../../../services/database';
import { handleInternalServerErrorResponse } from '../../shared/error-handling/httpResponsesHelper';

const TournamentController = {
  getTournament,
  getAllTournaments,
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

    return res.status(200).send(tournament);
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

// ----------------------------------------------------------------

export async function getNonStartedMatches(tournament: DB_SelectTournament) {
  const selectQuery = await db
    .selectDistinct({ roundId: T_Match.roundId })
    .from(T_Match)
    .where(
      and(eq(T_Match.tournamentId, tournament.id as string), eq(T_Match.status, 'open'))
    );

  return new Set(selectQuery.map(round => Number(round.roundId)));
}

export default TournamentController;
