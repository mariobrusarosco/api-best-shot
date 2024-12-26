import { SofascoreTeams } from '@/domains/data-provider-v2/providers/sofascore/sofacore-teams';
import { TournamentQueries } from '@/domains/tournament/queries';
import {
  fetchTeamForRegularAndKnockoutTournament,
  fetchTeamsForRegularSeason,
} from './fetcher';

const create = async (tournamentId: string) => {
  try {
    const tournament = await TournamentQueries.tournament(tournamentId);
    if (tournament === undefined) throw new Error('Tournament not found');

    console.log(
      '[LOG] - [TeamsController] - CREATING TOURNAMENT ROUNDS FOR: ',
      tournament.label
    );

    const tournamentMode = tournament.mode;

    if (tournamentMode === 'regular-season-and-knockout') {
      const teamsToInsert = await fetchTeamForRegularAndKnockoutTournament(tournament);

      return await SofascoreTeams.createOnDatabase(teamsToInsert);
    }

    if (tournamentMode === 'regular-season-only') {
      const teamsToInsert = await fetchTeamsForRegularSeason(tournament);

      await SofascoreTeams.createOnDatabase(teamsToInsert);
    }

    return [];
  } catch (error: any) {}
};

const update = async (tournamentId: string) => {
  try {
    const tournament = await TournamentQueries.tournament(tournamentId);
    if (tournament === undefined) throw new Error('Tournament not found');

    return [];
  } catch (error: any) {
    console.error('[ERROR] - [TeamsController] - UPDATE TEAMS', error);
  }
};

export const TeamsController = {
  create,
  update,
};
