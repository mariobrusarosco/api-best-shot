import { BaseScraper } from '@/domains/data-provider/providers/playwright/base-scraper';
import { StandingsDataProviderService } from '@/domains/data-provider/services/standings';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import Profiling from '@/services/profiling';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';

class AdminStandingsService {
  static async createStandings(req: Request, res: Response) {
    const requestId = randomUUID();
    let scraper: BaseScraper | null = null;

    try {
      if (!req.body.tournamentId) {
        return res.status(400).json({
          success: false,
          error: 'Tournament ID is required',
        });
      }

      const tournament = await SERVICES_TOURNAMENT.getTournament(req.body.tournamentId);
      if (!tournament) {
        return res.status(404).json({
          success: false,
          error: 'Tournament not found',
        });
      }

      Profiling.log({
        msg: `[ADMIN STANDINGS CREATION] Request received`,
        data: {
          requestId,
          tournamentId: req.body.tournamentId,
          adminUser: req.authenticatedUser?.nickName,
        },
        source: 'ADMIN_SERVICE_STANDINGS_create',
      });

      scraper = await BaseScraper.createInstance();
      const dataProviderService = new StandingsDataProviderService(scraper, requestId);
      const standings = await dataProviderService.init(tournament);

      Profiling.log({
        msg: `[ADMIN STANDINGS CREATION] Standings created successfully`,
        data: {
          requestId,
          tournamentId: tournament.id,
          standingsCount: standings.length,
          createdBy: req.authenticatedUser?.nickName,
        },
        source: 'ADMIN_SERVICE_STANDINGS_create',
      });

      return res.status(201).json({
        success: true,
        data: { standings },
        message: `${standings.length} standings created successfully for tournament "${tournament.label}"`,
      });
    } catch (error) {
      Profiling.error({
        source: 'ADMIN_SERVICE_STANDINGS_create',
        error,
        data: {
          requestId,
          operation: 'admin_standings_creation',
          adminUser: req.authenticatedUser?.nickName,
        },
      });
      return handleInternalServerErrorResponse(res, error);
    } finally {
      if (scraper) {
        await scraper.close();
      }
    }
  }
}

export { AdminStandingsService };
