import { CreateTournamentInput } from '@/domains/data-provider/api/tournament/typing';
import { API_Sofascore } from '@/domains/data-provider/providers/sofascore';
import { TournamentQueries } from '@/domains/tournament/queries';
import Profiling from '@/services/profiling';
import { SchedulerController } from '../scheduler';

const createTournament = async ({ input }: { input: CreateTournamentInput }) => {
  try {
    Profiling.log(
      '[LOG] - [DATA PROVIDER] - [START] -  TOURNAMENT CREATION:',
      input.label
    );

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
    if (
      tournamentMode === 'knockout-only' ||
      tournamentMode === 'regular-season-and-knockout'
    ) {
      await SchedulerController.createKnockoutNewRoundsRoutine(tournament);
    }

    Profiling.log(
      '[LOG] - [DATA PROVIDER] - [END] -  TOURNAMENT CREATION:',
      tournament.label
    );

    return tournament;
  } catch (error: any) {
    Profiling.error('[ERROR] - [DATA PROVIDER]', error);
  }
};

const updateTournament = async ({ input }: { input: CreateTournamentInput }) => {
  try {
    Profiling.log(
      '[LOG] - [DATA PROVIDER] - [START] - TOURNAMENT UPDATE:',
      input.externalId
    );

    const logo = await API_Sofascore.tournament.fetchAndStoreLogo({
      logoPngBase64: input.logoPngBase64,
      logoUrl: input.logoUrl,
      filename: `tournament-${input.provider}-${input.externalId}`,
    });
    const updatedTournament = await API_Sofascore.tournament.updateOnDatabase({
      ...input,
      logo,
    });

    Profiling.log(
      '[LOG] - [DATA PROVIDER] - [END] - TOURNAMENT UPDATE:',
      updatedTournament.externalId
    );

    return updatedTournament;
  } catch (error: any) {
    Profiling.error('[ERROR] - [DATA PROVIDER] - TOURNAMENT UPDATE', error.message);
  }
};

export const TournamentController = {
  createTournament,
  updateTournament,
};
