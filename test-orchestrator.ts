/**
 * Test script for Match Update Orchestrator
 *
 * This will:
 * 1. Find matches needing updates (status='open', finished yesterday)
 * 2. Update them using SofaScore API
 * 3. Trigger standings updates for matches that ended
 * 4. Create execution tracking records
 */

import { BaseScraper } from './src/domains/data-provider/providers/playwright/base-scraper';
import { MatchUpdateOrchestratorService } from './src/domains/scheduler/services/match-update-orchestrator.service';

async function testOrchestrator() {
  console.log('=== Match Update Orchestrator Test ===\n');

  let scraper: BaseScraper | null = null;

  try {
    // Initialize scraper
    console.log('[1/3] Initializing browser...');
    scraper = await BaseScraper.createInstance();
    console.log('✅ Browser ready\n');

    // Create orchestrator
    console.log('[2/3] Running orchestrator...');
    const orchestrator = new MatchUpdateOrchestratorService(scraper);

    // Check stats before
    const statsBefore = await orchestrator.getStats();
    console.log('📊 Stats before:', statsBefore);
    console.log('');

    // Process match updates
    const result = await orchestrator.processMatchUpdates();

    console.log('\n[3/3] Results:');
    console.log('✅ Processed:', result.processed);
    console.log('✅ Successful:', result.successful);
    console.log('❌ Failed:', result.failed);
    console.log('📊 Standings Updated:', result.standingsUpdated);
    console.log('');

    // Check stats after
    const statsAfter = await orchestrator.getStats();
    console.log('📊 Stats after:', statsAfter);

    console.log('\n=== Test Complete ===');
    console.log('Next: Check Drizzle Studio for execution records!');
    console.log('Run: yarn db:studio');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  } finally {
    if (scraper) {
      console.log('\nClosing browser...');
      await scraper.close();
    }
  }
}

// Run test
testOrchestrator();
