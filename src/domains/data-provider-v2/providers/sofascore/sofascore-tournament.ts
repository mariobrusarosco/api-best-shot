import {
  DB_InsertTournamentRound,
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
  fetchRounds: async (baseUrl: string) => {
    const response = await axios.get(`${baseUrl}/rounds`);
    const data = response.data;

    return data;
  },
  mapRoundsToInsert: (data, tournamentId) => {
    return data.rounds.map(round => {
      const identifyRoundType = round.slug ? 'knockout' : 'season';
      let parsedRound = {} as DB_InsertTournamentRound;

      if (identifyRoundType === 'knockout') {
        parsedRound = {
          tournamentId,
          slug: round.slug!,
          order: String(round.round),
          label: round.name!,
          type: identifyRoundType,
        };
      }

      if (identifyRoundType === 'season') {
        parsedRound = {
          tournamentId,
          slug: String(round.round),
          order: String(round.round),
          label: String(round.round),
          type: identifyRoundType,
        };
      }

      return parsedRound;
    });
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
          .where(
            and(
              eq(T_TournamentRound.order, round.order),
              eq(T_TournamentRound.tournamentId, round.tournamentId)
            )
          );
      }
    });
  },
};
