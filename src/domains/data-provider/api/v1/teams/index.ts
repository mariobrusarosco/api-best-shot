import { TournamentRoundRequest } from '@/domains/data-provider/api/v1/tournament-round/typing';
import { TeamsController } from '@/domains/data-provider/controllers/teams';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import Profiling from '@/services/profiling';
import { Response } from 'express';

const createTeams = async (req: TournamentRoundRequest, res: Response) => {
  const tournamentId = req.params.tournamentId;
  try {
    const teams = await TeamsController.create(tournamentId);

    Profiling.log({
      msg: `[LOG] - [DATA PROVIDER] - [CREATE TEAMS FOR TOURNAMENT] - [${tournamentId}]`,
      data: teams,
      source: 'DATA_PROVIDER_API_TEAMS_getTeams',
    });

    return res.status(200).send(teams);
  } catch (error: unknown) {
    Profiling.error({
      source: 'DATA_PROVIDER_API_TEAMS_getTeams',
      error: error as Error,
    });

    handleInternalServerErrorResponse(res, error as Error);
  }
};

const updateTeams = async (req: TournamentRoundRequest, res: Response) => {
  const tournamentId = req.params.tournamentId;

  try {
    const teams = await TeamsController.update(tournamentId);

    Profiling.log({
      msg: `[LOG] - [DATA PROVIDER] - [UPDATE TEAMS FOR TOURNAMENT] - [${tournamentId}]`,
      data: teams,
      source: 'DATA_PROVIDER_API_TEAMS_getTeams',
    });
    return res.status(200).send(teams);
  } catch (error: unknown) {
    Profiling.error({
      source: 'DATA_PROVIDER_API_TEAMS_getTeams',
      error: error as Error,
    });

    handleInternalServerErrorResponse(res, error as Error);
  }
};

export const API_TEAMS = {
  createTeams,
  updateTeams,
};
