import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { Response } from 'express';

const createTeams = async (req: any, res: Response) => {
  try {
    return res.status(200).send([]);
  } catch (error: any) {
    console.error('[ERROR] - [API_Teams] - CREATE TEAMS', error);

    handleInternalServerErrorResponse(res, error);
  }
};

const updateTeams = async (req: any, res: Response) => {
  try {
    return res.status(200).send([]);
  } catch (error: any) {
    console.error('[ERROR] - [API_Teams] - UPDATE TEAMS', error);

    handleInternalServerErrorResponse(res, error);
  }
};

export const API_Teams = {
  createTeams,
  updateTeams,
};
