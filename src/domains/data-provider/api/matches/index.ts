import {
  MatchesForRoundRequest,
  MatchesRequest,
} from '@/domains/data-provider/api/matches/typing';
import { MatchesController } from '@/domains/data-provider/controllers/matches';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { Response } from 'express';

const createMatches = async (req: MatchesRequest, res: Response) => {
  try {
    const tournamentId = req.params.tournamentId;

    const matches = await MatchesController.create(tournamentId);

    return res.status(200).send(matches);
  } catch (error: any) {
    console.error(
      '[ERROR] - [API_Matches] - CREATING ALL MATCHES OF A TOURNAMENT',
      error
    );

    handleInternalServerErrorResponse(res, error);
  }
};

const updateMatches = async (req: MatchesRequest, res: Response) => {
  try {
    const tournamentId = req.params.tournamentId;
    console.log(
      `[LOG] - [API_Matches] - UPDATING ALL MATCHES OF A TOURNAMENT: ${tournamentId}`
    );
    const matches = await MatchesController.update(tournamentId);

    return res.status(200).send(matches);
  } catch (error: any) {
    console.error(
      '[ERROR] - [API_Matches] - UPDATING ALL MATCHES OF A TOURNAMENT',
      error
    );

    handleInternalServerErrorResponse(res, error);
  }
};

const updateMatchesForRound = async (req: MatchesForRoundRequest, res: Response) => {
  try {
    const tournamentId = req.params.tournamentId;
    const roundSlug = req.params.roundSlug;

    const matches = await MatchesController.updateRound(tournamentId, roundSlug);

    return res.status(200).send(matches);
  } catch (error: any) {
    console.error('[ERROR] - [API_Matches] - UPDATE MATCHES OF A ROUND', error);

    handleInternalServerErrorResponse(res, error);
  }
};

export const API_Matches = {
  createMatches,
  updateMatchesForRound,
  updateMatches,
};
