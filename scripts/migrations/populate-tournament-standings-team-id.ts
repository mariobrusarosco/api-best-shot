/**
 * Data Migration: Populate team_id in tournament_standings
 *
 * This script populates the `team_id` column in `tournament_standings` by looking up
 * the corresponding `team.id` using `team.external_id = tournament_standings.team_external_id`.
 *
 * Run this AFTER applying migration 0015 (which adds team_id column as nullable)
 * and BEFORE making team_id NOT NULL.
 */

import { T_TournamentStandings } from '@/domains/tournament/schema';
import db from '@/services/database';
import { isNull, sql } from 'drizzle-orm';

async function populateTournamentStandingsTeamId() {
  console.log('🚀 Starting data migration: Populate tournament_standings.team_id');

  try {
    // Count total standings records
    const [{ count: totalCount }] = await db.select({ count: sql<number>`count(*)` }).from(T_TournamentStandings);

    console.log(`📊 Total tournament_standings records: ${totalCount}`);

    // Count standings with NULL team_id
    const [{ count: nullCount }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(T_TournamentStandings)
      .where(isNull(T_TournamentStandings.teamId));

    console.log(`🔍 Standings with NULL team_id: ${nullCount}`);

    if (nullCount === 0) {
      console.log('✅ All standings already have team_id populated. Nothing to do.');
      return;
    }

    // Perform the UPDATE using a JOIN
    // SQL: UPDATE tournament_standings SET team_id = team.id
    //      FROM team
    //      WHERE tournament_standings.team_external_id = team.external_id
    //        AND tournament_standings.team_id IS NULL
    const result = await db.execute(sql`
      UPDATE tournament_standings
      SET team_id = team.id
      FROM team
      WHERE tournament_standings.team_external_id = team.external_id
        AND tournament_standings.team_id IS NULL
    `);

    console.log(`✅ Updated records successfully`);

    // Verify: Count standings that still have NULL team_id
    const [{ count: remainingNullCount }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(T_TournamentStandings)
      .where(isNull(T_TournamentStandings.teamId));

    if (remainingNullCount > 0) {
      console.warn(`⚠️  WARNING: ${remainingNullCount} standings still have NULL team_id`);
      console.warn('   These are likely orphaned records (no matching team in the database)');

      // Show details of orphaned records
      const orphaned = await db
        .select({
          id: T_TournamentStandings.id,
          teamExternalId: T_TournamentStandings.teamExternalId,
          shortName: T_TournamentStandings.shortName,
          longName: T_TournamentStandings.longName,
        })
        .from(T_TournamentStandings)
        .where(isNull(T_TournamentStandings.teamId))
        .limit(10);

      console.warn('   Sample orphaned records (first 10):');
      orphaned.forEach(record => {
        console.warn(`   - ${record.shortName} (${record.longName}) [ext_id: ${record.teamExternalId}]`);
      });

      throw new Error('Data migration incomplete. Fix orphaned records before making team_id NOT NULL.');
    }

    console.log('🎉 Data migration complete! All standings have team_id populated.');
  } catch (error) {
    console.error('❌ Data migration failed:', error);
    throw error;
  }
}

// Run the migration
populateTournamentStandingsTeamId()
  .then(() => {
    console.log('✅ Migration script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  });
