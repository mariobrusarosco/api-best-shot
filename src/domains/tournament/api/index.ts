import { Utils } from '@/domains/auth/utils';
import { DB_Performance } from '@/domains/performance/database';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { Request, Response } from 'express';

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
    console.error('Error fetching matches:', error);
    return handleInternalServerErrorResponse(res, error);
  }
};

export const API_Tournament = {
  getTournamentPerformanceForMember,
};
