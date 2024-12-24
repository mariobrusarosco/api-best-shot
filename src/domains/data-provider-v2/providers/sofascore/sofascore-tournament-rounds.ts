import { DB_InsertTournamentRound, T_TournamentRound } from '@/domains/tournament/schema';
import db from '@/services/database';
import axios from 'axios';
import { and, eq } from 'drizzle-orm';
import { IApiProviderV2 } from '../../interface';
import { API_SofaScoreRounds } from './typing';

export const SofascoreTournamentRounds: IApiProviderV2['rounds'] = {
  fetchRoundsFromProvider: async baseUrl => {
    const roundsUrl = `${baseUrl}/rounds`;
    const response = await axios.get(roundsUrl);

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
    type: 'season',
  } satisfies DB_InsertTournamentRound;
};

// const buildSpecialKnockoutRound = (
//   round: API_SofaScoreRounds['rounds'][number],
//   tournamentId: string,
//   tournamentBaseUrl: string
// ) => {
//   const roundType = 'special-knockout';
//   const providerUrl = buildProviderUrl(roundType, tournamentBaseUrl);

//   return {
//     tournamentId,
//     slug: round.slug!,
//     order: `0${round.round}`,
//     knockoutId: String(round.round),
//     label: round.name!,
//     type: roundType,
//     providerUrl,
//   } satisfies DB_InsertTournamentRound;
// };

// const buildProviderUrl = (roundType: string, baseUrl: string) => {
//   if (roundType === 'knockout') {
//     return `${baseUrl}/events/round/${round.knockoutId}/slug/${round.slug}`;
//   }

//   if (roundType === 'special-knockout') {
//     return `${baseUrl}/events/round/${round.knockoutId}/slug/${round.slug}/prefix/${round.prefix}`;
//   }

//   if (roundType === 'season') {
//     return `${baseUrl}/events/round/${round.order}`;
//   }

//   return false;
// };
