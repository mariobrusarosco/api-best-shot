/**
 * Cron Jobs Entry Point
 *
 * Manages automated scheduled tasks:
 * - Match updates (every 10 minutes)
 * - Future: Standings updates, score calculations, etc.
 *
 * Usage:
 *   Local: yarn scheduler
 *   Production: Runs as separate Railway service
 */

import cron from 'node-cron';
import { BaseScraper } from '@/domains/data-provider/providers/playwright/base-scraper';
import { MatchUpdateOrchestratorService } from '@/domains/scheduler/services/match-update-orchestrator.service';

// Environment configuration
const MATCH_POLLING_ENABLED = process.env.MATCH_POLLING_ENABLED === 'true';
const CRON_SCHEDULE = process.env.MATCH_POLLING_CRON || '*/10 * * * *'; // Default: every 10 minutes

// Shared scraper instance (reused across cron jobs)
let scraper: BaseScraper | null = null;
let isShuttingDown = false;

/**
 * Initialize the shared browser instance
 */
async function initializeScraper(): Promise<BaseScraper> {
  if (!scraper) {
    console.log('[Scheduler] Initializing browser...');
    scraper = await BaseScraper.createInstance();
    console.log('[Scheduler] Browser initialized successfully');
  }
  return scraper;
}

/**
 * Match update cron job
 * Runs every 10 minutes to find and update matches
 */
async function runMatchUpdateJob() {
  if (isShuttingDown) {
    console.log('[MatchUpdateCron] Shutdown in progress, skipping execution');
    return;
  }

  console.log('\n=== [MatchUpdateCron] Starting scheduled execution ===');
  console.log(`[MatchUpdateCron] Time: ${new Date().toISOString()}`);

  try {
    const scraperInstance = await initializeScraper();
    const orchestrator = new MatchUpdateOrchestratorService(scraperInstance);

    // Get stats before update
    const statsBefore = await orchestrator.getStats();
    console.log(`[MatchUpdateCron] Matches needing update: ${statsBefore.matchesNeedingUpdate}`);

    // Run the update process
    const result = await orchestrator.processMatchUpdates();

    console.log('[MatchUpdateCron] Results:');
    console.log(`  ✅ Processed: ${result.processed}`);
    console.log(`  ✅ Successful: ${result.successful}`);
    console.log(`  ❌ Failed: ${result.failed}`);
    console.log(`  📊 Standings Updated: ${result.standingsUpdated}`);
    console.log('=== [MatchUpdateCron] Completed ===\n');
  } catch (error) {
    console.error('[MatchUpdateCron] Job failed:', error);
  }
}

/**
 * Graceful shutdown handler
 */
async function shutdown(signal: string) {
  if (isShuttingDown) {
    console.log('[Scheduler] Already shutting down...');
    return;
  }

  isShuttingDown = true;
  console.log(`\n[Scheduler] Received ${signal}, shutting down gracefully...`);

  try {
    if (scraper) {
      console.log('[Scheduler] Closing browser...');
      await scraper.close();
      scraper = null;
    }

    console.log('[Scheduler] Shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('[Scheduler] Error during shutdown:', error);
    process.exit(1);
  }
}

/**
 * Start all cron jobs
 */
async function startCronJobs() {
  console.log('\n========================================');
  console.log('🚀 Best Shot Scheduler Starting...');
  console.log('========================================\n');

  console.log('Configuration:');
  console.log(`  Match Polling Enabled: ${MATCH_POLLING_ENABLED}`);
  console.log(`  Match Polling Schedule: ${CRON_SCHEDULE} (${getCronDescription(CRON_SCHEDULE)})`);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('');

  if (!MATCH_POLLING_ENABLED) {
    console.log('⚠️  Match polling is DISABLED');
    console.log('   Set MATCH_POLLING_ENABLED=true to enable\n');
    return;
  }

  // Schedule match update job
  console.log('[Scheduler] Scheduling match update cron job...');
  cron.schedule(CRON_SCHEDULE, runMatchUpdateJob, {
    timezone: 'UTC',
  });

  console.log('✅ Match update cron job scheduled successfully\n');

  // Run once immediately on startup (optional - comment out if not desired)
  console.log('[Scheduler] Running initial match update...');
  await runMatchUpdateJob();
}

/**
 * Get human-readable description of cron schedule
 */
function getCronDescription(schedule: string): string {
  if (schedule === '*/10 * * * *') return 'Every 10 minutes';
  if (schedule === '*/5 * * * *') return 'Every 5 minutes';
  if (schedule === '*/15 * * * *') return 'Every 15 minutes';
  if (schedule === '0 * * * *') return 'Every hour';
  return 'Custom schedule';
}

// Register shutdown handlers
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Scheduler] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', error => {
  console.error('[Scheduler] Uncaught Exception:', error);
  shutdown('UNCAUGHT_EXCEPTION');
});

// Start the scheduler
startCronJobs().catch(error => {
  console.error('[Scheduler] Failed to start:', error);
  process.exit(1);
});
