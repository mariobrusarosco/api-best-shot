import { TeamsRequest } from './typing';
import { TeamsService } from '@/domains/data-provider/services/teams';
import { BaseScraper } from '@/domains/data-provider/providers/playwright/base-scraper';
import Profiling from '@/services/profiling';
import { Response } from 'express';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';

const create = async (req: TeamsRequest, res: Response) => {
  try {
    const scraper = await BaseScraper.createInstance();
    const dataProviderService = new TeamsService(scraper);

    if (!req.body.tournamentId) {
      return res.status(400).send({ error: 'Tournament ID is required' });
    }

    const tournament = await SERVICES_TOURNAMENT.getTournament(req.body.tournamentId);
    const teams = await dataProviderService.init(tournament.baseUrl);

    if (!teams) {
      return res.status(400).json({
        error: 'Failed to create teams',
        message: 'Teams creation failed',
      });
    }

    Profiling.log('[DATA PROVIDER] - [V2] - [TEAMS] - CREATE SUCCESS', {
      teams,
    });

    return res.status(200).json({ teams });
  } catch (error: any) {
    Profiling.error('[DATA PROVIDER] - [V2] - [TEAMS] - CREATE FAILED', error);
    return handleInternalServerErrorResponse(res, error);
  }
};

const API_TEAMS_V2 = {
  create,
};

export default API_TEAMS_V2;
