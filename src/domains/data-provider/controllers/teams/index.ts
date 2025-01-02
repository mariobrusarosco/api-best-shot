import { TournamentQueries } from '@/domains/tournament/queries';
import Profiling from '@/services/profiling';
import { SofascoreTeams } from '../../providers/sofascore/teams';
import {
  fetchAndMapTeamsForRegularAndKnockout,
  fetchAndMapTeamsForRegularSeason,
} from './fetcher';

const create = async (tournamentId: string) => {
  try {
    const tournament = await TournamentQueries.tournament(tournamentId);
    if (tournament === undefined) throw new Error('Tournament not found');

    Profiling.log('[LOG] - [DATA PROVIDER] - TEAM CREATION FOR ', tournament.label);

    const tournamentMode = tournament.mode;
    if (tournamentMode === 'regular-season-and-knockout') {
      const teamsToInsert = await fetchAndMapTeamsForRegularAndKnockout(tournament);

      return await SofascoreTeams.createOnDatabase(teamsToInsert);
    }

    if (tournamentMode === 'regular-season-only') {
      const teamsToInsert = await fetchAndMapTeamsForRegularSeason(tournament);

      return await SofascoreTeams.createOnDatabase(teamsToInsert);
    }

    Profiling.log('[LOG] - [DATA PROVIDER] - TEAM CREATION FOR ', tournament.label);

    return 'OK';
  } catch (error: any) {
    Profiling.error('[ERROR] - [DATA PROVIDER] - TEAM CREATION FOR ', error);
  }
};

const update = async (tournamentId: string) => {
  try {
    const tournament = await TournamentQueries.tournament(tournamentId);
    if (tournament === undefined) throw new Error('Tournament not found');

    Profiling.log('[LOG] - [DATA PROVIDER] - UPDATING TEAMS FOR: ', tournament.label);

    const tournamentMode = tournament.mode;
    if (tournamentMode === 'regular-season-and-knockout') {
      const teamsToInsert = await fetchAndMapTeamsForRegularAndKnockout(tournament);

      return await SofascoreTeams.upsertOnDatabase(teamsToInsert);
    }

    if (tournamentMode === 'regular-season-only') {
      const teamsToInsert = await fetchAndMapTeamsForRegularSeason(tournament);

      await SofascoreTeams.upsertOnDatabase(teamsToInsert);
    }

    return [];
  } catch (error: any) {
    Profiling.error('[ERROR] - [DATA PROVIDER] - UPDATE TEAMS', error);
  }
};

export const TeamsController = {
  create,
  update,
};
