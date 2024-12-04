import { ApiProviderV2 } from '@/domains/data-provider-v2';
import { TournamentRequest } from '@/domains/data-provider-v2/interface';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { type Response } from 'express';

const createTournament = async (req: TournamentRequest, res: Response) => {
  try {
    const query = await ApiProviderV2.tournament.createOnDatabase(req.body);

    res.status(200).send(query);
  } catch (error: any) {
    console.error('[ERROR] - createTournament', error);

    handleInternalServerErrorResponse(res, error);
  }
};

export const TournamentControllerv2 = {
  createTournament,
};
