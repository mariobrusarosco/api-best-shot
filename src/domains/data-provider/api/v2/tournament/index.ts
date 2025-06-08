import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import type { TournamentRequest } from './typing';
import { TournamentDataProviderService } from '@/domains/data-provider/services/tournaments';
import { Response } from 'express';
import Profiling from '@/services/profiling';
import { BaseScraper } from '@/domains/data-provider/providers/playwright/base-scraper';

const create = async (req: TournamentRequest, res: Response) => {
  try {
    const scraper = await BaseScraper.createInstance();

    const dataProviderService = new TournamentDataProviderService(scraper);
    const tournament = await dataProviderService.init(req.body);

    Profiling.log({
      msg: 'CREATE SUCCESS',
      data: { tournament },
      source: 'DATA_PROVIDER_V2_TOURNAMENT_create',
    });

    return res.status(200).json({ tournament });
  } catch (error: any) {
    Profiling.error({
      source: 'DATA_PROVIDER_V2_TOURNAMENT_create',
      error,
    });
    return handleInternalServerErrorResponse(res, error);
  }
};

const API_TOURNAMENT = {
  create,
};

export default API_TOURNAMENT;
