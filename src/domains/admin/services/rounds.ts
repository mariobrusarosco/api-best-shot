import { BaseScraper } from '@/domains/data-provider/providers/playwright/base-scraper';
import { RoundsDataProviderService } from '@/domains/data-provider/services/rounds';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import Logger from '@/services/logger';
import { DOMAINS } from '@/services/logger/constants';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';

class AdminRoundsService {
  static async createRounds(req: Request, res: Response) {
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
      const dataProviderService = new RoundsDataProviderService(scraper, requestId);

      // Build proper payload for rounds service
      const payload = {
        tournamentId: tournamentId,
        baseUrl: tournament.baseUrl,
        label: tournament.label,
        provider: tournament.provider,
      };

      const rounds = await dataProviderService.init(payload);

      return res.status(201).json({
        success: true,
        data: { rounds },
        message: `Rounds created successfully`,
      });
    } catch (error) {
      Logger.error(error as Error, {
        domain: DOMAINS.ADMIN,
        operation: 'createRounds',
        component: 'service',
        requestId,
        adminUser: req.authenticatedUser?.nickName,
      });
      return handleInternalServerErrorResponse(res, error);
    } finally {
      if (scraper) {
        await scraper.close();
        Logger.info('[CLEANUP] Playwright resources cleaned up successfully', {
          requestId,
          source: 'admin_service',
        });
      }
    }
  }

  static async updateRounds(req: Request, res: Response) {
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
      const dataProviderService = new RoundsDataProviderService(scraper, requestId);

      // Build proper payload for rounds service
      const payload = {
        tournamentId: tournamentId,
        baseUrl: tournament.baseUrl,
        label: tournament.label,
        provider: tournament.provider,
      };

      const rounds = await dataProviderService.update(payload);

      return res.status(200).json({
        success: true,
        data: { rounds },
        message: `Rounds updated successfully`,
      });
    } catch (error) {
      Logger.error(error as Error, {
        domain: DOMAINS.ADMIN,
        operation: 'updateRounds',
        component: 'service',
        requestId,
        adminUser: req.authenticatedUser?.nickName,
      });
      return handleInternalServerErrorResponse(res, error);
    } finally {
      if (scraper) {
        await scraper.close();
        Logger.info('[CLEANUP] Playwright resources cleaned up successfully', {
          requestId,
          source: 'admin_service',
        });
      }
    }
  }

  static async updateKnockoutRounds(req: Request, res: Response) {
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
      const dataProviderService = new RoundsDataProviderService(scraper, requestId);

      const temp = await dataProviderService.updateKnockoutRounds(tournament);

      return res.status(200).json({
        success: true,
        data: { temp },
        message: `Knockout rounds updated successfully`,
      });
    } catch (error) {
      Logger.error(error as Error, {
        domain: DOMAINS.ADMIN,
        operation: 'updateKnockoutRounds',
        component: 'service',
        requestId,
        context: 'knockout',
      });
    }
  }
}

export { AdminRoundsService };
