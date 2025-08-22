import { MatchesForRoundRequest, MatchesRequest } from '@/domains/data-provider/api/v1/matches/typing';
import { MatchesController } from '@/domains/data-provider/controllers/matches';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { Profiling } from '@/services/profiling';
import { Response } from 'express';

const createMatches = async (req: MatchesRequest, res: Response) => {
  const tournamentId = req.params.tournamentId;

  try {
    const matches = await MatchesController.create(tournamentId);

    Profiling.log({
      msg: `[LOG] - [DATA PROVIDER] - [CREATE MATCHES FOR ENTIRE TOURNAMENT] - [${tournamentId}]`,
      data: matches,
      source: 'DATA_PROVIDER_API_MATCHES_getMatches',
    });

    return res.status(200).send(matches);
  } catch (error: unknown) {
    Profiling.error({
      source: 'DATA_PROVIDER_API_MATCHES_getMatches',
      error: error as Error,
    });

    handleInternalServerErrorResponse(res, error);
  }
};

const updateMatches = async (req: MatchesRequest, res: Response) => {
  const tournamentId = req.params.tournamentId;
  try {
    const matches = await MatchesController.update(tournamentId);
    Profiling.log({
      msg: `[LOG] - [DATA PROVIDER] - [UPDATE MATCHES FOR ENTIRE TOURNAMENT] - [${tournamentId}]`,
      data: matches,
      source: 'DATA_PROVIDER_API_MATCHES_getMatches',
    });

    return res.status(200).send(matches);
  } catch (error: unknown) {
    Profiling.error({
      source: 'DATA_PROVIDER_API_MATCHES_getMatches',
      error: error as Error,
    });

    handleInternalServerErrorResponse(res, error);
  }
};

const updateMatchesForRound = async (req: MatchesForRoundRequest, res: Response) => {
  const tournamentId = req.params.tournamentId;
  const roundSlug = req.params.roundSlug;
  try {
    const matches = await MatchesController.updateRound(tournamentId, roundSlug);

    Profiling.log({
      msg: `[LOG] - [DATA PROVIDER] - [MATCHES UPDATE FOR ROUND] - [${tournamentId}] - [${roundSlug}]`,
      data: matches,
      source: 'DATA_PROVIDER_API_MATCHES_getMatches',
    });

    return res.status(200).send(matches);
  } catch (error: unknown) {
    Profiling.error({
      source: 'DATA_PROVIDER_API_MATCHES_getMatches',
      error: error as Error,
    });

    handleInternalServerErrorResponse(res, error);
  }
};

export const API_MATCHES = {
  createMatches,
  updateMatchesForRound,
  updateMatches,
};
