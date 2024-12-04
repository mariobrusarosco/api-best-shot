import { ApiProviderV2 } from '@/domains/data-provider-v2';
import { TournamentRequest } from '@/domains/data-provider-v2/interface';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { type Response } from 'express';

const { createOnDatabase, fetchAndStoreLogo, updateOnDatabase } =
  ApiProviderV2.tournament;

const setupTournament = async (req: TournamentRequest, res: Response) => {
  try {
    const logo = await fetchAndStoreLogo({
      logoPngBase64: req.body.logoPngBase64,
      logoUrl: req.body.logoUrl,
      id: req.body.externalId,
    });

    const query = await createOnDatabase({ ...req.body, logo });

    res.status(200).send(query);
  } catch (error: any) {
    console.error('[ERROR] - createTournament', error);

    handleInternalServerErrorResponse(res, error);
  }
};

const updateTournament = async (req: TournamentRequest, res: Response) => {
  try {
    const logo = await fetchAndStoreLogo({
      logoPngBase64: req.body.logoPngBase64,
      logoUrl: req.body.logoUrl,
      id: req.body.externalId,
    });

    const query = await updateOnDatabase({ ...req.body, logo });

    res.status(200).send(query);
  } catch (error: any) {
    console.error('[ERROR] - createTournament', error);

    handleInternalServerErrorResponse(res, error);
  }
};

export const TournamentControllerv2 = {
  setupTournament,
  updateTournament,
};
