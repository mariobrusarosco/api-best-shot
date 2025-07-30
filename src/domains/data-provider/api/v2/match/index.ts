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

const create = async (req: CreateMatchesRequest, res: Response) => {
  let scraper: BaseScraper | null = null;
  try {
    scraper = await BaseScraper.createInstance();
    const matchesDataProviderService = new MatchesDataProviderService(scraper);

    if (!req.body.tournamentId) {
      return res.status(400).send({ error: 'Tournament ID is required' });
    }

    const tournament = await SERVICES_TOURNAMENT.getTournament(req.body.tournamentId);
    Profiling.log({ msg: 'Found on DB tournament:', data: tournament });

    Profiling.log({ msg: 'getting rounds for tournament ', data: tournament.id });
    const rounds = await SERVICES_TOURNAMENT_ROUND.getAllRounds(tournament.id);
    Profiling.log({
      msg: '[DEBUG] Rounds retrieved:',
      data: {
        tournamentId: tournament.id,
        roundsCount: rounds.length,
        rounds: rounds.map((r: any) => ({ id: r.id, slug: r.slug, order: r.order })),
      },
    });
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

const updateMatchesForRound = async (
  req: UpdateMatchesForRoundRequest,
  res: Response
) => {
  let scraper: BaseScraper | null = null;
  try {
    Profiling.log({
      msg: `[1] Starting to update matches for round ${req.body.roundSlug} in tournament ${req.body.tournamentId}`,
    });
    scraper = await BaseScraper.createInstance();
    const matchesDataProviderService = new MatchesDataProviderService(scraper);

    Profiling.log({
      msg: '[2] Matches Data Provider service created',
      data: req.body.tournamentId,
    });
    if (!req.body.tournamentId) {
      return res.status(400).send({ error: 'Tournament ID is required' });
    }

    if (!req.body.roundSlug) {
      return res.status(400).send({ error: 'Round slug is required' });
    }

    const tournament = await SERVICES_TOURNAMENT.getTournament(req.body.tournamentId);
    Profiling.log({
      msg: `[3] Tournament found on DB: ${tournament.label}`,
      data: tournament,
    });

    Profiling.log({
      msg: '[4] getting specific round for tournament',
      data: {
        tournamentId: tournament.id,
        roundSlug: req.body.roundSlug,
      },
    });
    const round = await SERVICES_TOURNAMENT_ROUND.getRound(
      tournament.id,
      req.body.roundSlug
    );
    Profiling.log({
      msg: `[5] Round retrieved: ${round.slug}. Fetching on url: ${round.providerUrl}`,
      data: {
        tournamentId: tournament.id,
        roundSlug: req.body.roundSlug,
        round: { id: round.id, slug: round.slug, order: round.order },
      },
    });

    const matches = await matchesDataProviderService.updateRound(round);

    if (!matches) {
      return res.status(400).json({
        error: 'Failed to update matches for round',
        message: 'Matches update failed',
      });
    }

    Profiling.log({
      msg: `[7] Finished updating matches for round ${round.slug} in tournament: ${tournament.label}`,
      data: { matches, roundSlug: req.body.roundSlug },
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
    }
  }
};

const API_MATCH_V2 = {
  create,
  updateMatchesForRound,
};

export default API_MATCH_V2;
