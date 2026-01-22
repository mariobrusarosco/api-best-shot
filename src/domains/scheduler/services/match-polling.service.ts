/**
 * Match Polling Service
 *
 * Responsible for:
 * - Finding matches that need updating
 * - Queuing jobs for match updates
 * - Tracking when matches were last checked
 *
 * Polling Logic:
 * - Only checks "open" matches (live or upcoming)
 * - Skips matches checked in last 10 minutes
 * - Prioritizes older matches first
 * - Limits to 50 matches per poll (avoid overwhelming system)
 */

import type { DB_SelectMatch } from '@/domains/match/schema';
import { T_Match } from '@/domains/match/schema';
import db from '@/services/database';
import { and, eq, isNull, lt, or, sql } from 'drizzle-orm';

export class MatchPollingService {
  /**
   * Find matches that need to be checked for updates
   *
   * Query logic:
   * - status = 'open' (only live/upcoming matches)
   * - date < NOW() - 2 hours (match has started or will start soon)
   * - (last_checked_at IS NULL OR last_checked_at < NOW() - 10 minutes)
   *
   * @returns Array of matches needing updates
   */
  async findMatchesNeedingUpdate(): Promise<DB_SelectMatch[]> {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

    const matches = await db
      .select()
      .from(T_Match)
      .where(
        and(
          // Only open matches
          eq(T_Match.status, 'open'),

          // Match date is at least 2 hours old (has started or about to start)
          lt(T_Match.date, twoHoursAgo),

          // Either never checked OR last checked more than 10 minutes ago
          or(isNull(T_Match.lastCheckedAt), lt(T_Match.lastCheckedAt, tenMinutesAgo))
        )
      )
      .orderBy(T_Match.date) // Older matches first
      .limit(50); // Don't overwhelm the system

    return matches;
  }

  /**
   * Update the lastCheckedAt timestamp for a match
   *
   * Called after successfully scraping/updating a match
   *
   * @param matchId - Internal UUID of the match
   */
  async markMatchAsChecked(matchId: string): Promise<void> {
    await db
      .update(T_Match)
      .set({
        lastCheckedAt: new Date(),
      })
      .where(eq(T_Match.id, matchId));
  }

  /**
   * Get polling statistics
   *
   * Useful for monitoring and debugging
   *
   * @returns Stats about matches needing updates
   */
  async getPollingStats(): Promise<{
    totalOpenMatches: number;
    matchesNeedingUpdate: number;
    matchesRecentlyChecked: number;
  }> {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    // Total open matches
    const [{ count: totalOpenMatches }] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(T_Match)
      .where(eq(T_Match.status, 'open'));

    // Matches that need updating (using same logic as findMatchesNeedingUpdate)
    const matchesNeedingUpdate = await this.findMatchesNeedingUpdate();

    // Matches checked in last 10 minutes
    const [{ count: matchesRecentlyChecked }] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(T_Match)
      .where(and(eq(T_Match.status, 'open'), lt(T_Match.lastCheckedAt, tenMinutesAgo)));

    return {
      totalOpenMatches: Number(totalOpenMatches),
      matchesNeedingUpdate: matchesNeedingUpdate.length,
      matchesRecentlyChecked: Number(matchesRecentlyChecked),
    };
  }
}
