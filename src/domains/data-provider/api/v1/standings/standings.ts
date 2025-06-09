import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import Profiling from '@/services/profiling';
import { Response } from 'express';
import { StandingsController } from '../../../controllers/standings';
import { StandingsRequest } from './typing';

const createStandings = async (req: StandingsRequest, res: Response) => {
  const tournamentId = req.params.tournamentId;

  try {
    const standings = await StandingsController.create(tournamentId);

    Profiling.log({
      msg: `[LOG] - [DATA PROVIDER] - [CREATE STANDINGS FOR TOURNAMENT] - [${tournamentId}]`,
      data: standings,
      source: 'DATA_PROVIDER_API_STANDINGS_getStandings',
    });

    return res.status(200).send(standings);
  } catch (error: unknown) {
    Profiling.error({
      source: 'DATA_PROVIDER_API_STANDINGS_getStandings',
      error: error as Error,
    });

    handleInternalServerErrorResponse(res, error as Error);
  }
};

const updateStandings = async (req: StandingsRequest, res: Response) => {
  const tournamentId = req.params.tournamentId;
  try {
    const standings = await StandingsController.update(tournamentId);
    Profiling.log({
      msg: `[LOG] - [DATA PROVIDER] - [UPDATE STANDINGS FOR TOURNAMENT] - [${tournamentId}]`,
      data: standings,
      source: 'DATA_PROVIDER_API_STANDINGS_getStandings',
    });

    return res.status(200).send(standings);
  } catch (error: unknown) {
    Profiling.error({
      source: 'DATA_PROVIDER_API_STANDINGS_getStandings',
      error: error as Error,
    });

    handleInternalServerErrorResponse(res, error as Error);
  }
};

export const API_STANDINGS = {
  createStandings,
  updateStandings,
};
