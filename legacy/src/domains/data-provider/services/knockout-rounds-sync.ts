import {
  RoundsDataProviderService,
  SyncEligibleTournamentsKnockoutRoundsSummary,
  SyncTournamentKnockoutRoundsSummary,
} from '@/domains/data-provider/services/rounds';

const syncTournamentKnockoutRounds = async (tournamentId: string): Promise<SyncTournamentKnockoutRoundsSummary> => {
  return RoundsDataProviderService.updateKnockoutsForTournament(tournamentId);
};

const syncEligibleTournamentsKnockoutRounds = async (): Promise<SyncEligibleTournamentsKnockoutRoundsSummary> => {
  return RoundsDataProviderService.updateKnockouts();
};

export const SERVICES_DATA_PROVIDER_KNOCKOUT_ROUNDS_SYNC = {
  syncTournamentKnockoutRounds,
  syncEligibleTournamentsKnockoutRounds,
};
