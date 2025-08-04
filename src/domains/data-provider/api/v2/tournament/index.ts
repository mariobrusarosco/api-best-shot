import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import type { TournamentRequest } from './typing';
import { TournamentDataProviderService } from '@/domains/data-provider/services/tournaments';
import { Response } from 'express';
import Profiling from '@/services/profiling';
import { BaseScraper } from '@/domains/data-provider/providers/playwright/base-scraper';
import { randomUUID } from 'crypto';

const create = async (req: TournamentRequest, res: Response) => {
  const requestId = randomUUID();
  let scraper: BaseScraper | null = null;
  try {
    Profiling.log({
      msg: `[REQUEST START] Tournament creation request received`,
      data: { 
        requestId,
        tournamentLabel: req.body.label,
        provider: req.body.provider,
        tournamentId: req.body.tournamentPublicId 
      },
      source: 'DATA_PROVIDER_V2_TOURNAMENT_create',
    });

    scraper = await BaseScraper.createInstance();

    Profiling.log({
      msg: `[SCRAPER START] Scraper initialized for tournament creation`,
      data: { requestId, tournamentLabel: req.body.label },
      source: 'DATA_PROVIDER_V2_TOURNAMENT_create',
    });

    const dataProviderService = new TournamentDataProviderService(scraper, requestId);
    const tournament = await dataProviderService.init(req.body);

    Profiling.log({
      msg: `[SCRAPER STOP] Tournament creation completed successfully`,
      data: { requestId, tournamentLabel: tournament.label, tournamentId: tournament.id },
      source: 'DATA_PROVIDER_V2_TOURNAMENT_create',
    });

    return res.status(200).json({ tournament });
  } catch (error: any) {
    Profiling.error({
      source: 'DATA_PROVIDER_V2_TOURNAMENT_create',
      error,
      data: { requestId, operation: 'tournament_creation' }
    });
    return handleInternalServerErrorResponse(res, error);
  } finally {
    // CRITICAL: Clean up Playwright resources to prevent memory leaks
    if (scraper) {
      await scraper.close();
      Profiling.log({
        msg: '[CLEANUP] Playwright resources cleaned up successfully',
        data: { requestId },
        source: 'DATA_PROVIDER_V2_TOURNAMENT_create',
      });
    }
  }
};

const API_TOURNAMENT = {
  create,
};

export default API_TOURNAMENT;
