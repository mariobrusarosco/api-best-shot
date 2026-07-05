import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
import { QUERIES_MATCH } from '@/domains/match/queries';
import type { DB_SelectMatch } from '@/domains/match/schema';
import { BaseScraper } from '../providers/playwright/base-scraper';
import type { API_SOFASCORE_MATCH } from '../typing';
import { mapSofaScoreEventToMatchPollingPayload } from '../utils/sofascore-match-mapper';

const OPEN_MATCH_SYNC_BATCH_SIZE = 30;
// const OPEN_MATCH_SYNC_LOOKBACK_INTERVAL_MS = 12 * 60 * 60 * 1000;

const syncSingleMatch = async (
  scraper: BaseScraper,
  match: Pick<DB_SelectMatch, 'id' | 'externalId' | 'provider'>
): Promise<SyncSingleMatchResult> => {
  const checkedAt = new Date();
  const rawMatch = await scraper.getMatchData(match.externalId);
  const event = (rawMatch as { event?: API_SOFASCORE_MATCH } | null)?.event;

  if (!event) {
    await QUERIES_MATCH.touchMatchCheckedAt(match.id, checkedAt);

    return {
      matchId: match.id,
      externalId: match.externalId,
      updated: false,
      reason: 'provider_response_missing_event',
    };
  }

  const mappedEvent = mapSofaScoreEventToMatchPollingPayload(event);
  if (mappedEvent.status !== 'ended') {
    await QUERIES_MATCH.touchMatchCheckedAt(match.id, checkedAt);

    return {
      matchId: match.id,
      externalId: match.externalId,
      updated: false,
      status: mappedEvent.status,
      reason: 'provider_status_not_ended',
    };
  }

  const updatedMatch = await QUERIES_MATCH.updateMatchFromPolling({
    matchId: match.id,
    ...mappedEvent,
    checkedAt,
  });

  if (!updatedMatch) {
    throw new Error(`Match "${match.id}" could not be updated`);
  }

  return {
    matchId: updatedMatch.id,
    externalId: updatedMatch.externalId,
    updated: true,
    status: updatedMatch.status,
    homeScore: updatedMatch.homeScore,
    awayScore: updatedMatch.awayScore,
    homePenaltiesScore: updatedMatch.homePenaltiesScore,
    awayPenaltiesScore: updatedMatch.awayPenaltiesScore,
    checkedAt: updatedMatch.lastCheckedAt,
  };
};

const syncOpenMatchesFromProvider = async (): Promise<SyncOpenMatchesSummary> => {
  const now = new Date();
  const tournamentsToRefresh = new Set<string>();

  const dueMatches = await QUERIES_MATCH.listDueOpenMatchesForPolling({
    now,
    limit: OPEN_MATCH_SYNC_BATCH_SIZE,
  });
  // TODO(realtime): Emit "tournament_update_started" via WebSocket for each affected tournament.
  // NOTE: listDueOpenMatchesForPolling currently returns no tournamentId, so this needs that field first.

  const summary: SyncOpenMatchesSummary = {
    scanned: dueMatches.length,
    updated: 0,
    ended: 0,
    open: 0,
    notDefined: 0,
    failed: 0,
    matches: dueMatches.map(match => ({
      id: match.id,
      tournamentId: match.tournamentId,
    })),
    tournamentsToRefresh: [],
  };

  if (dueMatches.length === 0) {
    return summary;
  }

  let scraper: BaseScraper | null = null;

  try {
    scraper = await BaseScraper.createInstance();

    for (const match of dueMatches) {
      try {
        const result = await syncSingleMatch(scraper, match);

        if (!result.updated) {
          if (result.status === 'ended') summary.ended++;
          else if (result.status === 'not-defined') summary.notDefined++;
          else if (result.status === 'open') summary.open++;
          else summary.failed++;
          continue;
        }

        summary.updated++;
        if (result.status === 'ended' && match.tournamentId) {
          tournamentsToRefresh.add(match.tournamentId);
        }

        if (result.status === 'ended') summary.ended++;
        else if (result.status === 'not-defined') summary.notDefined++;
        else summary.open++;
      } catch (error) {
        summary.failed++;

        await QUERIES_MATCH.touchMatchCheckedAt(match.id, new Date());

        Logger.error(error as Error, {
          domain: DOMAINS.DATA_PROVIDER,
          component: 'service',
          operation: 'syncOpenMatchesFromProvider',
          matchId: match.id,
          externalMatchId: match.externalId,
        });
      }
    }
  } finally {
    if (scraper) {
      await scraper.close();
    }
  }

  // TODO(realtime): Emit per-tournament "tournament_update_completed" / "tournament_update_failed"
  // events after sync + scoreboard recalculation state transitions are finalized.
  summary.tournamentsToRefresh = [...tournamentsToRefresh];

  return summary;
};

const syncMatchById = async (matchId: string): Promise<SyncSingleMatchResult | null> => {
  const match = await QUERIES_MATCH.getMatchById(matchId);
  if (!match) return null;

  let scraper: BaseScraper | null = null;

  try {
    scraper = await BaseScraper.createInstance();
    return await syncSingleMatch(scraper, match);
  } finally {
    if (scraper) {
      await scraper.close();
    }
  }
};

export const SERVICES_DATA_PROVIDER_MATCH_SYNC = {
  syncOpenMatchesFromProvider,
  syncMatchById,
};

type SyncOpenMatchesSummary = {
  scanned: number;
  updated: number;
  ended: number;
  open: number;
  notDefined: number;
  failed: number;
  matches: {
    id: string;
    tournamentId: string;
  }[];
  tournamentsToRefresh: string[];
};

type SyncSingleMatchResult = {
  matchId: string;
  externalId: string;
  updated: boolean;
  reason?: string;
  status?: DB_SelectMatch['status'];
  homeScore?: number | null;
  awayScore?: number | null;
  homePenaltiesScore?: number | null;
  awayPenaltiesScore?: number | null;
  checkedAt?: Date | null;
};
