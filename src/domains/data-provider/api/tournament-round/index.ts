import { TournamentRoundController } from '@/domains/data-provider/controllers/tournament-rounds/tournament-round';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { Response } from 'express';
import { TournamentRoundRequest } from './typing';

const createRounds = async (req: TournamentRoundRequest, res: Response) => {
  try {
    const { tournamentId } = req.params;

    const rounds = await TournamentRoundController.create(tournamentId);

    return res.status(200).send(rounds);
  } catch (error: any) {
    console.error('[ERROR] - [API_TournamentRounds] - CREATE TOURNAMENT ROUNDS', error);

    handleInternalServerErrorResponse(res, error);
  }
};

const updateRounds = async (req: TournamentRoundRequest, res: Response) => {
  try {
    const { tournamentId } = req.params;

    const rounds = await TournamentRoundController.update(tournamentId);

    return res.status(200).send(rounds);
  } catch (error: any) {
    console.error('[ERROR] - [API_TournamentRounds] - TOURNAMENT ROUNDS UPDATE', error);

    handleInternalServerErrorResponse(res, error);
  }
};

const knockoutRoundsUpdate = async (req: TournamentRoundRequest, res: Response) => {
  try {
    const { tournamentId } = req.params;

    const rounds = await TournamentRoundController.knockoutRoundsUpdate(tournamentId);

    return res.status(200).send(rounds);
  } catch (error: any) {
    console.error('[ERROR] - [API_TournamentRounds] - KNOCKOUT ROUNDS UPDATE', error);

    handleInternalServerErrorResponse(res, error);
  }
};

export const API_TournamentRounds = {
  createRounds,
  updateRounds,
  knockoutRoundsUpdate,
};
