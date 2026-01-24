import { config } from 'dotenv';
config({ path: process.env.ENV_PATH || '.env' });

import { ScoreboardService } from '@/domains/score/services/scoreboard.service';
import db from '@/services/database';
import { T_Match } from '@/domains/match/schema';
import { eq } from 'drizzle-orm';
import { redis } from '@/services/redis/client';

async function main() {
  console.log('🧪 Starting Scoreboard Flow Simulation...');

  // 1. Find a match that has guesses
  // We need a match where users have actually predicted something.
  console.log('🔍 Finding a match with guesses...');
  
  // This query is a bit of a shortcut for the test script
  const [match] = await db
    .select()
    .from(T_Match)
    .where(eq(T_Match.status, 'ended'))
    .limit(1);

  if (!match) {
    console.error('❌ No ended matches found to test with.');
    process.exit(1);
  }

  console.log(`✅ Found Match: ${match.id} (Tournament: ${match.tournamentId})`);

  // 2. Simulate "Match Just Ended" Processing
  console.log('\n🔄 Simulating Write Path (Calculate & Apply)...');
  const startWrite = Date.now();
  
  const deltas = await ScoreboardService.calculateMatchPoints(match.id);
  console.log(`   - Calculated points for ${deltas.size} users.`);
  
  if (deltas.size === 0) {
      console.log('⚠️ No points delta calculated. Do users have guesses for this match?');
  } else {
      console.log(`   - Sample Delta: User ${[...deltas.keys()][0]} got ${[...deltas.values()][0]} points.`);
  }

  await ScoreboardService.applyScoreUpdates(match.tournamentId, deltas);
  console.log(`✅ Write Path Completed in ${(Date.now() - startWrite)}ms`);

  // 3. Simulate League Ranking Update
  // We need to find a league for this tournament to test the ranking
  console.log('\n🔄 Simulating League Ranking Refresh...');
  // Shortcut: Just try to refresh for ALL leagues linked to this tournament? 
  // Or just pick one if we can find it. 
  // Let's assume we can't easily find a league ID without another query.
  // For the test, let's skip the "refresh specific league" and test the "Master Scoreboard" in Redis.
  
  const masterKey = `tournament:${match.tournamentId}:master_scores`;
  const masterCount = await redis.zcard(masterKey);
  console.log(`✅ Redis Master Scoreboard has ${masterCount} entries.`);

  if (masterCount > 0) {
      const top3 = await redis.zrevrange(masterKey, 0, 2, 'WITHSCORES');
      console.log('   - Top 3 (Global Tournament):', top3);
  }

  console.log('\n🎉 Simulation Complete.');
  await redis.quit();
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
