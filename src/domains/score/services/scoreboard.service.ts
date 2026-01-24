import { QUERIES_GUESS } from '@/domains/guess/queries';
import { runGuessAnalysis } from '@/domains/guess/services/guess-analysis-v2';
import { QUERIES_TOURNAMENT } from '@/domains/tournament/queries';
import { redis } from '@/services/redis/client';
import { chunk } from 'lodash';

export const ScoreboardService = {
  /**
   * Calculates the points gained from a single match for all members who made a guess.
   * Returns a Map of memberId -> pointsDelta
   */
  async calculateMatchPoints(matchId: string): Promise<Map<string, number>> {
    const guessesAndMatches = await QUERIES_GUESS.getGuessesByMatchId(matchId);
    const deltas = new Map<string, number>();

    for (const row of guessesAndMatches) {
      const analysis = runGuessAnalysis(row.guess, row.match);
      const points = analysis.total || 0;

      // We only care about members who actually earned points to optimize updates,
      // but we could include 0 if needed for some logic.
      // For now, let's include everyone who made a guess to be safe,
      // or just those with points > 0 to optimize.
      // The plan says "Identify all affected Members (those who guessed)".
      deltas.set(row.guess.memberId, points);
    }

    return deltas;
  },

  /**
   * Updates the "Source of Truth" (Postgres) and the "Hot Cache" (Redis).
   * 1. Updates T_TournamentMember.points (Atomic Increment)
   * 2. Updates tournament:{id}:master_scores (ZINCRBY)
   */
  async applyScoreUpdates(tournamentId: string, deltas: Map<string, number>): Promise<void> {
    await QUERIES_TOURNAMENT.bulkUpdateMemberPoints(tournamentId, deltas);

    // 2. Redis Update (Speed)
    const pipeline = redis.pipeline();
    let hasUpdates = false;

    for (const [memberId, points] of deltas) {
      if (points !== 0) {
        pipeline.zincrby(`tournament:${tournamentId}:master_scores`, points, memberId);
        hasUpdates = true;
      }
    }

    if (hasUpdates) {
      await pipeline.exec();
    }
  },

  /**
   * Generates the "Virtual League" view by intersecting Master Scores with League Members.
   * Snapshots the previous state to allow Rank Movement calculation.
   */
  async refreshLeagueRanking(leagueId: string, tournamentId: string): Promise<void> {
    const currentKey = `league:${leagueId}:leaderboard`;
    const prevKey = `league:${leagueId}:leaderboard:prev`;
    const masterKey = `tournament:${tournamentId}:master_scores`;
    const membersKey = `league:${leagueId}:members`;

    // 1. Snapshot: Move current -> prev
    // We only rename if it exists, otherwise it's the first run (no history).
    const exists = await redis.exists(currentKey);
    if (exists) {
      await redis.rename(currentKey, prevKey);
    }

    // 2. Intersection: Create new current
    // ZINTERSTORE destination numkeys key1 key2 ...
    // This efficiently filters the Master Scoreboard to show ONLY members of this league.
    await redis.zinterstore(currentKey, 2, masterKey, membersKey);
  },

  /**
   * Retrieves the leaderboard for a specific league with pagination.
   * Optionally returns the requesting user's specific rank and movement.
   */
  async getLeagueLeaderboard(leagueId: string, page: number = 1, limit: number = 25, memberId?: string) {
    const start = (page - 1) * limit;
    const end = start + limit - 1;
    const currentKey = `league:${leagueId}:leaderboard`;
    const prevKey = `league:${leagueId}:leaderboard:prev`;

    // 1. Fetch Page Data
    // Returns: ["memberId1", "score1", "memberId2", "score2", ...]
    const rawData = await redis.zrevrange(currentKey, start, end, 'WITHSCORES');

    // Parse using lodash chunk for cleaner reading
    const leaderboard = chunk(rawData, 2).map(([id, score], index) => ({
      memberId: id,
      points: Number(score),
      rank: start + index + 1,
    }));

    // 2. Fetch "My Rank" & Movement
    let myStats = null;
    if (memberId) {
      const [currentRank, prevRank, points] = await Promise.all([
        redis.zrevrank(currentKey, memberId),
        redis.zrevrank(prevKey, memberId),
        redis.zscore(currentKey, memberId),
      ]);

      if (currentRank !== null) {
        // Redis ranks are 0-indexed
        const displayRank = currentRank + 1;
        let movement = 0;

        if (prevRank !== null) {
          // Lower rank number is better (1 is better than 5)
          // Movement = Old - New. (Old: 5, New: 1) => +4 spots
          movement = prevRank - currentRank;
        } else {
          // New entry to the board
          movement = 0; // Or indicate 'NEW' in UI
        }

        myStats = {
          rank: displayRank,
          points: Number(points),
          movement,
        };
      }
    }

    // 3. Get Total Count (for pagination metadata if needed)
    const totalMembers = await redis.zcard(currentKey);

    return {
      data: leaderboard,
      meta: {
        page,
        limit,
        total: totalMembers,
      },
      myStats,
    };
  },
};
