import { TournamentRoundController } from '@/domains/data-provider/controllers/tournament-rounds/tournament-round';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import Profiling from '@/services/profiling';
import { Response } from 'express';
import { TournamentRoundRequest } from './typing';

const createRounds = async (req: TournamentRoundRequest, res: Response) => {
  const { tournamentId } = req.params;
  try {
    const rounds = await TournamentRoundController.create(tournamentId);
    Profiling.log(
      `[LOG] - [DATA PROVIDER] - [CREATE ROUNDS FOR TOURNAMENT] - [${tournamentId}]`,
      rounds
    );
    return res.status(200).send(rounds);
  } catch (error: any) {
    Profiling.error(
      `[ERROR] - [DATA PROVIDER] - [CREATE ROUNDS FOR  TOURNAMENT] - [${tournamentId}]`,
      error
    );

    handleInternalServerErrorResponse(res, error);
  }
};

const updateRounds = async (req: TournamentRoundRequest, res: Response) => {
  const { tournamentId } = req.params;
  try {
    const rounds = await TournamentRoundController.update(tournamentId);
    Profiling.log(
      `[LOG] - [DATA PROVIDER] - [UPDATE ROUNDS FOR TOURNAMENT] - [${tournamentId}]`,
      rounds
    );
    return res.status(200).send(rounds);
  } catch (error: any) {
    Profiling.error(
      `[ERROR] - [DATA PROVIDER] - [UPDATE STANDINGS FOR  TOURNAMENT] - [${tournamentId}]`,
      error
    );

    handleInternalServerErrorResponse(res, error);
  }
};

const knockoutRoundsUpdate = async (req: TournamentRoundRequest, res: Response) => {
  const { tournamentId } = req.params;
  try {
    const rounds = await TournamentRoundController.knockoutRoundsUpdate(tournamentId);
    Profiling.log(
      `[LOG] - [DATA PROVIDER] - [UPDATE KNOCKOUT ROUNDS FOR TOURNAMENT] - [${tournamentId}]`,
      rounds
    );
    return res.status(200).send(rounds);
  } catch (error: any) {
    Profiling.error(
      `[ERROR] - [DATA PROVIDER] - [UPDATE KNOCKOUT ROUNDS FOR  TOURNAMENT] - [${tournamentId}]`,
      Error
    );

    handleInternalServerErrorResponse(res, error);
  }
};

export const API_TournamentRounds = {
  createRounds,
  updateRounds,
  knockoutRoundsUpdate,
};
