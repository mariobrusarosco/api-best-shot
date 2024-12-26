import { CreateTournamentInput } from '@/domains/data-provider/api/tournament/typing';
import { API_Sofascore } from '../../data-provider/providers/sofascore';

const createTournament = async ({ input }: { input: CreateTournamentInput }) => {
  try {
    console.log('[LOG] - Creating tournament:', input.label);

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

    console.log('[LOG] - Tournament created:', input.label);

    return tournament;
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
