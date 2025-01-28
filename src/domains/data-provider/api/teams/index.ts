import { TournamentRoundRequest } from '@/domains/data-provider/api/tournament-round/typing';
import { TeamsController } from '@/domains/data-provider/controllers/teams';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import Profiling from '@/services/profiling';
import { Response } from 'express';

const createTeams = async (req: TournamentRoundRequest, res: Response) => {
  const tournamentId = req.params.tournamentId;
  try {
    const teams = await TeamsController.create(tournamentId);

    Profiling.log(
      `[LOG] - [DATA PROVIDER] - [CREATE TEAMS FOR TOURNAMENT] - [${tournamentId}]`,
      teams
    );

    return res.status(200).send(teams);
  } catch (error: any) {
    Profiling.error(
      `[ERROR] - [DATA PROVIDER] - [CREATE TEAMS FOR  TOURNAMENT] - [${tournamentId}]`,
      error
    );

    handleInternalServerErrorResponse(res, error);
  }
};

const updateTeams = async (req: any, res: Response) => {
  const tournamentId = req.params.tournamentId;

  try {
    const teams = await TeamsController.update(tournamentId);

    Profiling.log(
      `[LOG] - [DATA PROVIDER] - [UPDATE TEAMS FOR TOURNAMENT] - [${tournamentId}]`,
      teams
    );
    return res.status(200).send(teams);
  } catch (error: any) {
    Profiling.error(
      `[ERROR] - [DATA PROVIDER] - [UPDATE TEAMS FOR  TOURNAMENT] - [${tournamentId}]`,
      error
    );

    handleInternalServerErrorResponse(res, error);
  }
};

export const API_TEAMS = {
  createTeams,
  updateTeams,
};
