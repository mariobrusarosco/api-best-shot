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
      color: 'FgGreen'
    });

    return res.status(200).send(standings);
  } catch (error: any) {
    Profiling.error(
      `[ERROR] - [DATA PROVIDER] - [CREATE STANDINGS FOR  TOURNAMENT] - [${tournamentId}]`,
      error
    );

    handleInternalServerErrorResponse(res, error);
  }
};

const updateStandings = async (req: any, res: Response) => {
  const tournamentId = req.params.tournamentId;
  try {
    const standings = await StandingsController.update(tournamentId);
    Profiling.log({
      msg: `[LOG] - [DATA PROVIDER] - [UPDATE STANDINGS FOR TOURNAMENT] - [${tournamentId}]`,
      data: standings,
      color: 'FgGreen'
    });

    return res.status(200).send(standings);
  } catch (error: any) {
    Profiling.error(
      `[ERROR] - [DATA PROVIDER] - [UPDATE STANDINGS FOR  TOURNAMENT] - [${tournamentId}]`,
      error
    );

    handleInternalServerErrorResponse(res, error);
  }
};

export const API_STANDINGS = {
  createStandings,
  updateStandings,
};
