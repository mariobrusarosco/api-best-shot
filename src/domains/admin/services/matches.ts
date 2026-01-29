import { BaseScraper } from '@/domains/data-provider/providers/playwright/base-scraper';
import { MatchesDataProviderService } from '@/domains/data-provider/services/match';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { QUERIES_TOURNAMENT_ROUND } from '@/domains/tournament-round/queries';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import Logger from '@/services/logger';
import { DOMAINS } from '@/services/logger/constants';
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

      const rounds = await QUERIES_TOURNAMENT_ROUND.getAllRounds(tournamentId);

      scraper = await BaseScraper.createInstance();
      const dataProviderService = new MatchesDataProviderService(scraper, requestId);

      const matches = await dataProviderService.init(rounds, tournament);

      return res.status(201).json({
        success: true,
        data: { matches },
        message: `Matches created successfully`,
      });
    } catch (error) {
      Logger.error(error as Error, {
        domain: DOMAINS.ADMIN,
        operation: 'createMatches',
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

  static async updateMatches(req: Request, res: Response) {
    const requestId = randomUUID();
    let scraper: BaseScraper | null = null;

    try {
      const tournamentId = req.params.tournamentId;
      if (!tournamentId) {
        return res.status(400).json({
          success: false,
          error: 'Tournament ID is required',
        });
      }

      const tournament = await SERVICES_TOURNAMENT.getTournament(tournamentId);
      if (!tournament) {
        return res.status(404).json({
          success: false,
          error: 'Tournament not found',
        });
      }

      const rounds = await QUERIES_TOURNAMENT_ROUND.getAllRounds(tournamentId);

      scraper = await BaseScraper.createInstance();
      const dataProviderService = new MatchesDataProviderService(scraper, requestId);

      const matches = await dataProviderService.init(rounds, tournament);

      return res.status(200).json({
        success: true,
        data: { matches },
        message: `Matches updated successfully`,
      });
    } catch (error) {
      Logger.error(error as Error, {
        domain: DOMAINS.ADMIN,
        operation: 'updateMatches',
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

      const round = await QUERIES_TOURNAMENT_ROUND.getRound(tournamentId, roundSlug);
      if (!round) {
        return res.status(404).json({
          success: false,
          error: 'Round not found',
        });
      }

      scraper = await BaseScraper.createInstance();
      const dataProviderService = new MatchesDataProviderService(scraper, requestId);

      const matches = await dataProviderService.updateRound(round);

      return res.status(200).json({
        success: true,
        data: { matches },
        message: `Matches for round "${roundSlug}" updated successfully`,
      });
    } catch (error) {
      Logger.error(error as Error, {
        domain: DOMAINS.ADMIN,
        operation: 'updateMatchesByRound',
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
}

export { AdminMatchesService };
