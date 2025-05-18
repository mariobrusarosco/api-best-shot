import { RoundDataProviderService } from '@/domains/data-provider/services/rounds';
import { Response } from 'express';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { TournamentRoundRequest } from './typing';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import { BaseScraper } from '@/domains/data-provider/providers/playwright/base-scraper';

const create = async (req: TournamentRoundRequest, res: Response) => {
  try {
    const scraper = await BaseScraper.createInstance();
    const dataProviderService = new RoundDataProviderService(scraper);

    if (!req.body.tournamentId) {
      return res.status(400).send({ error: 'Tournament ID is required' });
    }

    const tournament = await SERVICES_TOURNAMENT.getTournament(req.body.tournamentId);
    const rounds = await dataProviderService.init(tournament.id, tournament.baseUrl);
    return res.status(200).send(rounds);
  } catch (error: any) {
    handleInternalServerErrorResponse(res, error);
  }
};

const API_TOURNAMENT_ROUNDS_V2 = {
  create,
};

export default API_TOURNAMENT_ROUNDS_V2;
