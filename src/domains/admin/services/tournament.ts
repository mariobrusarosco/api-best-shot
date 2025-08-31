import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { Request, Response } from 'express';
import { QUERIES_ADMIN_TOURNAMENT } from '../queries';

class AdminTournamentService {
  // Get all tournaments for admin
  static async getAllTournaments(_req: Request, res: Response) {
    try {
      const tournaments = await QUERIES_ADMIN_TOURNAMENT.adminAllTournaments();

      return res.status(200).json({
        success: true,
        data: tournaments,
        message: 'Tournaments retrieved successfully',
      });
    } catch (error) {
      console.error('Error fetching tournaments for admin:', error);
      return handleInternalServerErrorResponse(res, error);
    }
  }
}

export { AdminTournamentService };
