import { Response } from 'express';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import { SERVICES_TOURNAMENT_ROUND } from '@/domains/tournament-round/services';
import Profiling from '@/services/profiling';
import { BaseScraper } from '@/domains/data-provider/providers/playwright/base-scraper';
import { MatchesService } from '@/domains/data-provider/services/match';
import { CreateMatchesRequest } from '@/domains/match/typing';

const create = async (req: CreateMatchesRequest, res: Response) => {
  try {
    const scraper = await BaseScraper.createInstance();
    const dataProviderService = new MatchesService(scraper);

    if (!req.body.tournamentId) {
      return res.status(400).send({ error: 'Tournament ID is required' });
    }

    const tournament = await SERVICES_TOURNAMENT.getTournament(req.body.tournamentId);
    const rounds = await SERVICES_TOURNAMENT_ROUND.getAllRounds(tournament.id);
    const matches = await dataProviderService.init(rounds, tournament.id);

    if (!matches) {
      return res.status(400).json({
        error: 'Failed to create matches',
        message: 'Matches creation failed',
      });
    }

    Profiling.log({
      msg: 'CREATE SUCCESS',
      data: { matches },
      source: 'DATA_PROVIDER_V2_MATCHES_create',
    });

    return res.status(200).json({ matches });
  } catch (error: any) {
    Profiling.error({
      source: 'DATA_PROVIDER_V2_MATCHES_create',
      error,
    });
    return handleInternalServerErrorResponse(res, error);
  }
};

const API_MATCH_V2 = {
  create,
};

export default API_MATCH_V2;
