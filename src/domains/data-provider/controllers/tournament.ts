import { CreateTournamentInput } from '@/domains/data-provider/api/typying/tournament';
import { BestshotScheduler } from '@/domains/data-provider/bestshot-scheduler';
import { API_Sofascore } from '@/domains/data-provider/providers/sofascore';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { type Response } from 'express';

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

    await BestshotScheduler.scheduleTournamentStandingsUpdateCronJob(updatedTournament);

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
