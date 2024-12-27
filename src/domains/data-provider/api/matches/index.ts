import { TeamsRequest } from '@/domains/data-provider/api/matches/typing';
import { MatchesController } from '@/domains/data-provider/controllers/matches';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { Response } from 'express';

const createMatches = async (req: TeamsRequest, res: Response) => {
  try {
    const tournamentId = req.params.tournamentId;

    const matches = await MatchesController.create(tournamentId);

    return res.status(200).send(matches);
  } catch (error: any) {
    console.error('[ERROR] - [API_Matches] - CREATE MATCHES', error);

    handleInternalServerErrorResponse(res, error);
  }
};

const updateMatchOfRound = async (req: any, res: Response) => {
  try {
    const tournamentId = req.params.tournamentId;

    return res.status(200).send([]);
  } catch (error: any) {
    console.error('[ERROR] - [API_Matches] - UPDATE MATCHES OF A ROUND', error);

    handleInternalServerErrorResponse(res, error);
  }
};

export const API_Matches = {
  createMatches,
  updateMatchOfRound,
};
