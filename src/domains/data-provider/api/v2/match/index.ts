import { Response } from 'express';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import { SERVICES_TOURNAMENT_ROUND } from '@/domains/tournament-round/services';
import Profiling from '@/services/profiling';
import { BaseScraper } from '@/domains/data-provider/providers/playwright/base-scraper';
import { MatchesDataProviderService } from '@/domains/data-provider/services/match';
import { CreateMatchesRequest } from '@/domains/match/typing';

const create = async (req: CreateMatchesRequest, res: Response) => {
  let scraper: BaseScraper | null = null;
  try {
    scraper = await BaseScraper.createInstance();
    const matchesDataProviderService = new MatchesDataProviderService(scraper);

    if (!req.body.tournamentId) {
      return res.status(400).send({ error: 'Tournament ID is required' });
    }

    const tournament = await SERVICES_TOURNAMENT.getTournament(req.body.tournamentId);
    const rounds = await SERVICES_TOURNAMENT_ROUND.getAllRounds(tournament);
    const matches = await matchesDataProviderService.init(rounds, tournament);

    if (!matches) {
      return res.status(400).json({
        error: 'Failed to create matches',
        message: 'Matches creation failed',
      });
    }

    Profiling.log({
      msg: `Created matches for tournament: ${tournament.label}`,
      data: { matches },
    });

    return res.status(200).json({ matches });
  } catch (error: any) {
    Profiling.error({
      source: 'DATA_PROVIDER_V2_MATCHES_create',
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

const API_MATCH_V2 = {
  create,
};

export default API_MATCH_V2;
