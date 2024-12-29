import { CreateTournamentInput } from '@/domains/data-provider/api/tournament/typing';
import { API_Sofascore } from '@/domains/data-provider/providers/sofascore';
import { TournamentQueries } from '@/domains/tournament/queries';
import { SchedulerController } from '../scheduler';

const createTournament = async ({ input }: { input: CreateTournamentInput }) => {
  try {
    console.log('[LOG] - [START]- TOURNAMENT CREATION:', input.label);

    const logo = await API_Sofascore.tournament.fetchAndStoreLogo({
      logoPngBase64: input.logoPngBase64,
      logoUrl: input.logoUrl,
      filename: `tournament-${input.provider}-${input.externalId}`,
    });
    const queryResult = await API_Sofascore.tournament.createOnDatabase({
      ...input,
      logo,
    });

    const tournament = await TournamentQueries.tournament(queryResult.id!);
    if (!tournament) throw new Error('Tournament not created');

    const tournamentMode = tournament.mode;
    // if (tournamentMode === 'regular-season-only') {
    //   await SchedulerController(tournament);
    // }

    if (tournamentMode === 'regular-season-and-knockout') {
      await SchedulerController.createKnockoutNewRoundsRoutine(tournament);
      // await SchedulerController.dailyStandingsChecker(tournament);

      // Matches of new Knockout rounds

      // Teams of new Knockout rounds

      // Matches Scored of new Knockout rounds
    }

    console.log('[LOG] - [END]- TOURNAMENT CREATION:', tournament.label);

    return tournament;
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
