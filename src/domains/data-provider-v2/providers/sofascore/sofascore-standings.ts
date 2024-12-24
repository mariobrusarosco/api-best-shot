//@ts-nocheck
import {
  DB_InsertTournamentStandings,
  T_Tournament,
  T_TournamentStandings,
} from '@/domains/tournament/schema';
import db from '@/services/database';
import axios from 'axios';
import { eq } from 'drizzle-orm';
import { IApiProviderV2, StandingsRequest } from '../../interface';
import { API_SofaScoreStandings } from './typing';

export const SofascoreStandings: IApiProviderV2['standings'] = {
  fetchStandings: async (req: StandingsRequest) => {
    const tournamentId = req.params.tournamentId;
    const [tournament] = await db
      .select()
      .from(T_Tournament)
      .where(eq(T_Tournament.id, tournamentId));

    const response = await axios.get(tournament.baseUrl);

    return {
      standings: response.data as API_SofaScoreStandings,
      tournamentId,
    };
  },
  mapStandings: async (standings: API_SofaScoreStandings, tournamentId) => {
    // console.log('Sofa....', standings);
    console.log('TOURNAMENT_ID', tournamentId);

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
  updateOnDatabase: async standings => {
    return await db.transaction(async tx => {
      for (const standing of standings) {
        return await tx
          .update(T_TournamentStandings)
          .set(standing)
          .where(eq(T_TournamentStandings.teamExternalId, standing.teamExternalId))
          .returning();
      }
    });
  },
};
