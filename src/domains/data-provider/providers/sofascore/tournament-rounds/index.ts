import { API_SofaScoreRounds } from '@/domains/data-provider/providers/sofascore/tournament-rounds/typing';
import { IApiProvider } from '@/domains/data-provider/typing';
import { DB_InsertTournamentRound, T_TournamentRound } from '@/domains/tournament/schema';
import db from '@/services/database';
import axios from 'axios';

export const SofascoreTournamentRound: IApiProvider['rounds'] = {
  fetchShallowListOfRoundsFromProvider: async baseUrl => {
    const roundsUrl = `${baseUrl}/rounds`;
    console.log(`[LOG] - [START] - FETCHING SHALLOW LIST OF ROUNDS - AT: ${roundsUrl}`);

    const response = await axios.get(roundsUrl);
    const data = response.data;

    console.log('[LOG] - [SUCCESS] - SHALLOW LIST OF ROUNDS DONE: ', data);
    return data;
  },
  fetchRoundFromProvider: async providerUrl => {
    console.log(`[LOG] - [START] AT: ${providerUrl}`);

    const response = await axios.get(providerUrl);
    const data = response.data;
    console.log(`[LOG] - [END] AT: ${providerUrl}`);

    return data;
  },
  mapShallowListOfRounds: async (data, tournament) =>
    data.rounds.map((round, index) => {
      return buildTournamentRound(round, index, tournament.id!, tournament.baseUrl);
    }),
  createOnDatabase: async roundsToInsert => {
    const rounds = await db.insert(T_TournamentRound).values(roundsToInsert).returning();

    return rounds;
  },
  upsertOnDatabase: async roundsToUpdate => {
    console.log('[LOG] - [SofascoreTournamentRounds] - UPSERTING ROUNDS ON DATABASE');

    return await db.transaction(async tx => {
      for (const round of roundsToUpdate) {
        console.log(
          '[LOG] - [SofascoreTournamentRounds],' + ' - UPSERTING ROUND: ',
          round
        );

        await tx
          .insert(T_TournamentRound)
          .values(round)
          .onConflictDoUpdate({
            target: [T_TournamentRound.slug, T_TournamentRound.tournamentId],
            set: {
              ...round,
            },
          });

        console.log('[LOG] - [SofascoreTournamentRounds] - UPSERTING ROUND: ', round);
      }
    });
  },
};

const buildTournamentRound = (
  round: API_SofaScoreRounds['rounds'][number],
  roundOrder: number,
  tournamentId: string,
  tournamentBaseUrl: string
) => {
  const order = String(roundOrder);

  if (round?.prefix) {
    const knockoutId = `${round.prefix}`;
    const providerUrl = `${tournamentBaseUrl}/events/round/${round.round}/slug/${round.slug}/prefix/${knockoutId}`;

    return {
      tournamentId,
      slug: round.slug!,
      order,
      knockoutId,
      label: round.name!,
      type: 'special-knockout',
      providerUrl,
    } satisfies DB_InsertTournamentRound;
  }

  if (round?.slug) {
    const knockoutId = `${round.round}`;
    const providerUrl = `${tournamentBaseUrl}/events/round/${knockoutId}/slug/${round.slug}`;

    return {
      tournamentId,
      slug: round.slug!,
      order,
      knockoutId,
      label: round.name!,
      type: 'knockout',
      providerUrl,
    } satisfies DB_InsertTournamentRound;
  }

  const slug = `${round.round}`;
  const label = slug;
  const providerUrl = `${tournamentBaseUrl}/events/round/${round.round}`;

  return {
    tournamentId,
    order,
    label,
    providerUrl,
    slug,
    type: 'season',
  } satisfies DB_InsertTournamentRound;
};
