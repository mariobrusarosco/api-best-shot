import { RoundDataProviderService } from '@/domains/data-provider/services/rounds';
import { Response } from 'express';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { TournamentRoundRequest } from './typing';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import { BaseScraper } from '@/domains/data-provider/providers/playwright/base-scraper';
import Profiling from '@/services/profiling';

const create = async (req: TournamentRoundRequest, res: Response) => {
  let scraper: BaseScraper | null = null;
  try {
    scraper = await BaseScraper.createInstance();
    const dataProviderService = new RoundDataProviderService(scraper);

    if (!req.body.tournamentId) {
      return res.status(400).send({ error: 'Tournament ID is required' });
    }

    const tournament = await SERVICES_TOURNAMENT.getTournament(req.body.tournamentId);
    const rounds = await dataProviderService.init(tournament.id, tournament.baseUrl);
    return res.status(200).send(rounds);
  } catch (error: any) {
    handleInternalServerErrorResponse(res, error);
  } finally {
    // CRITICAL: Clean up Playwright resources to prevent memory leaks
    if (scraper) {
      await scraper.close();
    }
  }
};

const update = async (req: TournamentRoundRequest, res: Response) => {
  let scraper: BaseScraper | null = null;
  try {
    scraper = await BaseScraper.createInstance();
    const dataProviderService = new RoundDataProviderService(scraper);

    if (!req.body.tournamentId) {
      return res.status(400).send({ error: 'Tournament ID is required' });
    }

    const tournament = await SERVICES_TOURNAMENT.getTournament(req.body.tournamentId);
    const rounds = await dataProviderService.updateTournament(tournament.id, tournament.baseUrl);

    Profiling.log({
      msg: `Updated rounds for tournament: ${tournament.label}`,
      data: { rounds },
    });

    return res.status(200).json({ rounds });
  } catch (error: any) {
    Profiling.error({
      source: 'DATA_PROVIDER_V2_TOURNAMENT_ROUNDS_update',
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

const API_TOURNAMENT_ROUNDS_V2 = {
  create,
  update,
};

export default API_TOURNAMENT_ROUNDS_V2;
