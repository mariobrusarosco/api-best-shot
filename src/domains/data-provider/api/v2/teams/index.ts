import { TeamsRequest } from './typing';
import { TeamsService } from '@/domains/data-provider/services/teams';
import { BaseScraper } from '@/domains/data-provider/providers/playwright/base-scraper';
import Profiling from '@/services/profiling';
import { Response } from 'express';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import { ErrorMapper } from '@/domains/tournament/error-handling/mapper';

const create = async (req: TeamsRequest, res: Response) => {
  try {
    const scraper = await BaseScraper.createInstance();
    const teamService = new TeamsService(scraper);

    if (!req.body.tournamentId) {
      return res.status(400).send({ error: 'Tournament ID is required' });
    }

    const tournament = await SERVICES_TOURNAMENT.getTournament(req.body.tournamentId);
    if (!tournament) {
      return res.status(400).json({
        error: ErrorMapper.NOT_FOUND,
        message: ErrorMapper.NOT_FOUND.user,
      });
    }
    const teams = await teamService.init(tournament);

    if (!teams) {
      return res.status(400).json({
        error: 'Failed to create teams',
        message: 'Teams creation failed',
      });
    }

    Profiling.log({
      msg: '[DATA PROVIDER] - [V2] - [TEAMS] - CREATE SUCCESS',
      data: { teams },
      color: 'FgGreen',
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
