import { BaseScraper } from '@/domains/data-provider/providers/playwright/base-scraper';
import { TournamentDataProvider } from '@/domains/data-provider/services/tournaments';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import Profiling from '@/services/profiling';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';

class AdminTournamentService {
  // Create tournament with admin context
  static async createTournament(req: Request, res: Response) {
    const requestId = randomUUID();
    let scraper: BaseScraper | null = null;

    try {
      scraper = await BaseScraper.createInstance();
      const dataProviderService = new TournamentDataProvider(scraper, requestId);
      const tournament = await dataProviderService.init(req.body);

      return res.status(201).json({
        success: true,
        data: { tournament },
        message: `Tournament "${tournament.label}" created successfully`,
      });
    } catch (error) {
      Profiling.error({
        source: 'ADMIN_SERVICE_TOURNAMENT_create',
        error,
        data: {
          requestId,
          operation: 'admin_tournament_creation',
          adminUser: req.authenticatedUser?.nickName,
        },
      });
      return handleInternalServerErrorResponse(res, error);
    } finally {
      if (scraper) {
        await scraper.close();
        Profiling.log({
          msg: '[CLEANUP] Playwright resources cleaned up successfully',
          data: { requestId, source: 'admin_service' },
          source: 'ADMIN_SERVICE_TOURNAMENT_create',
        });
      }
    }
  }

  // Get all tournaments for admin
  static async getAllTournaments(_req: Request, res: Response) {
    try {
      const tournaments = await SERVICES_TOURNAMENT.getAllTournaments();

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

  // Get single tournament by ID for admin
  static async getTournamentById(req: Request, res: Response) {
    try {
      const { tournamentId } = req.params;

      if (!tournamentId) {
        return res.status(400).json({
          success: false,
          message: 'Tournament ID is required',
        });
      }

      const tournament = await SERVICES_TOURNAMENT.getTournament(tournamentId);

      // Exclude rounds from admin response
      const { ...tournamentWithoutRounds } = tournament;

      return res.status(200).json({
        success: true,
        data: tournamentWithoutRounds,
        message: 'Tournament retrieved successfully',
      });
    } catch (error) {
      console.error('Error fetching tournament for admin:', error);
      if (error instanceof Error && error.message === 'Tournament not found') {
        return res.status(404).json({
          success: false,
          message: 'Tournament not found',
        });
      }
      return handleInternalServerErrorResponse(res, error);
    }
  }
}

export { AdminTournamentService };
