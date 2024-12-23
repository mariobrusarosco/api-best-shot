//@ts-nocheck
import { ApiProviderSofascore } from '@/domains/data-provider-v2/providers/sofascore';
import { TournamentQueries } from '@/domains/tournament/queries';
const Api = ApiProviderSofascore;

const setupTeams = async (tournamentId: string) => {
  try {
    const tournament = await TournamentQueries.tournament(tournamentId);
    if (!tournament) throw new Error('Tournament not found');

    const standings = await Api.fetchTeamsFromStandings(tournament.standingsUrl);
    // const mappedTeams = await Api.mapTeamsFromStandings(standings, tournament.provider);
    // const query = await Api.createOnDatabase(mappedTeams);

    // console.log('CREATED TEAMS', query);
    return query;
  } catch (error: any) {
    console.error('[ERROR] - SetupTeams', error);
  }
};

const updateTeams = async (tournamentId: string) => {
  try {
    const tournament = await TournamentQueries.tournament(tournamentId);
    if (!tournament) throw new Error('Tournament not found');

    const standings = await Api.fetchTeamsFromStandings(tournament.standingsUrl);
    const mappedTeams = await Api.mapTeamsFromStandings(standings, tournament.provider);
    const query = await Api.updateOnDatabase(mappedTeams);

    return query;
  } catch (error: any) {
    console.error('[ERROR] - updateTeams', error);
  }
};

export const TeamsDataController = {
  setupTeams,
  updateTeams,
};
