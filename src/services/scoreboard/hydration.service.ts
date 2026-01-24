import { T_LeagueRole, T_LeagueTournament } from '@/domains/league/schema';
import { T_TournamentMember } from '@/domains/tournament/schema';
import db from '@/services/database';
import { redis } from '@/services/redis/client';
import { eq } from 'drizzle-orm';

export const ScoreboardHydrationService = {
  /**
   * Rebuilds the Redis Scoreboard from the Postgres Source of Truth.
   * This is a heavy operation and should only run on startup or manual trigger.
   */
  async hydrateTournament(tournamentId: string): Promise<void> {
    console.log(`[Hydration] Starting hydration for tournament: ${tournamentId}`);

    // 1. Re-populate Master Scores (Points)
    // Fetch ALL members and their points for this tournament
    const memberScores = await db
      .select({
        memberId: T_TournamentMember.memberId,
        points: T_TournamentMember.points,
      })
      .from(T_TournamentMember)
      .where(eq(T_TournamentMember.tournamentId, tournamentId));

    console.log(`[Hydration] Found ${memberScores.length} members to cache.`);

    if (memberScores.length > 0) {
      const pipeline = redis.pipeline();
      // Clear the old key to ensure no stale data
      pipeline.del(`tournament:${tournamentId}:master_scores`);

      // Batch ZADD commands
      // ZADD key score member
      for (const row of memberScores) {
        pipeline.zadd(`tournament:${tournamentId}:master_scores`, row.points || 0, row.memberId);
      }

      await pipeline.exec();
      console.log(`[Hydration] Master scores cached in Redis.`);
    }

    // 2. Re-populate League Memberships (Sets)
    const leagueMemberships = await db
      .select({
        leagueId: T_LeagueRole.leagueId,
        memberId: T_LeagueRole.memberId,
      })
      .from(T_LeagueRole)
      .innerJoin(T_LeagueTournament, eq(T_LeagueRole.leagueId, T_LeagueTournament.leagueId))
      .where(eq(T_LeagueTournament.tournamentId, tournamentId));

    console.log(`[Hydration] Found ${leagueMemberships.length} league memberships to cache.`);

    if (leagueMemberships.length > 0) {
      const pipeline = redis.pipeline();

      // Group by League ID to minimize pipeline calls (optional, but cleaner logging)
      // Actually, standard pipeline handles thousands of commands fine.

      for (const row of leagueMemberships) {
        // SADD league:{id}:members {memberId}
        pipeline.sadd(`league:${row.leagueId}:members`, row.memberId);
      }

      await pipeline.exec();
      console.log(`[Hydration] League membership sets cached in Redis.`);
    }

    console.log(`[Hydration] Hydration complete for tournament: ${tournamentId}`);
  },
};
