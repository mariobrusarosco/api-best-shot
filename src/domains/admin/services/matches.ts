import { BaseScraper } from '@/domains/data-provider/providers/playwright/base-scraper';
import { MatchesDataProviderService } from '@/domains/data-provider/services/matches';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import Profiling from '@/services/profiling';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';

class AdminMatchesService {
  static async createMatches(req: Request, res: Response) {
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
      const dataProviderService = new MatchesDataProviderService(scraper, requestId);

      // Build proper payload for matches service
      const payload = {
        tournamentId: tournamentId,
        baseUrl: tournament.baseUrl,
        label: tournament.label,
        provider: tournament.provider,
      };

      const matches = await dataProviderService.init(payload);

      return res.status(201).json({
        success: true,
        data: { matches },
        message: `Matches created successfully`,
      });
    } catch (error) {
      Profiling.error({
        source: 'ADMIN_SERVICE_MATCHES_create',
        error,
        data: {
          requestId,
          operation: 'admin_matches_creation',
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
          source: 'ADMIN_SERVICE_MATCHES_create',
        });
      }
    }
  }

  static async updateMatches(req: Request, res: Response) {
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
      const dataProviderService = new MatchesDataProviderService(scraper, requestId);

      // Build proper payload for matches service
      const payload = {
        tournamentId: tournamentId,
        baseUrl: tournament.baseUrl,
        label: tournament.label,
        provider: tournament.provider,
      };

      const matches = await dataProviderService.update(payload);

      return res.status(200).json({
        success: true,
        data: { matches },
        message: `Matches updated successfully`,
      });
    } catch (error) {
      Profiling.error({
        source: 'ADMIN_SERVICE_MATCHES_update',
        error,
        data: {
          requestId,
          operation: 'admin_matches_update',
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
          source: 'ADMIN_SERVICE_MATCHES_update',
        });
      }
    }
  }

  static async updateMatchesByRound(req: Request, res: Response) {
    const requestId = randomUUID();
    let scraper: BaseScraper | null = null;

    try {
      // Get tournament ID and round slug from URL params
      const tournamentId = req.params.tournamentId;
      const roundSlug = req.params.roundSlug;

      if (!tournamentId) {
        return res.status(400).json({
          success: false,
          error: 'Tournament ID is required',
        });
      }

      if (!roundSlug) {
        return res.status(400).json({
          success: false,
          error: 'Round slug is required',
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
      const dataProviderService = new MatchesDataProviderService(scraper, requestId);

      // Build proper payload for round-specific matches service
      const payload = {
        tournamentId: tournamentId,
        roundSlug: roundSlug,
        baseUrl: tournament.baseUrl,
        label: tournament.label,
        provider: tournament.provider,
      };

      const matches = await dataProviderService.updateRound(payload);

      return res.status(200).json({
        success: true,
        data: { matches },
        message: `Matches for round "${roundSlug}" updated successfully`,
      });
    } catch (error) {
      Profiling.error({
        source: 'ADMIN_SERVICE_MATCHES_updateByRound',
        error,
        data: {
          requestId,
          operation: 'admin_matches_update_by_round',
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
          source: 'ADMIN_SERVICE_MATCHES_updateByRound',
        });
      }
    }
  }
}

export { AdminMatchesService };
