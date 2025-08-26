import { BaseScraper } from '@/domains/data-provider/providers/playwright/base-scraper';
import { TournamentDataProviderService } from '@/domains/data-provider/services/tournaments';
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
      Profiling.log({
        msg: `[ADMIN] Creating tournament..........`,
        data: {
          requestId,
          tournamentLabel: req.body.label,
          provider: req.body.provider,
          adminUser: req.authenticatedUser?.nickName,
        },
        source: 'ADMIN_SERVICE_TOURNAMENT_create',
      });

      scraper = await BaseScraper.createInstance();
      const dataProviderService = new TournamentDataProviderService(scraper, requestId);
      const tournament = await dataProviderService.init(req.body);

      Profiling.log({
        msg: `[ADMIN] Tournament created successfully!`,
        data: {
          requestId,
          tournamentLabel: tournament.label,
          tournamentId: tournament.id,
          createdBy: req.authenticatedUser?.nickName,
        },
        source: 'ADMIN_SERVICE_TOURNAMENT_create',
      });

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
}

export { AdminTournamentService };
