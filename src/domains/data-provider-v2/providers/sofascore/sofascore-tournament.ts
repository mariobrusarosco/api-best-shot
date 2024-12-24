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
import { API_SofaScoreRounds } from './typing';

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
      const mappedRound = identifyTypeAndMapRound(round, tournamentId);

      return mappedRound;
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

const identifyTypeAndMapRound = (
  round: API_SofaScoreRounds['rounds'][number],
  tournamentId: string
) => {
  if (round?.prefix) {
    return {
      tournamentId,
      slug: round.slug!,
      order: `0${round.round}`,
      knockoutId: `${round.round}`,
      label: round.name!,
      type: 'special-knockout',
      prefix: round.prefix,
    } satisfies DB_InsertTournamentRound;
  }

  if (round?.slug) {
    return {
      tournamentId,
      slug: round.slug!,
      order: `0${round.round}`,
      knockoutId: String(round.round),
      label: round.name!,
      type: 'knockout',
    } satisfies DB_InsertTournamentRound;
  }

  return {
    tournamentId,
    order: `${round.round}`,
    label: `${round.round}`,
    type: 'season',
  } satisfies DB_InsertTournamentRound;
};
