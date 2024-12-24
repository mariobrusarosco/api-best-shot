import { TournamentQueries } from '@/domains/tournament/queries';
import { DB_SelectTournament } from '@/domains/tournament/schema';
import { SofascoreTeams } from '../providers/sofascore/sofacore-teams';

const setup = async (newTournament: DB_SelectTournament) => {
  try {
    let regularSeasonTeams,
      knockoutSeasonTeams = null;

    const tournament = await TournamentQueries.tournament(newTournament.id!);
    if (!tournament) throw new Error('Tournament not found');

    const tournamentMode = tournament.mode;
    console.log('[TOURNAMENT SETUP] - START');
    console.log('[TOURNAMENT SETUP] - MODE:', tournamentMode);
    console.log('[TOURNAMENT SETUP] - LABEL:', tournament.label);

    if (tournamentMode === 'regular-season-only') {
      regularSeasonTeams = await setupRegularSeasonTeams(
        tournament.baseUrl,
        tournament.provider
      );
    }

    if (tournamentMode === 'regular-season-and-knockout') {
      const tournamentAllRounds = await TournamentQueries.allTournamentRounds(
        tournament.id!
      );
      const hasRegularSeasonRound = tournamentAllRounds?.some(
        round => round.type === 'regular-season'
      );

      if (hasRegularSeasonRound) {
        regularSeasonTeams = await setupRegularSeasonTeams(
          tournament.baseUrl,
          tournament.provider
        );
      }

      knockoutSeasonTeams = await setupKnockoutSeasonTeams(
        tournament.baseUrl,
        tournament.provider,
        tournament.id!
      );
    }

    if (tournamentMode === 'knockout-only') {
      knockoutSeasonTeams = await setupKnockoutSeasonTeams(
        tournament.baseUrl,
        tournament.provider,
        tournament.id!
      );
    }

    console.log(regularSeasonTeams, knockoutSeasonTeams);
  } catch (error: any) {
    console.error('[ERROR] - SetupTeams', error);
  }
};

const setupRegularSeasonTeams = async (baseUrl: string, provider: string) => {
  try {
    console.log('[TOURNAMENT SETUP] - REGULAR SEASON TEAMS:', baseUrl, ' --- ', provider);

    const regularSeasonTeams = await SofascoreTeams.fetchTeamsFromStandings(baseUrl);
    const mappedRegularSeasonTeams = await SofascoreTeams.mapTeamsFromStandings(
      regularSeasonTeams,
      provider
    );
    const query = await SofascoreTeams.createOnDatabase(mappedRegularSeasonTeams);

    return query;
  } catch (error: any) {
    console.error('[ERROR] - setupRegularSeasonTeams');
    console.error('[URL] - ', error.config.url);
    console.error('[STATUS] - ', error.response.status, ' - ', error.response.statusText);

    if (error.response.status === 404) {
      console.error(
        `[TEAMS FROM STANDINGS] - baseUrl: ${baseUrl} , provider: ${provider}`
      );
    }
  }
};

const setupKnockoutSeasonTeams = async (
  baseUrl: string,
  provider: string,
  tournamentId: string
) => {
  try {
    console.log('[TOURNAMENT SETUP] - KNOCKOUT TEAMS:', baseUrl, ' --- ', provider);

    const knockoutRoundsTeams = await SofascoreTeams.fetchTeamsFromKnockoutRounds(
      tournamentId
    );
    const mappedKnockoutRoundsTeams = await SofascoreTeams.mapTeamsFromKnockoutRounds(
      knockoutRoundsTeams,
      provider
    );

    const query = await SofascoreTeams.createOnDatabase(mappedKnockoutRoundsTeams);

    return query;
  } catch (error: any) {
    console.error('[ERROR] - setupKnockoutSeasonTeams', error);
    console.error('[URL] - ', error.config?.url);
    console.error(
      '[STATUS] - ',
      error?.response?.status,
      ' - ',
      error.response?.statusText
    );

    if (error.response?.status === 404) {
      console.error(
        `[TEAMS FROM KNOCKOUT ROUNDS] - baseUrl: ${baseUrl} , provider: ${provider}`
      );
    }
  }
};

export const TeamsDataController = {
  setup,
};
