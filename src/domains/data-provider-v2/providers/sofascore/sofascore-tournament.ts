import {
  DB_InsertTournamentRound,
  DB_UpdateTournamentRound,
  T_Tournament,
  T_TournamentRound,
} from '@/domains/tournament/schema';
import db from '@/services/database';
import { fetchAndStoreAssetFromApiNew } from '@/utils';
import axios from 'axios';
import { and, eq } from 'drizzle-orm';
import { IApiProviderV2 } from '../../interface';

export const SofascoreTournament: IApiProviderV2['tournament'] = {
  createOnDatabase: async data => {
    const [tournament] = await db.insert(T_Tournament).values(data).returning();

    return tournament;
  },
  updateOnDatabase: async data => {
    const [tournament] = await db
      .update(T_Tournament)
      .set(data)
      .where(
        and(
          eq(T_Tournament.externalId, data.externalId),
          eq(T_Tournament.provider, data.provider)
        )
      )
      .returning();

    return tournament;
  },
  fetchAndStoreLogo: async data => {
    const assetPath = await fetchAndStoreAssetFromApiNew(data);

    return `https://${process.env['AWS_CLOUDFRONT_URL']}/${assetPath}`;
  },
  fetchRounds: async (roundsUrl: string) => {
    const response = await axios.get(roundsUrl);
    const data = response.data;

    return data;
  },
  mapRoundsToInsert: (data, tournamentId) => {
    return data.rounds.map((round: any, index) => ({
      tournamentId,
      order: String(index + 1),
      label: round.name || round.round,
    })) satisfies DB_InsertTournamentRound[] | DB_UpdateTournamentRound[];
  },
  createRoundsOnDatabase: async roundsToInsert => {
    const rounds = await db.insert(T_TournamentRound).values(roundsToInsert).returning();

    return rounds;
  },
  updateRoundsOnDatabase: async roundsToUpdate => {
    return await db.transaction(async tx => {
      for (const round of roundsToUpdate) {
        return await tx
          .update(T_TournamentRound)
          .set(round)
          .where(eq(T_TournamentRound.order, round.order))
          .returning();
      }
    });
  },
};
