import { TeamsRequest } from './typing';
import { TeamsDataProviderService } from '@/domains/data-provider/services/teams';
import { BaseScraper } from '@/domains/data-provider/providers/playwright/base-scraper';
import Profiling from '@/services/profiling';
import { Response } from 'express';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import { ErrorMapper } from '@/domains/tournament/error-handling/mapper';
import { randomUUID } from 'crypto';

const create = async (req: TeamsRequest, res: Response) => {
  const requestId = randomUUID();
  let scraper: BaseScraper | null = null;
  try {
    Profiling.log({
      msg: `[REQUEST START] Teams creation request received`,
      data: {
        requestId,
        tournamentId: req.body.tournamentId,
      },
      source: 'DATA_PROVIDER_V2_TEAMS_create',
    });

    if (!req.body.tournamentId) {
      Profiling.error({
        source: 'DATA_PROVIDER_V2_TEAMS_create',
        error: new Error('Tournament ID is required'),
      });
      return res.status(400).send({ error: 'Tournament ID is required' });
    }

    const tournament = await SERVICES_TOURNAMENT.getTournament(req.body.tournamentId);
    if (!tournament) {
      Profiling.error({
        source: 'DATA_PROVIDER_V2_TEAMS_create',
        error: new Error('Tournament not found'),
      });
      return res.status(400).json({
        error: ErrorMapper.NOT_FOUND,
        message: ErrorMapper.NOT_FOUND.user,
      });
    }

    Profiling.log({
      msg: `[SCRAPER START] Scraper initialized for teams creation`,
      data: { requestId, tournamentLabel: tournament.label, tournamentId: tournament.id },
      source: 'DATA_PROVIDER_V2_TEAMS_create',
    });

    scraper = await BaseScraper.createInstance();
    const teamService = new TeamsDataProviderService(scraper, requestId);

    const teams = await teamService.init(tournament);

    if (!teams) {
      Profiling.error({
        source: 'DATA_PROVIDER_V2_TEAMS_create',
        error: new Error('Failed to create teams'),
      });
      return res.status(400).json({
        error: 'Failed to create teams',
        message: 'Teams creation failed',
      });
    }

    Profiling.log({
      msg: `[SCRAPER STOP] Teams creation completed successfully`,
      data: { requestId, tournamentLabel: tournament.label, teamsCount: teams.length },
      source: 'DATA_PROVIDER_V2_TEAMS_create',
    });

    return res.status(200).json({ teams });
  } catch (error: any) {
    Profiling.error({
      source: 'DATA_PROVIDER_V2_TEAMS_create',
      error,
    });
    return handleInternalServerErrorResponse(res, error);
  } finally {
    // CRITICAL: Clean up Playwright resources to prevent memory leaks
    if (scraper) {
      await scraper.close();
      Profiling.log({
        msg: '[CLEANUP] Playwright resources cleaned up successfully',
        data: { requestId },
        source: 'DATA_PROVIDER_V2_TEAMS_create',
      });
    }
  }
};

const API_TEAMS_V2 = {
  create,
};

export default API_TEAMS_V2;
