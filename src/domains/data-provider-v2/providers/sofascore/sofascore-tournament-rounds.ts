import { DB_InsertTournamentRound, T_TournamentRound } from '@/domains/tournament/schema';
import db from '@/services/database';
import axios from 'axios';
import { and, eq } from 'drizzle-orm';
import { IApiProviderV2 } from '../../../data-provider/typying/main-interface';
import { API_SofaScoreRounds } from './typing';

export const SofascoreTournamentRounds: IApiProviderV2['rounds'] = {
  fetchRoundsFromProvider: async baseUrl => {
    const roundsUrl = `${baseUrl}/rounds`;
    const response = await axios.get(roundsUrl);

    const data = response.data;

    return data;
  },
  fetchRoundFromProvider: async providerUrl => {
    const response = await axios.get(providerUrl);

    const data = response.data;

    return data;
  },
  mapAvailableRounds: async (data, tournament) => {
    return data.rounds.map(round =>
      buildTournamentRound(round, tournament.id!, tournament.baseUrl)
    );
  },
  createOnDatabase: async roundsToInsert => {
    const rounds = await db.insert(T_TournamentRound).values(roundsToInsert).returning();

    return rounds;
  },
  updateOnDatabase: async roundsToUpdate => {
    return await db.transaction(async tx => {
      const updatedRounds = await Promise.all(
        roundsToUpdate.map(async round => {
          return await tx
            .update(T_TournamentRound)
            .set(round)
            .where(
              and(
                eq(T_TournamentRound.order, round.order),
                eq(T_TournamentRound.tournamentId, round.tournamentId)
              )
            )
            .returning();
        })
      );
      return updatedRounds.flat();
    });
  },
};

const buildTournamentRound = (
  round: API_SofaScoreRounds['rounds'][number],
  tournamentId: string,
  tournamentBaseUrl: string
) => {
  if (round?.prefix) {
    const knockoutId = `${round.prefix}`;
    const providerUrl = `${tournamentBaseUrl}/events/round/${round.round}/slug/${round.slug}/prefix/${knockoutId}`;
    const specialOrder = `0${round.round}`;

    return {
      tournamentId,
      slug: round.slug!,
      order: specialOrder,
      knockoutId,
      label: round.name!,
      type: 'special-knockout',
      providerUrl,
    } satisfies DB_InsertTournamentRound;
  }

  if (round?.slug) {
    const knockoutId = `${round.round}`;
    const providerUrl = `${tournamentBaseUrl}/events/round/${knockoutId}/slug/${round.slug}`;
    const specialOrder = `0${round.round}`;
    return {
      tournamentId,
      slug: round.slug!,
      order: specialOrder,
      knockoutId,
      label: round.name!,
      type: 'knockout',
      providerUrl,
    } satisfies DB_InsertTournamentRound;
  }

  const order = `${round.round}`;
  const providerUrl = `${tournamentBaseUrl}/events/round/${order}`;

  return {
    tournamentId,
    order,
    label: `${round.round}`,
    providerUrl,
    slug: `${round.round}`,
    type: 'season',
  } satisfies DB_InsertTournamentRound;
};
