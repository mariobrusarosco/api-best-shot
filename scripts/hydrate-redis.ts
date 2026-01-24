import { config } from 'dotenv';
// Load environment variables immediately
config({ path: process.env.ENV_PATH || '.env' });

import { redis } from '@/services/redis/client';
import { ScoreboardHydrationService } from '@/services/scoreboard/hydration.service';

async function main() {
  const tournamentId = process.argv[2];

  if (!tournamentId) {
    console.error('❌ Error: Tournament ID is required.');
    console.error('Usage: yarn hydrate:scoreboard <tournamentId>');
    process.exit(1);
  }

  console.log(`🌊 Starting Hydration for Tournament: ${tournamentId}`);

  try {
    const start = Date.now();
    await ScoreboardHydrationService.hydrateTournament(tournamentId);
    const end = Date.now();

    console.log(`✅ Hydration Completed in ${(end - start) / 1000}s`);

    // We need to disconnect Redis to let the script exit gracefully
    await redis.quit();
    process.exit(0);
  } catch (error) {
    console.error(`❌ Hydration Failed:`, error);
    await redis.quit();
    process.exit(1);
  }
}

main();
