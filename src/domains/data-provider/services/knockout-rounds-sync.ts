import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import { BaseScraper } from '@/domains/data-provider/providers/playwright/base-scraper';
import { API_SOFASCORE_ROUND, API_SOFASCORE_ROUNDS } from '@/domains/data-provider/typing';
import { MatchesDataProviderService } from '@/domains/data-provider/services/match';
import { QUERIES_TOURNAMENT_ROUND } from '@/domains/tournament-round/queries';
import { DB_InsertTournamentRound } from '@/domains/tournament-round/schema';
import { SERVICES_TOURNAMENT } from '@/domains/tournament/services';
import type { TournamentMode } from '@/domains/tournament/typing';
import { randomUUID } from 'crypto';

const KNOCKOUT_DISCOVERY_ELIGIBLE_MODES: TournamentMode[] = ['regular-season-and-knockout', 'knockout-only'];

type SofaScoreRoundShape = {
  round?: unknown;
  name?: unknown;
  slug?: unknown;
  prefix?: unknown;
};

const isEligibleMode = (mode: TournamentMode): boolean => {
  return KNOCKOUT_DISCOVERY_ELIGIBLE_MODES.includes(mode);
};

const normalizeKnockoutRounds = (input: {
  baseUrl: string;
  tournamentId: string;
  roundsResponse: API_SOFASCORE_ROUNDS;
}): DB_InsertTournamentRound[] => {
  const { baseUrl, tournamentId, roundsResponse } = input;
  const rawRounds = Array.isArray(roundsResponse?.rounds) ? (roundsResponse.rounds as unknown[]) : [];

  const normalized: DB_InsertTournamentRound[] = [];

  rawRounds.forEach((rawRound, index) => {
    const round = rawRound as SofaScoreRoundShape;

    const providerRoundId = typeof round.round === 'number' ? round.round : null;
    if (providerRoundId === null) {
      return;
    }

    const rawSlug = typeof round.slug === 'string' ? round.slug.trim().toLowerCase() : '';
    const rawName = typeof round.name === 'string' ? round.name.trim() : '';
    const rawPrefix = typeof round.prefix === 'string' ? round.prefix.trim() : '';

    const isSpecialRound = rawPrefix.length > 0;
    const isKnockoutRound = isSpecialRound || rawName.length > 0;

    if (!isKnockoutRound) {
      return;
    }

    // Knockout rounds must have slug to build provider URL.
    if (!rawSlug) {
      return;
    }

    let providerUrl = `${baseUrl}/events/round/${providerRoundId}/slug/${rawSlug}`;
    let slug = rawSlug;
    let label = rawName || String(index + 1);

    if (isSpecialRound) {
      providerUrl += `/prefix/${rawPrefix}`;
      slug = `${rawPrefix}-${rawSlug}`.toLowerCase();
      label = rawPrefix;
    }

    normalized.push({
      providerUrl,
      providerId: String(providerRoundId),
      tournamentId,
      order: index + 1,
      label,
      slug,
      knockoutId: rawPrefix || '',
      type: 'knockout',
    });
  });

  return normalized;
};

const fetchProviderRounds = async (scraper: BaseScraper, baseUrl: string): Promise<API_SOFASCORE_ROUNDS> => {
  await scraper.goto(`${baseUrl}/rounds`);
  return (await scraper.getPageContent()) as API_SOFASCORE_ROUNDS;
};

const fetchProviderRoundEvents = async (scraper: BaseScraper, providerUrl: string): Promise<API_SOFASCORE_ROUND> => {
  await scraper.goto(providerUrl);
  const roundPayload = (await scraper.getPageContent()) as API_SOFASCORE_ROUND | null;

  if (!roundPayload || !Array.isArray(roundPayload.events)) {
    return {
      events: [],
      hasPreviousPage: false,
    };
  }

  return roundPayload;
};

export type SyncTournamentKnockoutRoundsSummary = {
  tournamentId: string;
  tournamentMode: TournamentMode;
  eligible: boolean;
  scannedKnockoutRounds: number;
  discoveredNewKnockoutRounds: number;
  createdRounds: string[];
  deferredRounds: string[];
  upsertedMatches: number;
  failedRounds: Array<{ slug: string; error: string }>;
};

export type SyncEligibleTournamentsKnockoutRoundsSummary = {
  scannedTournaments: number;
  failedTournaments: Array<{ tournamentId: string; error: string }>;
};

const syncTournamentKnockoutRounds = async (tournamentId: string): Promise<SyncTournamentKnockoutRoundsSummary> => {
  const tournament = await SERVICES_TOURNAMENT.getTournament(tournamentId);

  const baseSummary: SyncTournamentKnockoutRoundsSummary = {
    tournamentId: tournament.id,
    tournamentMode: tournament.mode,
    eligible: isEligibleMode(tournament.mode),
    scannedKnockoutRounds: 0,
    discoveredNewKnockoutRounds: 0,
    createdRounds: [],
    deferredRounds: [],
    upsertedMatches: 0,
    failedRounds: [],
  };

  if (!baseSummary.eligible) {
    return baseSummary;
  }

  let scraper: BaseScraper | null = null;

  try {
    scraper = await BaseScraper.createInstance();
    const roundsResponse = await fetchProviderRounds(scraper, tournament.baseUrl);
    const normalizedKnockoutRounds = normalizeKnockoutRounds({
      baseUrl: tournament.baseUrl,
      tournamentId: tournament.id,
      roundsResponse,
    });

    baseSummary.scannedKnockoutRounds = normalizedKnockoutRounds.length;

    const databaseRounds = await QUERIES_TOURNAMENT_ROUND.getAllRounds(tournament.id);
    const existingRoundSlugs = new Set(databaseRounds.map(round => round.slug));
    const discoveredRounds = normalizedKnockoutRounds.filter(round => !existingRoundSlugs.has(round.slug));

    baseSummary.discoveredNewKnockoutRounds = discoveredRounds.length;

    if (discoveredRounds.length === 0) {
      return baseSummary;
    }

    const matchesProvider = new MatchesDataProviderService(scraper, randomUUID());

    for (const discoveredRound of discoveredRounds) {
      try {
        const rawRound = await fetchProviderRoundEvents(scraper, discoveredRound.providerUrl);
        const hasEvents = Array.isArray(rawRound.events) && rawRound.events.length > 0;

        // Expected state: round exists on provider but events are not hydrated yet.
        if (!hasEvents) {
          baseSummary.deferredRounds.push(discoveredRound.slug);
          continue;
        }

        const persistedRounds = await QUERIES_TOURNAMENT_ROUND.upsertTournamentRounds([discoveredRound]);
        const persistedRound = persistedRounds[0];

        if (!persistedRound) {
          throw new Error(`Could not persist round "${discoveredRound.slug}"`);
        }

        const mappedMatches = matchesProvider.mapMatches(rawRound, tournament.id, persistedRound.slug);
        const upsertedMatches = await matchesProvider.updateOnDatabase(mappedMatches);

        baseSummary.createdRounds.push(persistedRound.slug);
        baseSummary.upsertedMatches += upsertedMatches;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        baseSummary.failedRounds.push({
          slug: discoveredRound.slug,
          error: errorMessage,
        });

        Logger.error(error instanceof Error ? error : new Error(errorMessage), {
          domain: DOMAINS.DATA_PROVIDER,
          component: 'service',
          operation: 'syncTournamentKnockoutRounds',
          tournamentId: tournament.id,
          roundSlug: discoveredRound.slug,
        });
      }
    }

    return baseSummary;
  } finally {
    if (scraper) {
      await scraper.close();
    }
  }
};

const syncEligibleTournamentsKnockoutRounds = async (): Promise<SyncEligibleTournamentsKnockoutRoundsSummary> => {
  const tournaments = await SERVICES_TOURNAMENT.listActiveTournamentsByModes(KNOCKOUT_DISCOVERY_ELIGIBLE_MODES);

  const summary: SyncEligibleTournamentsKnockoutRoundsSummary = {
    scannedTournaments: tournaments.length,
    failedTournaments: [],
  };

  for (const tournament of tournaments) {
    try {
      await syncTournamentKnockoutRounds(tournament.id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      summary.failedTournaments.push({
        tournamentId: tournament.id,
        error: errorMessage,
      });

      Logger.error(error instanceof Error ? error : new Error(errorMessage), {
        domain: DOMAINS.DATA_PROVIDER,
        component: 'service',
        operation: 'syncEligibleTournamentsKnockoutRounds',
        tournamentId: tournament.id,
      });
    }
  }

  return summary;
};

export const SERVICES_DATA_PROVIDER_KNOCKOUT_ROUNDS_SYNC = {
  syncTournamentKnockoutRounds,
  syncEligibleTournamentsKnockoutRounds,
};
