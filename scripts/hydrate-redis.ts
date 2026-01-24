import { config } from 'dotenv';
// Load environment variables immediately
config({ path: process.env.ENV_PATH || '.env' });

import { ScoreboardHydrationService } from '@/services/scoreboard/hydration.service';
import { redis } from '@/services/redis/client';
import db from '@/services/database';
import { T_Tournament } from '@/domains/tournament/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const tournamentIdArg = process.argv[2];

  try {
    const tournamentIds: string[] = [];

    if (tournamentIdArg) {
      tournamentIds.push(tournamentIdArg);
    } else {
      console.log('🔍 No Tournament ID provided. Finding all active tournaments...');
      const rows = await db
        .select({ id: T_Tournament.id })
        .from(T_Tournament)
        .where(eq(T_Tournament.status, 'active'));
      
      rows.forEach(row => tournamentIds.push(row.id));
      console.log(`✅ Found ${tournamentIds.length} active tournaments.`);
    }

    if (tournamentIds.length === 0) {
      console.log('⚠️ No active tournaments to hydrate.');
      process.exit(0);
    }

    const start = Date.now();
    
    for (const tid of tournamentIds) {
      console.log(`
🌊 Starting Hydration for Tournament: ${tid}`);
      await ScoreboardHydrationService.hydrateTournament(tid);
    }

    const end = Date.now();
    console.log(`
✅ All Hydrations Completed in ${(end - start) / 1000}s`);
    
    await redis.quit();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Hydration Failed:', error);
    await redis.quit();
    process.exit(1);
  }
}

main();