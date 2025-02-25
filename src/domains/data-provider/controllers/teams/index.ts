import { DB_InsertTeam } from '@/domains/team/schema';
import { QUERIES_TOURNAMENT } from '@/domains/tournament/queries';
import Profiling from '@/services/profiling';
import { SofascoreTeams } from '../../providers/sofascore/teams';
import {
  fetchAndMapTeamsForRegularAndKnockout,
  fetchAndMapTeamsForRegularSeason,
  fetchAndMapTeamsFromKnockoutRounds,
} from './fetcher';

const create = async (tournamentId: string) => {
  try {
    const tournament = await QUERIES_TOURNAMENT.tournament(tournamentId);
    if (tournament === undefined) throw new Error('Tournament not found');

    const tournamentMode = tournament.mode;
    let TEAMS = [] as DB_InsertTeam[];

    if (tournamentMode === 'regular-season-and-knockout') {
      TEAMS = await fetchAndMapTeamsForRegularAndKnockout(tournament);

      return await SofascoreTeams.createOnDatabase(TEAMS);
    }

    if (tournamentMode === 'knockout-only') {
      TEAMS = await fetchAndMapTeamsFromKnockoutRounds(tournament);

      return await SofascoreTeams.createOnDatabase(TEAMS);
    }

    if (tournamentMode === 'regular-season-only') {
      TEAMS = await fetchAndMapTeamsForRegularSeason(tournament);

      return await SofascoreTeams.createOnDatabase(TEAMS);
    }

    Profiling.log('[DATA PROVIDER] - [TEAMS] - CREATE SUCCESS', {
      tournamentLabel: tournament.label,
      team: TEAMS,
    });

    return TEAMS;
  } catch (error: any) {
    Profiling.error('[DATA PROVIDER] - [TEAMS] - TEAM CREATE FAILED', error);
  }
};

const update = async (tournamentId: string) => {
  try {
    const tournament = await QUERIES_TOURNAMENT.tournament(tournamentId);
    if (tournament === undefined) throw new Error('Tournament not found');

    const tournamentMode = tournament.mode;
    let TEAMS = [] as DB_InsertTeam[];

    if (tournamentMode === 'regular-season-and-knockout') {
      TEAMS = await fetchAndMapTeamsForRegularAndKnockout(tournament);

      return await SofascoreTeams.upsertOnDatabase(TEAMS);
    }

    if (tournamentMode === 'knockout-only') {
      TEAMS = await fetchAndMapTeamsFromKnockoutRounds(tournament);

      return await SofascoreTeams.createOnDatabase(TEAMS);
    }

    if (tournamentMode === 'regular-season-only') {
      TEAMS = await fetchAndMapTeamsForRegularSeason(tournament);

      await SofascoreTeams.upsertOnDatabase(TEAMS);
    }

    Profiling.log('[DATA PROVIDER] - [TEAMS] - UPDATE SUCCESS', {
      tournamentLabel: tournament.label,
      team: TEAMS,
    });

    return TEAMS;
  } catch (error: any) {
    Profiling.error('[DATA PROVIDER] - [TEAMS] - TEAM UPDATE FAILED', error);
  }
};

export const TeamsController = {
  create,
  update,
};
