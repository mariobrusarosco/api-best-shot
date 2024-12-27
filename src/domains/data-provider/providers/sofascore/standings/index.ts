import { IApiProvider } from '@/domains/data-provider/typing';
import {
  DB_InsertTournamentStandings,
  T_TournamentStandings,
} from '@/domains/tournament/schema';
import db from '@/services/database';
import axios, { AxiosError } from 'axios';
import { API_SofaScoreStandings } from './typing';

export const SofascoreStandings: IApiProvider['standings'] = {
  fetchStandingsFromProvider: async (baseUrl: string) => {
    try {
      const url = `${baseUrl}/standings/total`;
      console.log(`[LOG] - [START] - FETCHING STANDINGS - AT: ${url}`);

      const response = await axios.get(url);
      const data = response.data as API_SofaScoreStandings;

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
  mapStandings: async (standings: API_SofaScoreStandings, tournamentId) => {
    const promises = standings?.standings[0]['rows']?.map(async team => {
      return {
        teamExternalId: String(team.team.id),
        tournamentId: String(tournamentId),
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
    });

    return Promise.all(promises);
  },
  createOnDatabase: async standings =>
    await db.insert(T_TournamentStandings).values(standings).returning(),
  upsertOnDatabase: async standings => {
    console.log('[LOG] - [START] - UPSERTING STANDINGS');

    const query = await db.transaction(async tx => {
      for (const standing of standings) {
        return await tx
          .insert(T_TournamentStandings)
          .values(standing)
          .onConflictDoUpdate({
            target: [T_TournamentStandings.order, T_TournamentStandings.tournamentId],
            set: {
              ...standing,
            },
          })
          .returning();
      }
    });

    console.log('[LOG] - [END] - UPSERTING STANDINGS');
    return query;
  },
};
