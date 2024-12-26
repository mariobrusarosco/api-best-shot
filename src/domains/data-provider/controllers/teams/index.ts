import { TournamentQueries } from '@/domains/tournament/queries';
import { SofascoreTeams } from '../../providers/sofascore/teams';
import { fetchAndMapTeamsForRegularSeason } from './fetcher';

const create = async (tournamentId: string) => {
  try {
    const tournament = await TournamentQueries.tournament(tournamentId);
    if (tournament === undefined) throw new Error('Tournament not found');

    console.log('[LOG] - [START] - TEAM CREATION FOR ', tournament.label);

    const tournamentMode = tournament.mode;
    // if (tournamentMode === 'regular-season-and-knockout') {
    //   const teamsToInsert = await fetchAndMapTeamsFromKnockoutRounds(tournament);

    // return await SofascoreTeams.createOnDatabase(teamsToInsert);
    // }

    if (tournamentMode === 'regular-season-only') {
      const teamsToInsert = await fetchAndMapTeamsForRegularSeason(tournament);

      return await SofascoreTeams.createOnDatabase(teamsToInsert);
    }

    console.log('[LOG] - [SUCCESS] - TEAM CREATION FOR ', tournament.label);

    return [];
  } catch (error: any) {}
};

const update = async (tournamentId: string) => {
  try {
    const tournament = await TournamentQueries.tournament(tournamentId);
    if (tournament === undefined) throw new Error('Tournament not found');

    console.log('[LOG] - [TeamsController] - UPDATING TEAMS FOR: ', tournament.label);

    const tournamentMode = tournament.mode;
    // if (tournamentMode === 'regular-season-and-knockout') {
    //   const teamsToInsert = await fetchAndMapTeamsFromKnockoutRounds(tournament);

    // return await SofascoreTeams.upsertOnDatabase(teamsToInsert);
    // }

    if (tournamentMode === 'regular-season-only') {
      const teamsToInsert = await fetchAndMapTeamsForRegularSeason(tournament);

      await SofascoreTeams.upsertOnDatabase(teamsToInsert);
    }

    return [];
  } catch (error: any) {
    console.error('[ERROR] - [TeamsController] - UPDATE TEAMS', error);
  }
};

export const TeamsController = {
  create,
  update,
};
