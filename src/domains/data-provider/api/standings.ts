import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { Response } from 'express';

const createStandings = async (req: any, res: Response) => {
  try {
    return res.status(200).send([]);
  } catch (error: any) {
    console.error('[ERROR] - [API_Standings] - CREATE STANDINGS', error);

    handleInternalServerErrorResponse(res, error);
  }
};

const updateStandings = async (req: any, res: Response) => {
  try {
    return res.status(200).send([]);
  } catch (error: any) {
    console.error('[ERROR] - [API_Standings] - UPDATE STANDINGS', error);

    handleInternalServerErrorResponse(res, error);
  }
};

export const API_Standings = {
  createStandings,
  updateStandings,
};
