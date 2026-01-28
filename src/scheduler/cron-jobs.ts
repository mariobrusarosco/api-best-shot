/**
 * Cron Jobs Entry Point
 *
 * Manages automated scheduled tasks using Node-cron (NOT AWS Scheduler/EventBridge):
 * - Match updates (every 10 minutes)
 * - Future: Standings updates, score calculations, etc.
 *
 * Usage:
 *   Local: yarn scheduler
 *   Production: Runs as separate Railway service (Node.js process)
 */

import { config } from 'dotenv';
// Initialize Sentry and Environment variables before other imports
config({ path: process.env.ENV_PATH || '.env' });
require('@/services/profiling/sentry-instrument'); // Initialize Sentry

import { BaseScraper } from '@/domains/data-provider/providers/playwright/base-scraper';
import { MatchUpdateOrchestratorService } from '@/domains/scheduler/services/match-update-orchestrator.service';
import { logError, logInfo } from '@/services/logger';
import { getQueue, stopQueue } from '@/services/queue';
import * as Sentry from '@sentry/node';
import cron from 'node-cron';

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
    logInfo('[Scheduler] Initializing browser...');
    scraper = await BaseScraper.createInstance();
    logInfo('[Scheduler] Browser initialized successfully');
  }
  return scraper;
}

/**
 * Match update cron job
 * Runs every 10 minutes to find and update matches
 */
async function runMatchUpdateJob() {
  if (isShuttingDown) {
    logInfo('[MatchUpdateCron] Shutdown in progress, skipping execution');
    return;
  }

  logInfo('\n=== [MatchUpdateCron] Starting scheduled execution ===');
  logInfo(`[MatchUpdateCron] Time: ${new Date().toISOString()}`);

  try {
    const scraperInstance = await initializeScraper();
    const orchestrator = new MatchUpdateOrchestratorService(scraperInstance);

    // Get stats before update
    const statsBefore = await orchestrator.getStats();
    logInfo(`[MatchUpdateCron] Matches needing update: ${statsBefore.matchesNeedingUpdate}`);

    // Run the update process
    const result = await orchestrator.processMatchUpdates();

    logInfo('[MatchUpdateCron] Results:');
    logInfo(`  ✅ Processed: ${result.processed}`);

    // Queue-based results
    if (result.queued !== undefined) {
      logInfo(`  📋 Queued: ${result.queued}`);
      logInfo(`  ⚡ Processing: Concurrent (workers will process jobs in background)`);
    }

    // Direct processing results
    if (result.successful !== undefined) {
      logInfo(`  ✅ Successful: ${result.successful}`);
      logInfo(`  ❌ Failed: ${result.failed}`);
      logInfo(`  📊 Standings Updated: ${result.standingsUpdated}`);
    }

    logInfo('=== [MatchUpdateCron] Completed ===\n');
  } catch (error) {
    logError('[MatchUpdateCron] Job failed:', error instanceof Error ? error : new Error(String(error)));
    Sentry.captureException(error);
  }
}

/**
 * Graceful shutdown handler
 *
 * Ensures clean shutdown of:
 * 1. Queue workers (allows current jobs to complete)
 * 2. Browser instance
 */
async function shutdown(signal: string) {
  if (isShuttingDown) {
    logInfo('[Scheduler] Already shutting down...');
    return;
  }

  isShuttingDown = true;
  logInfo(`\n[Scheduler] Received ${signal}, shutting down gracefully...`);

  try {
    // Stop queue workers first (allows current jobs to finish)
    logInfo('[Scheduler] Stopping queue workers...');
    await stopQueue();
    logInfo('[Scheduler] ✅ Queue workers stopped');

    // Close browser
    if (scraper) {
      logInfo('[Scheduler] Closing browser...');
      await scraper.close();
      scraper = null;
      logInfo('[Scheduler] ✅ Browser closed');
    }

    logInfo('[Scheduler] 🎉 Shutdown complete');
    process.exit(0);
  } catch (error) {
    logError('[Scheduler] ❌ Error during shutdown:', error instanceof Error ? error : new Error(String(error)));
    Sentry.captureException(error);
    process.exit(1);
  }
}

/**
 * Start all cron jobs
 */
async function startCronJobs() {
  logInfo('\n========================================');
  logInfo('🚀 Best Shot Scheduler Starting...');
  logInfo('========================================\n');

  logInfo('Configuration:', {
    matchPollingEnabled: MATCH_POLLING_ENABLED,
    schedule: CRON_SCHEDULE,
    desc: getCronDescription(CRON_SCHEDULE),
    env: process.env.NODE_ENV || 'development',
  });

  if (!MATCH_POLLING_ENABLED) {
    logInfo('⚠️  Match polling is DISABLED');
    logInfo('   Set MATCH_POLLING_ENABLED=true to enable\n');
    return;
  }

  // Initialize queue and workers for concurrent processing
  logInfo('[Scheduler] Initializing queue and workers...');
  try {
    const queue = await getQueue();

    if (queue) {
      // Queue available - initialize workers for concurrent processing
      logInfo('[Scheduler] ✅ Queue service available');

      // Initialize browser for workers
      const scraperInstance = await initializeScraper();
      const orchestrator = new MatchUpdateOrchestratorService(scraperInstance);

      // Register workers
      await orchestrator.registerWorkers(queue);
      logInfo('[Scheduler] ✅ Queue workers initialized successfully');

      logInfo('[Scheduler] Queue Configuration:', {
        queueName: 'update-match',
        workers: 10,
        concurrency: 1,
        processingMode: 'Concurrent (background workers)',
      });
    } else {
      // Queue unavailable - will fall back to direct processing
      logInfo('[Scheduler] ⚠️  Queue service unavailable');
      logInfo('[Scheduler] Mode: Sequential processing (fallback)');
    }
  } catch (error) {
    // Queue initialization failed - graceful degradation
    logError('[Scheduler] ⚠️  Failed to initialize queue:', error instanceof Error ? error : new Error(String(error)));
    logInfo('[Scheduler] Mode: Sequential processing (fallback)');
  }

  // Schedule match update job
  logInfo('[Scheduler] Scheduling match update cron job...');
  cron.schedule(CRON_SCHEDULE, runMatchUpdateJob, {
    timezone: 'UTC',
  });

  logInfo('✅ Match update cron job scheduled successfully\n');

  // Run once immediately on startup (optional - comment out if not desired)
  logInfo('[Scheduler] Running initial match update...');
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
process.on('unhandledRejection', reason => {
  logError('[Scheduler] Unhandled Rejection at:', new Error(String(reason)));
  Sentry.captureException(reason);
});

process.on('uncaughtException', error => {
  logError('[Scheduler] Uncaught Exception:', error);
  Sentry.captureException(error);
  shutdown('UNCAUGHT_EXCEPTION');
});

// Start the scheduler
startCronJobs().catch(error => {
  logError('[Scheduler] Failed to start:', error);
  Sentry.captureException(error);
  process.exit(1);
});
