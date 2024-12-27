import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { Response } from 'express';
import { StandingsController } from '../../controllers/standings';
import { StandingsRequest } from './typing';

const createStandings = async (req: StandingsRequest, res: Response) => {
  try {
    const tournamentId = req.params.tournamentId;

    await StandingsController.create(tournamentId);

    return res.status(200).send([]);
  } catch (error: any) {
    console.error('[ERROR] - [API_Standings] - CREATE STANDING. REASON IS:', error);

    handleInternalServerErrorResponse(res, error);
  }
};

const updateStandings = async (req: any, res: Response) => {
  try {
    const tournamentId = req.params.tournamentId;

    const test = await StandingsController.update(tournamentId);

    return res.status(200).send(test);
  } catch (error: any) {
    console.error('[ERROR] - [API_Standings] - UPDATE STANDING. REASON IS:', error);

    handleInternalServerErrorResponse(res, error);
  }
};

export const API_Standings = {
  createStandings,
  updateStandings,
};
