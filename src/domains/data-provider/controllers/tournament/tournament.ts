/* eslint-disable @typescript-eslint/no-explicit-any */
import { API_SOFASCORE } from '@/domains/data-provider/providers/sofascore';
import { QUERIES_TOURNAMENT } from '@/domains/tournament/queries';
import Profiling from '@/services/profiling';
import { SchedulerController } from '../scheduler';

const createTournament = async ({ input }: { input: any }) => {
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
      msg: 'TOURNAMENT CREATE SUCCESS',
      data: {
        tournamentId: tournament.id,
        tournamentLabel: tournament.label,
      },
      source: 'DATA_PROVIDER_TOURNAMENT_CONTROLLER_create',
    });

    return tournament;
  } catch (error: any) {
    Profiling.error({
      source: 'DATA_PROVIDER_TOURNAMENT_CONTROLLER_create',
      error,
    });
  }
};

const updateTournament = async ({ input }: { input: any }) => {
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
      msg: 'TOURNAMENT UPDATE SUCCESS',
      data: {
        tournamentId: updatedTournament.id,
        tournamentLabel: updatedTournament.label,
      },
      source: 'DATA_PROVIDER_TOURNAMENT_CONTROLLER_update',
    });

    return updatedTournament;
  } catch (error: any) {
    Profiling.error({
      source: 'DATA_PROVIDER_TOURNAMENT_CONTROLLER_update',
      error,
    });
  }
};

export const TournamentController = {
  createTournament,
  updateTournament,
};
