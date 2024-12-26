import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { TournamentQueries } from '@/domains/tournament/queries';
import type { Request, Response } from 'express';
import { SofascoreStandings } from '../providers/sofascore/sofascore-standings';

const setupStandings = async (baseUrl: string, tournamentId: string) => {
  try {
    const standings = await SofascoreStandings.fetchStandings(baseUrl);
    const mappedStandings = await SofascoreStandings.mapStandings(
      standings,
      tournamentId
    );
    const query = await SofascoreStandings.createOnDatabase(mappedStandings);

    return query;
  } catch (error: any) {
    if (error.response.status === 404) {
      console.error(
        `[STANDINGS] - tournament: ${tournamentId} does not have a standings in place`
      );

      return;
    }

    console.error('[ERROR] - setupStandings');
    console.error('[URL] - ', error.config.url);
    console.error('[STATUS] - ', error.response.status, ' - ', error.response.statusText);
  }
};

const updateStandings = async (baseUrl: string, tournamentId: string) => {
  try {
    const standings = await SofascoreStandings.fetchStandings(baseUrl);
    console.error('[UPDATE] - Fetched tournament standings for: ', tournamentId);

    const mappedStandings = await SofascoreStandings.mapStandings(
      standings,
      tournamentId
    );
    console.error(
      '[UPDATE] - Mapped tournament standings for: ',
      tournamentId,
      mappedStandings
    );

    const query = await SofascoreStandings.upsertOnDatabase(mappedStandings);

    return query;
  } catch (error: any) {
    if (error.response.status === 404) {
      console.error(
        `[STANDINGS] - tournament: ${tournamentId} does not have a standings in place`
      );

      return;
    }

    console.error('[ERROR] - setupStandings');
    console.error('[URL] - ', error.config.url);
    console.error('[STATUS] - ', error.response.status, ' - ', error.response.statusText);
  }
};

export const StandingsDataController = {
  setupStandings,
  updateStandings,
};

export const API_StandingsDataprovider = {
  update: async (req: Request<{ tournamentId: string }, null, null>, res: Response) => {
    try {
      const tournamentId = req.params.tournamentId;
      if (!tournamentId) return res.status(400).send('Invalid tournament id');

      const tournament = await TournamentQueries.tournament(tournamentId);
      if (!tournament) return res.status(404).send('Tournament not found');

      const standings = await StandingsDataController.updateStandings(
        tournament.baseUrl,
        tournamentId
      );

      res.status(200).send(standings);
    } catch (error: any) {
      console.error('[ERROR] - StandingsDataApi', error.message);

      handleInternalServerErrorResponse(res, error);
    }
  },
};
