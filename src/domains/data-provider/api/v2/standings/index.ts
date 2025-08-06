import { BaseScraper } from '@/domains/data-provider/providers/playwright/base-scraper';
import Profiling from '@/services/profiling';
import { Response } from 'express';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { StandingsRequest } from '@/domains/data-provider/api/v2/standings/typing';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import { StandingsDataProviderService } from '@/domains/data-provider/services/standings';
import { randomUUID } from 'crypto';

const create = async (req: StandingsRequest, res: Response) => {
  const requestId = randomUUID();
  let scraper: BaseScraper | null = null;
  try {
    Profiling.log({
      msg: `[REQUEST START] Standings creation request received`,
      data: { 
        requestId,
        tournamentId: req.body.tournamentId
      },
      source: 'DATA_PROVIDER_V2_STANDINGS_create',
    });

    if (!req.body.tournamentId) {
      Profiling.error({
        source: 'DATA_PROVIDER_V2_STANDINGS_create',
        error: new Error('Tournament ID is required'),
      });
      return res.status(400).send({ error: 'Tournament ID is required' });
    }

    const tournament = await SERVICES_TOURNAMENT.getTournament(req.body.tournamentId);
    if (!tournament) {
      Profiling.error({
        source: 'DATA_PROVIDER_V2_STANDINGS_create',
        error: new Error('Tournament not found'),
      });
      return res.status(400).json({
        error: 'Tournament not found',
        message: 'Tournament not found',
      });
    }

    // Check if tournament supports standings
    if (tournament.mode === 'knockout-only') {
      Profiling.log({
        msg: `[REQUEST REJECTED] Standings not supported for knockout-only tournament`,
        data: { 
          requestId, 
          tournamentLabel: tournament.label, 
          tournamentId: tournament.id,
          tournamentMode: tournament.mode
        },
        source: 'DATA_PROVIDER_V2_STANDINGS_create',
      });
      return res.status(422).json({
        error: 'Standings not supported',
        message: 'No standings available for knockout-only tournaments',
        tournamentMode: tournament.mode,
        supportedOperations: ['teams', 'matches']
      });
    }

    Profiling.log({
      msg: `[SCRAPER START] Scraper initialized for standings creation`,
      data: { requestId, tournamentLabel: tournament.label, tournamentId: tournament.id },
      source: 'DATA_PROVIDER_V2_STANDINGS_create',
    });

    scraper = await BaseScraper.createInstance();
    const dataProviderService = new StandingsDataProviderService(scraper, requestId);

    const standings = await dataProviderService.init(tournament);

    if (!standings) {
      Profiling.error({
        source: 'DATA_PROVIDER_V2_STANDINGS_create',
        error: new Error('Failed to create standings'),
      });
      return res.status(400).json({
        error: 'Failed to create standings',
        message: 'Standings creation failed',
      });
    }

    Profiling.log({
      msg: `[SCRAPER STOP] Standings creation completed successfully`,
      data: { 
        requestId, 
        tournamentLabel: tournament.label, 
        standingsCount: Array.isArray(standings) ? standings.length : 'unknown' 
      },
      source: 'DATA_PROVIDER_V2_STANDINGS_create',
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
      Profiling.log({
        msg: '[CLEANUP] Playwright resources cleaned up successfully',
        data: { requestId },
        source: 'DATA_PROVIDER_V2_STANDINGS_create',
      });
    }
  }
};

const update = async (req: StandingsRequest, res: Response) => {
  const requestId = randomUUID();
  let scraper: BaseScraper | null = null;
  try {
    Profiling.log({
      msg: `[REQUEST START] Standings update request received`,
      data: { 
        requestId,
        tournamentId: req.body.tournamentId
      },
      source: 'DATA_PROVIDER_V2_STANDINGS_update',
    });

    if (!req.body.tournamentId) {
      Profiling.error({
        source: 'DATA_PROVIDER_V2_STANDINGS_update',
        error: new Error('Tournament ID is required'),
      });
      return res.status(400).send({ error: 'Tournament ID is required' });
    }

    const tournament = await SERVICES_TOURNAMENT.getTournament(req.body.tournamentId);
    if (!tournament) {
      Profiling.error({
        source: 'DATA_PROVIDER_V2_STANDINGS_update',
        error: new Error('Tournament not found'),
      });
      return res.status(400).json({
        error: 'Tournament not found',
        message: 'Tournament not found',
      });
    }

    // Check if tournament supports standings
    if (tournament.mode === 'knockout-only') {
      Profiling.log({
        msg: `[REQUEST REJECTED] Standings not supported for knockout-only tournament`,
        data: { 
          requestId, 
          tournamentLabel: tournament.label, 
          tournamentId: tournament.id,
          tournamentMode: tournament.mode
        },
        source: 'DATA_PROVIDER_V2_STANDINGS_update',
      });
      return res.status(422).json({
        error: 'Standings not supported',
        message: 'No standings available for knockout-only tournaments',
        tournamentMode: tournament.mode,
        supportedOperations: ['teams', 'matches']
      });
    }

    Profiling.log({
      msg: `[SCRAPER START] Scraper initialized for standings update`,
      data: { requestId, tournamentLabel: tournament.label, tournamentId: tournament.id },
      source: 'DATA_PROVIDER_V2_STANDINGS_update',
    });

    scraper = await BaseScraper.createInstance();
    const dataProviderService = new StandingsDataProviderService(scraper, requestId);

    const standings = await dataProviderService.updateTournament(tournament);

    if (!standings) {
      Profiling.error({
        source: 'DATA_PROVIDER_V2_STANDINGS_update',
        error: new Error('Failed to update standings'),
      });
      return res.status(400).json({
        error: 'Failed to update standings',
        message: 'Standings update failed',
      });
    }

    Profiling.log({
      msg: `[SCRAPER STOP] Standings update completed successfully`,
      data: { 
        requestId, 
        tournamentLabel: tournament.label, 
        standingsCount: Array.isArray(standings) ? standings.length : 'unknown' 
      },
      source: 'DATA_PROVIDER_V2_STANDINGS_update',
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
      Profiling.log({
        msg: '[CLEANUP] Playwright resources cleaned up successfully',
        data: { requestId },
        source: 'DATA_PROVIDER_V2_STANDINGS_update',
      });
    }
  }
};

const API_STANDINGS = {
  create,
  update,
};

export default API_STANDINGS;
