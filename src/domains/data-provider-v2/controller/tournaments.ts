import { TournamentRequest } from '@/domains/data-provider-v2/interface';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { type Response } from 'express';
import { SofascoreTournament } from '../providers/sofascore/sofascore-tournament';

const setupTournament = async (req: TournamentRequest, res: Response) => {
  try {
    const logo = await SofascoreTournament.fetchAndStoreLogo({
      logoPngBase64: req.body.logoPngBase64,
      logoUrl: req.body.logoUrl,
      filename: `tournament-${req.body.provider}-${req.body.externalId}`,
    });
    const tournament = await SofascoreTournament.createOnDatabase({ ...req.body, logo });
    if (!tournament) throw new Error('Tournament not created');

    return tournament;
  } catch (error: any) {
    console.error('[ERROR] - createTournament', error);

    handleInternalServerErrorResponse(res, error);
  }
};

const updateTournament = async (req: TournamentRequest, res: Response) => {
  try {
    const logo = await SofascoreTournament.fetchAndStoreLogo({
      logoPngBase64: req.body.logoPngBase64,
      logoUrl: req.body.logoUrl,
      filename: `tournament-${req.body.provider}-${req.body.externalId}`,
    });
    const updatedTournament = await SofascoreTournament.updateOnDatabase({
      ...req.body,
      logo,
    });

    return updatedTournament;
  } catch (error: any) {
    console.error('[ERROR] - updateTournament', error.message);

    handleInternalServerErrorResponse(res, error);
  }
};

export const TournamentController = {
  setupTournament,
  updateTournament,
};
