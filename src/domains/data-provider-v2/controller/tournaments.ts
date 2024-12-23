import { TournamentRequest } from '@/domains/data-provider-v2/interface';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { type Response } from 'express';
import { ApiProvider } from '..';
import { TeamsDataController } from './teams';

const Api = ApiProvider.tournament;

const setupTournament = async (req: TournamentRequest, res: Response) => {
  try {
    // TOURNAMENT CREATION
    const logo = await Api.fetchAndStoreLogo({
      logoPngBase64: req.body.logoPngBase64,
      logoUrl: req.body.logoUrl,
      filename: `tournament-${req.body.provider}-${req.body.externalId}`,
    });
    const tournament = await Api.createOnDatabase({ ...req.body, logo });
    if (!tournament) throw new Error('Tournament not created');

    // TEAMS CREATON
    const teams = await TeamsDataController.setupTeams(tournament.id!);

    // ROUNDS CREATION

    // ROUNDS CREATION

    res.status(200).send('OK');
  } catch (error: any) {
    console.error('[ERROR] - createTournament', error);

    handleInternalServerErrorResponse(res, error);
  }
};

const updateTournament = async (req: TournamentRequest, res: Response) => {
  try {
    const logo = await Api.fetchAndStoreLogo({
      logoPngBase64: req.body.logoPngBase64,
      logoUrl: req.body.logoUrl,
      filename: `tournament-${req.body.provider}-${req.body.externalId}`,
    });

    const query = await Api.updateOnDatabase({ ...req.body, logo });

    // UPDATE TOURNAMENT STANDINGS

    // UPDATE TOURNAMENT ROUNDS

    res.status(200).send(query);
  } catch (error: any) {
    console.error('[ERROR] - createTournament', error);

    handleInternalServerErrorResponse(res, error);
  }
};

export const TournamentDataController = {
  setupTournament,
  updateTournament,
};
