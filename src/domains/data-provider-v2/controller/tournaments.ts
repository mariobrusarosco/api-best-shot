import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { type Response } from 'express';
import { CreateTournamentInput } from '../../data-provider/api/tournament';
import { API_Sofascore } from '../../data-provider/providers/sofascore';
import { Scheduler } from './scheduler';

const createTournament = async ({ input }: { input: CreateTournamentInput }) => {
  try {
    const logo = await API_Sofascore.tournament.fetchAndStoreLogo({
      logoPngBase64: input.logoPngBase64,
      logoUrl: input.logoUrl,
      filename: `tournament-${input.provider}-${input.externalId}`,
    });
    const tournament = await API_Sofascore.tournament.createOnDatabase({
      ...input,
      logo,
    });
    if (!tournament) throw new Error('Tournament not created');

    return tournament;
  } catch (error: any) {
    console.error('[ERROR] - createTournament', error);
  }
};

const updateTournament = async (req: any, res: Response) => {
  try {
    const logo = await API_Sofascore.tournament.fetchAndStoreLogo({
      logoPngBase64: req.body.logoPngBase64,
      logoUrl: req.body.logoUrl,
      filename: `tournament-${req.body.provider}-${req.body.externalId}`,
    });
    const updatedTournament = await API_Sofascore.tournament.updateOnDatabase({
      ...req.body,
      logo,
    });

    await Scheduler.scheduleTournamentStandingsUpdateCronJob(updatedTournament);

    return updatedTournament;
  } catch (error: any) {
    console.error('[ERROR] - updateTournament', error.message);

    handleInternalServerErrorResponse(res, error);
  }
};

export const TournamentController = {
  createTournament,
  // updateTournament,
};
