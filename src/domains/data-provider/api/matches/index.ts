import {
  MatchesForRoundRequest,
  MatchesRequest,
} from '@/domains/data-provider/api/matches/typing';
import { MatchesController } from '@/domains/data-provider/controllers/matches';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import Profiling from '@/services/profiling';
import { Response } from 'express';

const createMatches = async (req: MatchesRequest, res: Response) => {
  const tournamentId = req.params.tournamentId;

  try {
    const matches = await MatchesController.create(tournamentId);

    Profiling.log(
      `[LOG] - [DATA PROVIDER] - [CREATE MATCHES FOR ENTIRE TOURNAMENT] - [${tournamentId}]`,
      matches
    );

    return res.status(200).send(matches);
  } catch (error: any) {
    Profiling.error(
      `[ERROR] - [DATA PROVIDER] - [CREATE MATCHES FOR ENTIRE TOURNAMENT] - [${tournamentId}]`,
      error
    );

    handleInternalServerErrorResponse(res, error);
  }
};

const updateMatches = async (req: MatchesRequest, res: Response) => {
  const tournamentId = req.params.tournamentId;
  try {
    const matches = await MatchesController.update(tournamentId);
    console.log(
      `[LOG] - [DATA PROVIDER] - [UPDATE MATCHES FOR ENTIRE TOURNAMENT] - [${tournamentId}]`,
      matches
    );

    return res.status(200).send(matches);
  } catch (error: any) {
    Profiling.error(
      `[ERROR] - [DATA PROVIDER] - [UPDATE MATCHES FOR ENTIRE TOURNAMENT] - [${tournamentId}]`,
      error
    );

    handleInternalServerErrorResponse(res, error);
  }
};

const updateMatchesForRound = async (req: MatchesForRoundRequest, res: Response) => {
  const tournamentId = req.params.tournamentId;
  const roundSlug = req.params.roundSlug;
  try {
    const matches = await MatchesController.updateRound(tournamentId, roundSlug);

    Profiling.log(
      `[LOG] - [DATA PROVIDER] - [MATCHES UPDATE FOR ROUND] - [${tournamentId}] - [${roundSlug}]`,
      matches
    );

    return res.status(200).send(matches);
  } catch (error: any) {
    Profiling.error(
      `[LOG] - [DATA PROVIDER] - [MATCHES UPDATE FOR ROUND] - [${tournamentId}] - [${roundSlug}]`,
      error
    );

    handleInternalServerErrorResponse(res, error);
  }
};

export const API_MATCHES = {
  createMatches,
  updateMatchesForRound,
  updateMatches,
};
