import { Response } from 'express';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import { SERVICES_TOURNAMENT_ROUND } from '@/domains/tournament-round/services';
import Profiling from '@/services/profiling';
import { BaseScraper } from '@/domains/data-provider/providers/playwright/base-scraper';
import { MatchesDataProviderService } from '@/domains/data-provider/services/match';
import {
  CreateMatchesRequest,
  UpdateMatchesForRoundRequest,
} from '@/domains/match/typing';
import { randomUUID } from 'crypto';

const create = async (req: CreateMatchesRequest, res: Response) => {
  const requestId = randomUUID();
  let scraper: BaseScraper | null = null;
  try {
    Profiling.log({
      msg: `[REQUEST START] Matches creation request received`,
      data: {
        requestId,
        tournamentId: req.body.tournamentId,
      },
      source: 'DATA_PROVIDER_V2_MATCHES_create',
    });

    if (!req.body.tournamentId) {
      Profiling.error({
        source: 'DATA_PROVIDER_V2_MATCHES_create',
        error: new Error('Tournament ID is required'),
      });
      return res.status(400).send({ error: 'Tournament ID is required' });
    }

    const tournament = await SERVICES_TOURNAMENT.getTournament(req.body.tournamentId);
    if (!tournament) {
      Profiling.error({
        source: 'DATA_PROVIDER_V2_MATCHES_create',
        error: new Error('Tournament not found'),
      });
      return res.status(400).json({
        error: 'Tournament not found',
        message: 'Tournament not found',
      });
    }

    Profiling.log({
      msg: `[SCRAPER START] Scraper initialized for matches creation`,
      data: { requestId, tournamentLabel: tournament.label, tournamentId: tournament.id },
      source: 'DATA_PROVIDER_V2_MATCHES_create',
    });

    scraper = await BaseScraper.createInstance();
    const matchesDataProviderService = new MatchesDataProviderService(scraper, requestId);

    const rounds = await SERVICES_TOURNAMENT_ROUND.getAllRounds(tournament.id);

    const matches = await matchesDataProviderService.init(rounds, tournament);

    if (!matches) {
      Profiling.error({
        source: 'DATA_PROVIDER_V2_MATCHES_create',
        error: new Error('Failed to create matches'),
      });
      return res.status(400).json({
        error: 'Failed to create matches',
        message: 'Matches creation failed',
      });
    }

    Profiling.log({
      msg: `[SCRAPER STOP] Matches creation completed successfully`,
      data: {
        requestId,
        tournamentLabel: tournament.label,
        matchesCount: Array.isArray(matches) ? matches.length : 'unknown',
      },
      source: 'DATA_PROVIDER_V2_MATCHES_create',
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
      Profiling.log({
        msg: '[CLEANUP] Playwright resources cleaned up successfully',
        data: { requestId },
        source: 'DATA_PROVIDER_V2_MATCHES_create',
      });
    }
  }
};

const updateMatchesForRound = async (
  req: UpdateMatchesForRoundRequest,
  res: Response
) => {
  const requestId = randomUUID();
  let scraper: BaseScraper | null = null;
  try {
    Profiling.log({
      msg: `[REQUEST START] Matches update request received for round`,
      data: {
        requestId,
        tournamentId: req.body.tournamentId,
        roundSlug: req.body.roundSlug,
      },
      source: 'DATA_PROVIDER_V2_MATCHES_updateMatchesForRound',
    });

    if (!req.body.tournamentId) {
      Profiling.error({
        source: 'DATA_PROVIDER_V2_MATCHES_updateMatchesForRound',
        error: new Error('Tournament ID is required'),
      });
      return res.status(400).send({ error: 'Tournament ID is required' });
    }

    if (!req.body.roundSlug) {
      Profiling.error({
        source: 'DATA_PROVIDER_V2_MATCHES_updateMatchesForRound',
        error: new Error('Round slug is required'),
      });
      return res.status(400).send({ error: 'Round slug is required' });
    }

    const tournament = await SERVICES_TOURNAMENT.getTournament(req.body.tournamentId);
    if (!tournament) {
      Profiling.error({
        source: 'DATA_PROVIDER_V2_MATCHES_updateMatchesForRound',
        error: new Error('Tournament not found'),
      });
      return res.status(400).json({
        error: 'Tournament not found',
        message: 'Tournament not found',
      });
    }

    const round = await SERVICES_TOURNAMENT_ROUND.getRound(
      tournament.id,
      req.body.roundSlug
    );
    if (!round) {
      Profiling.error({
        source: 'DATA_PROVIDER_V2_MATCHES_updateMatchesForRound',
        error: new Error('Round not found'),
      });
      return res.status(400).json({
        error: 'Round not found',
        message: 'Round not found',
      });
    }

    Profiling.log({
      msg: `[SCRAPER START] Scraper initialized for matches update`,
      data: {
        requestId,
        tournamentLabel: tournament.label,
        tournamentId: tournament.id,
        roundSlug: round.slug,
      },
      source: 'DATA_PROVIDER_V2_MATCHES_updateMatchesForRound',
    });

    scraper = await BaseScraper.createInstance();
    const matchesDataProviderService = new MatchesDataProviderService(scraper, requestId);

    const matches = await matchesDataProviderService.updateRound(round);

    if (matches === null || matches === undefined) {
      Profiling.error({
        source: 'DATA_PROVIDER_V2_MATCHES_updateMatchesForRound',
        error: new Error('Failed to update matches for round'),
      });
      return res.status(400).json({
        error: 'Failed to update matches for round',
        message: 'Matches update failed',
      });
    }

    Profiling.log({
      msg: `[SCRAPER STOP] Matches update completed successfully`,
      data: {
        requestId,
        tournamentLabel: tournament.label,
        roundSlug: round.slug,
        matchesUpdated: matches,
      },
      source: 'DATA_PROVIDER_V2_MATCHES_updateMatchesForRound',
    });

    return res.status(200).json({ matches, round: round.slug });
  } catch (error: any) {
    Profiling.error({
      source: 'DATA_PROVIDER_V2_MATCHES_updateMatchesForRound',
      error,
    });
    return handleInternalServerErrorResponse(res, error);
  } finally {
    if (scraper) {
      await scraper.close();
      Profiling.log({
        msg: '[CLEANUP] Playwright resources cleaned up successfully',
        data: { requestId },
        source: 'DATA_PROVIDER_V2_MATCHES_updateMatchesForRound',
      });
    }
  }
};

const API_MATCH_V2 = {
  create,
  updateMatchesForRound,
};

export default API_MATCH_V2;
