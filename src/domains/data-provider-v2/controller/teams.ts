import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { TournamentQueries } from '@/domains/tournament/queries';
import { Response } from 'express';
import { ApiProvider } from '..';
import { TeamsRequest } from '../interface';

const Api = ApiProvider.teams;

const setupTeams = async (req: TeamsRequest, res: Response) => {
  try {
    const tournamenId = req.params.tournamentId;
    const tournament = await TournamentQueries.tournament(tournamenId);

    if (!tournament) throw new Error('Tournament not found');

    const standings = await Api.fetchTeamsFromStandings(tournament.standingsUrl);
    const mappedTeams = await Api.mapTeamsFromStandings(standings, tournament.provider);
    const query = await Api.createOnDatabase(mappedTeams);

    res.status(200).send(query);
  } catch (error: any) {
    console.error('[ERROR] - SetupTeams', error);

    handleInternalServerErrorResponse(res, error);
  }
};

const updateTeams = async (req: TeamsRequest, res: Response) => {
  try {
    const tournamenId = req.params.tournamentId;
    const tournament = await TournamentQueries.tournament(tournamenId);

    if (!tournament) throw new Error('Tournament not found');

    const standings = await Api.fetchTeamsFromStandings(tournament.standingsUrl);
    const mappedTeams = await Api.mapTeamsFromStandings(standings, tournament.provider);
    const query = await Api.updateOnDatabase(mappedTeams);

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
