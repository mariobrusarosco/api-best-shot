// const { fetchStandings } = ApiProviderV2.standings;
//@ts-nocheck

import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { Response } from 'express';
import { ApiProvider } from '..';
import { StandingsRequest } from '../interface';

const Api = ApiProvider.standings;

const setupStandings = async (req: StandingsRequest, res: Response) => {
  try {
    const { standings, tournamentId } = await Api.fetchStandings(req);
    const mappedTeams = await Api.mapStandings(standings, tournamentId);
    const query = await Api.createOnDatabase(mappedTeams);

    res.status(200).send(query);
  } catch (error: any) {
    console.error('[ERROR] - setupStandings', error);

    handleInternalServerErrorResponse(res, error);
  }
};

const updateStandings = async (req: StandingsRequest, res: Response) => {
  try {
    const { standings, tournamentId } = await Api.fetchStandings(req);
    const mappedStandings = await Api.mapStandings(standings, tournamentId);
    const query = await Api.updateOnDatabase(mappedStandings);

    console.error('[STANDINGS] - updateStandings', tournamentId);

    res.status(200).send(query);
  } catch (error: any) {
    console.error('[ERROR] - updateStandings', error);

    handleInternalServerErrorResponse(res, error);
  }
};

export const StandingsDataController = {
  setupStandings,
  updateStandings,
};
