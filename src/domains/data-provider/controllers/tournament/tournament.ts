import { CreateTournamentInput } from '@/domains/data-provider/api/tournament/typing';
import { API_SOFASCORE } from '@/domains/data-provider/providers/sofascore';
import { TournamentQueries } from '@/domains/tournament/queries';
import Profiling from '@/services/profiling';
import { SchedulerController } from '../scheduler';

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

    const tournament = await TournamentQueries.tournament(queryResult.id!);
    if (!tournament) throw new Error('Tournament not created');

    const tournamentMode = tournament.mode;
    if (
      tournamentMode === 'knockout-only' ||
      tournamentMode === 'regular-season-and-knockout'
    ) {
      await SchedulerController.createKnockoutsUpdatesRoutine(tournament);
    }

    Profiling.log('[DATA PROVIDER] - [TOURNAMENT] - CREATE', {
      tournamentId: tournament.id,
      tournamentLabel: tournament.label,
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

    const tournament = await TournamentQueries.tournament(updatedTournament.id!);
    const tournamentMode = tournament?.mode;

    if (
      tournamentMode === 'knockout-only' ||
      tournamentMode === 'regular-season-and-knockout'
    ) {
      await SchedulerController.createKnockoutsUpdatesRoutine(tournament);
    }

    Profiling.log('[DATA PROVIDER] - [TOURNAMENT] - UPDATE', {
      tournamentId: updatedTournament.id,
      tournamentLabel: updatedTournament.label,
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
