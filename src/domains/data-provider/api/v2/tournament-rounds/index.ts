import { RoundsDataProviderService } from '@/domains/data-provider/services/rounds';
import { Response } from 'express';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { TournamentRoundRequest } from './typing';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import { BaseScraper } from '@/domains/data-provider/providers/playwright/base-scraper';
import Profiling from '@/services/profiling';
import { randomUUID } from 'crypto';

const create = async (req: TournamentRoundRequest, res: Response) => {
  const requestId = randomUUID();
  let scraper: BaseScraper | null = null;
  try {
    Profiling.log({
      msg: `[REQUEST START] Tournament rounds creation request received`,
      data: {
        requestId,
        tournamentId: req.body.tournamentId,
      },
      source: 'DATA_PROVIDER_V2_TOURNAMENT_ROUNDS_create',
    });

    if (!req.body.tournamentId) {
      Profiling.error({
        source: 'DATA_PROVIDER_V2_TOURNAMENT_ROUNDS_create',
        error: new Error('Tournament ID is required'),
        data: { requestId, operation: 'input_validation' },
      });
      return res.status(400).send({ error: 'Tournament ID is required' });
    }

    const tournament = await SERVICES_TOURNAMENT.getTournament(req.body.tournamentId);

    Profiling.log({
      msg: `[SCRAPER START] Scraper initialized for rounds creation`,
      data: { requestId, tournamentLabel: tournament.label, tournamentId: tournament.id },
      source: 'DATA_PROVIDER_V2_TOURNAMENT_ROUNDS_create',
    });

    scraper = await BaseScraper.createInstance();
    const dataProviderService = new RoundsDataProviderService(scraper, requestId);

    const rounds = await dataProviderService.init({
      tournamentId: tournament.id,
      baseUrl: tournament.baseUrl,
      label: tournament.label,
      provider: tournament.provider,
    });

    Profiling.log({
      msg: `[SCRAPER STOP] Tournament rounds creation completed successfully`,
      data: { requestId, tournamentLabel: tournament.label, roundsCount: rounds.length },
      source: 'DATA_PROVIDER_V2_TOURNAMENT_ROUNDS_create',
    });

    return res.status(200).send(rounds);
  } catch (error: unknown) {
    Profiling.error({
      source: 'DATA_PROVIDER_V2_TOURNAMENT_ROUNDS_create',
      error,
      data: { requestId, operation: 'rounds_creation' },
    });
    handleInternalServerErrorResponse(res, error);
  } finally {
    // CRITICAL: Clean up Playwright resources to prevent memory leaks
    if (scraper) {
      await scraper.close();
      Profiling.log({
        msg: '[CLEANUP] Playwright resources cleaned up successfully',
        data: { requestId },
        source: 'DATA_PROVIDER_V2_TOURNAMENT_ROUNDS_create',
      });
    }
  }
};

const update = async (req: TournamentRoundRequest, res: Response) => {
  const requestId = randomUUID();
  let scraper: BaseScraper | null = null;
  try {
    Profiling.log({
      msg: `[REQUEST START] Tournament rounds update request received`,
      data: {
        requestId,
        tournamentId: req.body.tournamentId,
      },
      source: 'DATA_PROVIDER_V2_TOURNAMENT_ROUNDS_update',
    });

    if (!req.body.tournamentId) {
      Profiling.error({
        source: 'DATA_PROVIDER_V2_TOURNAMENT_ROUNDS_update',
        error: new Error('Tournament ID is required'),
        data: { requestId, operation: 'input_validation' },
      });
      return res.status(400).send({ error: 'Tournament ID is required' });
    }

    const tournament = await SERVICES_TOURNAMENT.getTournament(req.body.tournamentId);

    Profiling.log({
      msg: `[SCRAPER START] Scraper initialized for rounds update`,
      data: { requestId, tournamentLabel: tournament.label, tournamentId: tournament.id },
      source: 'DATA_PROVIDER_V2_TOURNAMENT_ROUNDS_update',
    });

    scraper = await BaseScraper.createInstance();
    const dataProviderService = new RoundsDataProviderService(scraper, requestId);

    const rounds = await dataProviderService.update({
      tournamentId: tournament.id,
      baseUrl: tournament.baseUrl,
      label: tournament.label,
      provider: tournament.provider,
    });

    Profiling.log({
      msg: `[SCRAPER STOP] Tournament rounds update completed successfully`,
      data: {
        requestId,
        tournamentLabel: tournament.label,
        roundsCount: (rounds as unknown[]).length,
      },
      source: 'DATA_PROVIDER_V2_TOURNAMENT_ROUNDS_update',
    });

    return res.status(200).json({ rounds });
  } catch (error: unknown) {
    Profiling.error({
      source: 'DATA_PROVIDER_V2_TOURNAMENT_ROUNDS_update',
      error,
      data: { requestId, operation: 'rounds_update' },
    });
    return handleInternalServerErrorResponse(res, error);
  } finally {
    // CRITICAL: Clean up Playwright resources to prevent memory leaks
    if (scraper) {
      await scraper.close();
      Profiling.log({
        msg: '[CLEANUP] Playwright resources cleaned up successfully',
        data: { requestId },
        source: 'DATA_PROVIDER_V2_TOURNAMENT_ROUNDS_update',
      });
    }
  }
};

const API_TOURNAMENT_ROUNDS_V2 = {
  create,
  update,
};

export default API_TOURNAMENT_ROUNDS_V2;
