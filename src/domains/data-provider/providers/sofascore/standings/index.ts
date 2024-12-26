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
      console.log(`[LOG] - [SUCCESS] - FETCHING STANDINGS - AT: ${url}`);
      return data;
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        console.error('[ERROR] - [FETCHING STANDINGS] - ', error.message);
      }

      return null;
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
  // updateOnDatabase: async standings => {
  //   return await db.transaction(async tx => {
  //     for (const standing of standings) {
  //       return await tx
  //         .update(T_TournamentStandings)
  //         .set(standing)
  //         .where(eq(T_TournamentStandings.teamExternalId, standing.teamExternalId))
  //         .returning();
  //     }
  //   });
  // },
  // upsertOnDatabase: async standings => {
  //   return await db.transaction(async tx => {
  //     for (const standing of standings) {
  //       const query = await tx
  //         .update(T_TournamentStandings)
  //         .set(standing)
  //         .where(eq(T_TournamentStandings.teamExternalId, standing.teamExternalId))
  //         .returning();

  //       console.error('[UPDATE] - Upserted tournament standings for: ', query, standing);

  //       // TODO Consider a 'insert' + onConlifct Update
  //       if (!query.length) {
  //         await tx.insert(T_TournamentStandings).values(standing).returning();
  //       }
  //     }
  //   });
  // },
};
