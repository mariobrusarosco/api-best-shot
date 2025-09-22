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
      // Get tournament ID from URL params
      const tournamentId = req.params.tournamentId;
      if (!tournamentId) {
        return res.status(400).json({
          success: false,
          error: 'Tournament ID is required',
        });
      }

      // Get tournament data to build payload
      const tournament = await SERVICES_TOURNAMENT.getTournament(tournamentId);
      if (!tournament) {
        return res.status(404).json({
          success: false,
          error: 'Tournament not found',
        });
      }

      scraper = await BaseScraper.createInstance();
      const dataProviderService = new StandingsDataProviderService(scraper, requestId);

      // Build proper payload for standings service
      const payload = {
        tournamentId: tournamentId,
        baseUrl: tournament.baseUrl,
        label: tournament.label,
        provider: tournament.provider,
      };

      const standings = await dataProviderService.init(payload);

      return res.status(201).json({
        success: true,
        data: { standings },
        message: `Standings created successfully`,
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
        Profiling.log({
          msg: '[CLEANUP] Playwright resources cleaned up successfully',
          data: { requestId, source: 'admin_service' },
          source: 'ADMIN_SERVICE_STANDINGS_create',
        });
      }
    }
  }

  static async updateStandings(req: Request, res: Response) {
    const requestId = randomUUID();
    let scraper: BaseScraper | null = null;

    try {
      // Get tournament ID from URL params
      const tournamentId = req.params.tournamentId;
      if (!tournamentId) {
        return res.status(400).json({
          success: false,
          error: 'Tournament ID is required',
        });
      }

      // Get tournament data to build payload
      const tournament = await SERVICES_TOURNAMENT.getTournament(tournamentId);
      if (!tournament) {
        return res.status(404).json({
          success: false,
          error: 'Tournament not found',
        });
      }

      scraper = await BaseScraper.createInstance();
      const dataProviderService = new StandingsDataProviderService(scraper, requestId);

      // Build proper payload for standings service
      const payload = {
        tournamentId: tournamentId,
        baseUrl: tournament.baseUrl,
        label: tournament.label,
        provider: tournament.provider,
      };

      const standings = await dataProviderService.update(payload);

      return res.status(200).json({
        success: true,
        data: { standings },
        message: `Standings updated successfully`,
      });
    } catch (error) {
      Profiling.error({
        source: 'ADMIN_SERVICE_STANDINGS_update',
        error,
        data: {
          requestId,
          operation: 'admin_standings_update',
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
          source: 'ADMIN_SERVICE_STANDINGS_update',
        });
      }
    }
  }
}

export { AdminStandingsService };
