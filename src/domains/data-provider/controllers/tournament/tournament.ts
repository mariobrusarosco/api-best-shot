import { CreateTournamentInput } from '@/domains/data-provider/api/tournament/typing';
import { API_Sofascore } from '@/domains/data-provider/providers/sofascore';

const createTournament = async ({ input }: { input: CreateTournamentInput }) => {
  try {
    console.log('[LOG] - [START]- TOURNAMENT CREATION:', input.label);

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

    console.log('[LOG] - [END]- TOURNAMENT CREATION:', newTournament.label);

    return newTournament;
  } catch (error: any) {
    console.error('[ERROR] - createTournament', error);
  }
};

const updateTournament = async ({ input }: { input: CreateTournamentInput }) => {
  try {
    console.log('[LOG] - [START]- TOURNAMENT UPDATE:', input.externalId);

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

    console.log('[LOG] - [END]- TOURNAMENT UPDATE:', updatedTournament.externalId);

    return updatedTournament;
  } catch (error: any) {
    console.error('[ERROR] - TOURNAMENT UPDATE', error.message);
  }
};

export const TournamentController = {
  createTournament,
  updateTournament,
};
