// const { fetchStandings } = ApiProviderV2.standings;

import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { Response } from 'express';
import { ApiProviderV2 } from '..';
import { TeamsRequest } from '../interface';

const {
  fetchTeamsFromStandings,
  mapTeamsFromStandings,
  createOnDatabase,
  updateOnDatabase,
} = ApiProviderV2.teams;

const setupTeams = async (req: TeamsRequest, res: Response) => {
  try {
    const standings = await fetchTeamsFromStandings(req);
    const mappedTeams = await mapTeamsFromStandings(standings);
    const query = await createOnDatabase(mappedTeams);

    res.status(200).send(query);
  } catch (error: any) {
    console.error('[ERROR] - SetupTeams', error);

    handleInternalServerErrorResponse(res, error);
  }
};

const updateTeams = async (req: TeamsRequest, res: Response) => {
  try {
    const standings = await fetchTeamsFromStandings(req);
    const mappedTeams = await mapTeamsFromStandings(standings);
    const query = await updateOnDatabase(mappedTeams);

    res.status(200).send(query);
  } catch (error: any) {
    console.error('[ERROR] - updateTeams', error);

    handleInternalServerErrorResponse(res, error);
  }
};

export const TeamsDataController = {
  setupTeams,
  updateTeams,
};
