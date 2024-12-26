import { TournamentRoundRequest } from '@/domains/data-provider/api/tournament-round/typing';
import { TeamsController } from '@/domains/data-provider/controllers/teams';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { Response } from 'express';

const createTeams = async (req: TournamentRoundRequest, res: Response) => {
  try {
    const tournamentId = req.params.tournamentId;

    const teams = await TeamsController.create(tournamentId);

    return res.status(200).send(teams);
  } catch (error: any) {
    console.error('[ERROR] - [API_Teams] - CREATE TEAMS', error);

    handleInternalServerErrorResponse(res, error);
  }
};

const updateTeams = async (req: any, res: Response) => {
  try {
    const tournamentId = req.params.tournamentId;
    const teams = await TeamsController.update(tournamentId);

    return res.status(200).send(teams);
  } catch (error: any) {
    console.error('[ERROR] - [API_Teams] - UPDATE TEAMS', error);

    handleInternalServerErrorResponse(res, error);
  }
};

export const API_Teams = {
  createTeams,
  updateTeams,
};
