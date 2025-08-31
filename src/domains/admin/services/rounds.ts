import { BaseScraper } from '@/domains/data-provider/providers/playwright/base-scraper';
import { DataProviderReport } from '@/domains/data-provider/services/reporter';
import { RoundDataProviderService } from '@/domains/data-provider/services/rounds';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import Profiling from '@/services/profiling';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';

class AdminRoundsService {
  static async createRounds(req: Request, res: Response) {
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
        msg: `[ADMIN] Creating rounds for tournament ${tournament.label}..........`,
        data: {
          requestId,
          tournamentLabel: tournament.label,
          tournamentId: tournament.id,
          createdBy: req.authenticatedUser?.nickName,
        },
        source: 'ADMIN_SERVICE_ROUNDS_create',
      });

      scraper = await BaseScraper.createInstance();
      const report = new DataProviderReport('create_rounds', requestId);
      const dataProviderService = new RoundDataProviderService(scraper, report);
      const rounds = await dataProviderService.createRounds(tournament);

      Profiling.log({
        msg: `[ADMIN] Rounds for tournament ${tournament.label} created successfully!`,
        data: {
          requestId,
          tournamentId: tournament.id,
          roundsCount: rounds.length,
          createdBy: req.authenticatedUser?.nickName,
        },
        source: 'ADMIN_SERVICE_ROUNDS_create',
      });

      return res.status(201).json({
        success: true,
        data: { rounds },
        message: `${rounds.length} rounds created successfully for tournament "${tournament.label}"`,
      });
    } catch (error) {
      Profiling.error({
        source: 'ADMIN_SERVICE_ROUNDS_create',
        error,
        data: {
          requestId,
          operation: 'admin_rounds_creation',
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

export { AdminRoundsService };
