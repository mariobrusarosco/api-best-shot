import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { Response } from 'express';

const createTeams = async (req: any, res: Response) => {
  try {
    return res.status(200).send([]);
  } catch (error: any) {
    console.error('[ERROR] - [API_Matches] - CREATE MATCHES', error);

    handleInternalServerErrorResponse(res, error);
  }
};

const updateTeams = async (req: any, res: Response) => {
  try {
    return res.status(200).send([]);
  } catch (error: any) {
    console.error('[ERROR] - [API_Matches] - UPDATE MATCHES', error);

    handleInternalServerErrorResponse(res, error);
  }
};

export const API_Matches = {
  createTeams,
  updateTeams,
};
