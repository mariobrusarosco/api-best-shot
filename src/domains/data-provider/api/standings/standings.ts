import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { Response } from 'express';
import { StandingsController } from '../../controllers/standings';
import { StandingsRequest } from './typing';

const createStandings = async (req: StandingsRequest, res: Response) => {
  try {
    const tournamentId = req.params.tournamentId;

    const standings = await StandingsController.create(tournamentId);

    return res.status(200).send(standings);
  } catch (error: any) {
    console.error('[ERROR] - [API_Standings] - CREATE STANDINGS. REASON IS:', error);

    handleInternalServerErrorResponse(res, error);
  }
};

const updateStandings = async (req: any, res: Response) => {
  try {
    const tournamentId = req.params.tournamentId;

    const standings = await StandingsController.update(tournamentId);

    return res.status(200).send(standings);
  } catch (error: any) {
    console.error('[ERROR] - [API_Standings] - UPDATE STANDINGS. REASON IS:', error);

    handleInternalServerErrorResponse(res, error);
  }
};

export const API_Standings = {
  createStandings,
  updateStandings,
};
