import { IApiProvider } from '@/domains/data-provider/typing';
import {
  DB_InsertTournamentStandings,
  T_TournamentStandings,
} from '@/domains/tournament/schema';
import db from '@/services/database';
import axios, { AxiosError } from 'axios';
import { API_SOFASCORE_STANDINGS, API_SOFASCORE_STANDING_TEAM } from './typing';
import { DB_InsertTeam } from '@/domains/team/schema';

export const SofascoreStandings: IApiProvider['standings'] = {
  fetchStandingsFromProvider: async (baseUrl: string) => {
    try {
      const url = `${baseUrl}/standings/total`;
      console.log(`[LOG] - [START] - FETCHING STANDINGS - AT: ${url}`);

      const response = await axios.get(url);
      const data = response.data as API_SOFASCORE_STANDINGS;

      return data;
    } catch (error: unknown) {
      const axiosError = error instanceof AxiosError && error.response?.data.error;

      if (axiosError && axiosError.code === 404) {
        return Promise.resolve(null);
      }

      return Promise.reject(error);
    } finally {
      console.log(`[LOG] - [END] - FETCHING STANDINGS`);
    }
  },
  mapStandings: async (
    data: API_SOFASCORE_STANDINGS,
    tournamentId,
    tournamentStandingsMode
  ) => {
    if (!data?.standings) return [];
    let standings = [] as DB_InsertTournamentStandings[];

    console.log(`[LOG] - [MAPPING] - STANDINGS - TYPE: ${tournamentStandingsMode}`);

    if (tournamentStandingsMode === 'unique-group') {
      standings = data.standings[0].rows.map(team =>
        mapTeamStandings(team, tournamentId)
      );
    }

    if (tournamentStandingsMode === 'multi-group') {
      const groups = data.standings.map(groupOfTeams => ({
        name: groupOfTeams.name,
        teams: groupOfTeams.rows,
      }));

      standings = groups
        .map(group =>
          group.teams.map(team => mapTeamStandings(team, tournamentId, group.name))
        )
        .flat();
    }

    return standings;
  },
  createOnDatabase: async standings =>
    await db.insert(T_TournamentStandings).values(standings).returning(),
  upsertOnDatabase: async standings => {
    console.log('[LOG] - [START] - UPSERTING STANDINGS');

    const query = await db.transaction(async tx => {
      for (const standing of standings) {
        await tx
          .insert(T_TournamentStandings)
          .values(standing)
          .onConflictDoUpdate({
            target: [T_TournamentStandings.shortName, T_TournamentStandings.tournamentId],
            set: {
              ...standing,
            },
          });
      }
    });

    console.log('[LOG] - [END] - UPSERTING STANDINGS');
    return query;
  },
};

const mapTeamStandings = (
  team: API_SOFASCORE_STANDING_TEAM,
  tournamentId: string,
  groupName?: string
) => {
  return {
    teamExternalId: String(team.team.id),
    tournamentId: String(tournamentId),
    groupName: String(groupName),
    shortName: String(team.team.nameCode),
    longName: String(team.team.name),
    order: String(team.position),
    games: String(team.matches),
    points: String(team.points),
    wins: String(team.wins),
    draws: String(team.draws),
    losses: String(team.losses),
    gf: String(team.scoresFor),
    ga: String(team.scoresAgainst),
    gd: String(team.scoreDiffFormatted),
    provider: 'sofa',
  } satisfies DB_InsertTournamentStandings;
};
