import { API_SOFASCORE_ROUNDS } from './typing';
import { IApiProvider } from '@/domains/data-provider/typing';
import { DB_InsertTournamentRound, T_TournamentRound } from '@/domains/tournament/schema';
import db from '@/services/database';
import axios from 'axios';
import { Profiling } from '@/services/profiling';
import puppeteer from 'puppeteer';

export const SofascoreTournamentRound: IApiProvider['rounds'] = {
  fetchShallowListOfRoundsFromProvider: async baseUrl => {
    const roundsUrl = `${baseUrl}/rounds`;
    console.log(`[LOG] - [START] - FETCHING SHALLOW LIST OF ROUNDS - AT: ${roundsUrl}`);

    // Define browser-like headers to bypass potential 403
    const headers = {
      'Accept': 'application/json, text/plain, */*',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
      'Referer': 'https://www.sofascore.com/',
    };
    let data;
    try {
      // First attempt with Axios using browser headers
      const response = await axios.get(roundsUrl, { headers });
      data = response.data;
      console.log('[LOG] - [SUCCESS] - SHALLOW LIST OF ROUNDS DONE via Axios');
    } catch (axiosError) {
      Profiling.error('Axios request failed for rounds, falling back to Puppeteer', axiosError);
      // Fallback to Puppeteer to perform fetch in browser context
      const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
      try {
        const page = await browser.newPage();
        // Use fetch inside the page to retrieve JSON
        const content = await page.evaluate(async (url, headers) => {
          const resp = await fetch(url, { headers });
          if (!resp.ok) throw new Error(`HTTP error ${resp.status}`);
          return await resp.text();
        }, roundsUrl, headers);
        data = JSON.parse(content);
        console.log('[LOG] - [SUCCESS] - SHALLOW LIST OF ROUNDS DONE via Puppeteer');
      } finally {
        await browser.close();
      }
    }
    
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
  round: API_SOFASCORE_ROUNDS['rounds'][number],
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
