import { CreateTournamentInput } from '@/domains/data-provider/api/v1/tournament/typing';
import { API_SOFASCORE } from '@/domains/data-provider/providers/sofascore';
import { QUERIES_TOURNAMENT } from '@/domains/tournament/queries';
import Profiling from '@/services/profiling';
import { SchedulerController } from '../scheduler';
import { DB_InsertTournament } from '@/domains/tournament/schema';

const createTournament = async ({ input }: { input: CreateTournamentInput }) => {
  try {
    const logo = await API_SOFASCORE.tournament.fetchAndStoreLogo({
      logoPngBase64: input.logoPngBase64,
      logoUrl: input.logoUrl,
      filename: `tournament-${input.provider}-${input.externalId}`,
    });
    const queryResult = await API_SOFASCORE.tournament.createOnDatabase({
      ...input,
      logo,
    });

    const tournament = await QUERIES_TOURNAMENT.tournament(queryResult.id!);
    if (!tournament) throw new Error('Tournament not created');

    const tournamentMode = tournament.mode;
    if (
      tournamentMode === 'knockout-only' ||
      tournamentMode === 'regular-season-and-knockout'
    ) {
      await SchedulerController.createKnockoutsUpdatesRoutine(tournament);
    }

    Profiling.log({
      msg: '[DATA PROVIDER] - [TOURNAMENT] - CREATE',
      data: {
        tournamentId: tournament.id,
        tournamentLabel: tournament.label,
      },
      color: 'FgGreen'
    });

    return tournament;
  } catch (error: any) {
    Profiling.error('[DATA PROVIDER]', error);
  }
};

const updateTournament = async ({ input }: { input: CreateTournamentInput }) => {
  try {
    const logo = await API_SOFASCORE.tournament.fetchAndStoreLogo({
      logoPngBase64: input.logoPngBase64,
      logoUrl: input.logoUrl,
      filename: `tournament-${input.provider}-${input.externalId}`,
    });
    const updatedTournament = await API_SOFASCORE.tournament.updateOnDatabase({
      ...input,
      logo,
    });

    const tournament = await QUERIES_TOURNAMENT.tournament(updatedTournament.id!);
    const tournamentMode = tournament?.mode;

    if (
      tournamentMode === 'knockout-only' ||
      tournamentMode === 'regular-season-and-knockout'
    ) {
      await SchedulerController.createKnockoutsUpdatesRoutine(tournament);
    }

    Profiling.log({
      msg: '[DATA PROVIDER] - [TOURNAMENT] - UPDATE',
      data: {
        tournamentId: updatedTournament.id,
        tournamentLabel: updatedTournament.label,
      },
      color: 'FgGreen'
    });

    return updatedTournament;
  } catch (error: any) {
    Profiling.error('[DATA PROVIDER] - [TOURNAMENT] - UPDATE', { error });
  }
};

export const TournamentController = {
  createTournament,
  updateTournament,
};
