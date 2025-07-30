import { BaseScraper } from '@/domains/data-provider/providers/playwright/base-scraper';
import Profiling from '@/services/profiling';
import { Response } from 'express';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { StandingsRequest } from '@/domains/data-provider/api/v2/standings/typing';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import { StandingsDataProviderService } from '@/domains/data-provider/services/standings';

const create = async (req: StandingsRequest, res: Response) => {
  let scraper: BaseScraper | null = null;
  try {
    scraper = await BaseScraper.createInstance();
    const dataProviderService = new StandingsDataProviderService(scraper);

    if (!req.body.tournamentId) {
      return res.status(400).send({ error: 'Tournament ID is required' });
    }

    const tournament = await SERVICES_TOURNAMENT.getTournament(req.body.tournamentId);
    const standings = await dataProviderService.init(tournament);

    Profiling.log({
      msg: `Created standings for tournament: ${tournament.label}`,
      data: { standings },
    });

    return res.status(200).json({ standings });
  } catch (error: any) {
    Profiling.error({
      source: 'DATA_PROVIDER_V2_STANDINGS_create',
      error,
    });
    return handleInternalServerErrorResponse(res, error);
  } finally {
    // CRITICAL: Clean up Playwright resources to prevent memory leaks
    if (scraper) {
      await scraper.close();
    }
  }
};

const update = async (req: StandingsRequest, res: Response) => {
  let scraper: BaseScraper | null = null;
  try {
    scraper = await BaseScraper.createInstance();
    const dataProviderService = new StandingsDataProviderService(scraper);

    if (!req.body.tournamentId) {
      return res.status(400).send({ error: 'Tournament ID is required' });
    }

    const tournament = await SERVICES_TOURNAMENT.getTournament(req.body.tournamentId);
    const standings = await dataProviderService.updateTournament(tournament);

    Profiling.log({
      msg: `Updated standings for tournament: ${tournament.label}`,
      data: { standings },
    });

    return res.status(200).json({ standings });
  } catch (error: any) {
    Profiling.error({
      source: 'DATA_PROVIDER_V2_STANDINGS_update',
      error,
    });
    return handleInternalServerErrorResponse(res, error);
  } finally {
    // CRITICAL: Clean up Playwright resources to prevent memory leaks
    if (scraper) {
      await scraper.close();
    }
  }
};

const API_STANDINGS = {
  create,
  update,
};

export default API_STANDINGS;
