import { TournamentRoundController } from '@/domains/data-provider/controllers/tournament-rounds/tournament-round';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import Profiling from '@/services/profiling';
import { Response } from 'express';
import { TournamentRoundRequest } from './typing';

const createRounds = async (req: TournamentRoundRequest, res: Response) => {
  const { tournamentId } = req.params;
  try {
    const rounds = await TournamentRoundController.create(tournamentId);
    Profiling.log({
      msg: `[DATA PROVIDER] - [CREATE ROUNDS FOR TOURNAMENT] - [${tournamentId}]`,
      data: rounds,
      source: 'DATA_PROVIDER_TOURNAMENT_ROUND_createRounds',
    });
    return res.status(200).send(rounds);
  } catch (error: unknown) {
    Profiling.error({
      source: 'DATA_PROVIDER_TOURNAMENT_ROUND_createRounds',
      error: error as Error,
    });

    handleInternalServerErrorResponse(res, error);
  }
};

const updateRounds = async (req: TournamentRoundRequest, res: Response) => {
  const { tournamentId } = req.params;
  try {
    const rounds = await TournamentRoundController.update(tournamentId);
    Profiling.log({
      msg: `[DATA PROVIDER] - [UPDATE ROUNDS FOR TOURNAMENT] - [${tournamentId}]`,
      data: rounds,
      source: 'DATA_PROVIDER_TOURNAMENT_ROUND_updateRounds',
    });
    return res.status(200).send(rounds);
  } catch (error: unknown) {
    Profiling.error({
      source: 'DATA_PROVIDER_TOURNAMENT_ROUND_updateRounds',
      error: error as Error,
    });

    handleInternalServerErrorResponse(res, error);
  }
};

const knockoutRoundsUpdate = async (req: TournamentRoundRequest, res: Response) => {
  const { tournamentId } = req.params;
  try {
    const rounds = await TournamentRoundController.knockoutRoundsUpdate(tournamentId);
    Profiling.log({
      msg: `[DATA PROVIDER] - [UPDATE KNOCKOUT ROUNDS FOR TOURNAMENT] - [${tournamentId}]`,
      data: rounds,
      source: 'DATA_PROVIDER_TOURNAMENT_ROUND_knockoutRoundsUpdate',
    });
    return res.status(200).send(rounds);
  } catch (error: unknown) {
    Profiling.error({
      source: 'DATA_PROVIDER_TOURNAMENT_ROUND_knockoutRoundsUpdate',
      error: error as Error,
    });

    handleInternalServerErrorResponse(res, error);
  }
};

export const API_TOURNAMENT_ROUNDS = {
  createRounds,
  updateRounds,
  knockoutRoundsUpdate,
};
