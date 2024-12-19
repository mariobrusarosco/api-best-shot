import { Utils } from '@/domains/auth/utils';
import { DB_Performance } from '@/domains/performance/database';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import db from '@/services/database';
import { eq, sql } from 'drizzle-orm';
import { Request, Response } from 'express';
import { T_TournamentStandings } from '../schema';

const getTournamentPerformanceForMember = async (req: Request, res: Response) => {
  try {
    const tournamentId = req?.params.tournamentId;
    const memberId = Utils.getAuthenticatedUserId(req, res);

    const query = await DB_Performance.queryPerformanceForTournament(
      memberId,
      tournamentId
    );

    return res.status(200).send(query);
  } catch (error: any) {
    console.error('[TOURNAMENT API] - [getTournamentPerformanceForMember] -', error);
    return handleInternalServerErrorResponse(res, error);
  }
};

const getTournamentStandings = async (req: Request, res: Response) => {
  try {
    const tournamentId = req?.params.tournamentId;

    const standings = await db
      .select()
      .from(T_TournamentStandings)
      .where(eq(T_TournamentStandings.tournamentId, tournamentId))
      .orderBy(sql`cast(${T_TournamentStandings.order} as integer)`);

    const lastUpdated = standings[0].updatedAt;

    return res.status(200).send({
      standings,
      lastUpdated,
    });
  } catch (error: any) {
    console.error('[TOURNAMENT API] -[getTournamentStandings] -', error);
    return handleInternalServerErrorResponse(res, error);
  }
};

export const API_Tournament = {
  getTournamentPerformanceForMember,
  getTournamentStandings,
};
