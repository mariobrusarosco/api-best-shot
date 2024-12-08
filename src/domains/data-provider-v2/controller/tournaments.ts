import { TournamentRequest } from '@/domains/data-provider-v2/interface';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { type Response } from 'express';
import { ApiProvider } from '..';

const Api = ApiProvider.tournament;

const setupTournament = async (req: TournamentRequest, res: Response) => {
  try {
    const logo = await Api.fetchAndStoreLogo({
      logoPngBase64: req.body.logoPngBase64,
      logoUrl: req.body.logoUrl,
      filename: `tournament-${req.body.externalId}`,
    });

    const query = await Api.createOnDatabase({ ...req.body, logo });

    res.status(200).send(query);
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
      filename: `tournament-${req.body.externalId}`,
    });

    const query = await Api.updateOnDatabase({ ...req.body, logo });

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
