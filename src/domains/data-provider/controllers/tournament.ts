import { CreateTournamentInput } from '@/domains/data-provider/api/typying/tournament';
import { API_Sofascore } from '@/domains/data-provider/providers/sofascore';

const createTournament = async ({ input }: { input: CreateTournamentInput }) => {
  try {
    console.log('[LOG] - Creating tournament:', input.label);

    const logo = await API_Sofascore.tournament.fetchAndStoreLogo({
      logoPngBase64: input.logoPngBase64,
      logoUrl: input.logoUrl,
      filename: `tournament-${input.provider}-${input.externalId}`,
    });
    const newTournament = await API_Sofascore.tournament.createOnDatabase({
      ...input,
      logo,
    });
    if (!newTournament) throw new Error('Tournament not created');

    console.log('[LOG] - Tournament updated:', newTournament.label);

    return newTournament;
  } catch (error: any) {
    console.error('[ERROR] - createTournament', error);
  }
};

const updateTournament = async ({ input }: { input: CreateTournamentInput }) => {
  try {
    const logo = await API_Sofascore.tournament.fetchAndStoreLogo({
      logoPngBase64: input.logoPngBase64,
      logoUrl: input.logoUrl,
      filename: `tournament-${input.provider}-${input.externalId}`,
    });
    const updatedTournament = await API_Sofascore.tournament.updateOnDatabase({
      ...input,
      logo,
    });

    // await Scheduler.scheduleTournamentStandingsUpdateCronJob(updatedTournament);
    console.log('[LOG] - Tournament updated:', input.label);

    return updatedTournament;
  } catch (error: any) {
    console.error('[ERROR] - updateTournament', error.message);
  }
};

export const TournamentController = {
  createTournament,
  updateTournament,
};
