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

import { BaseScraper } from '@/domains/data-provider/providers/playwright/base-scraper';
import { MatchUpdateOrchestratorService } from '@/domains/scheduler/services/match-update-orchestrator.service';
import Logger from '@/services/logger';
import { DOMAINS } from '@/services/logger/constants';
import { getQueue, stopQueue } from '@/services/queue';
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
    Logger.info('[Scheduler] Initializing browser...');
    scraper = await BaseScraper.createInstance();
    Logger.info('[Scheduler] Browser initialized successfully');
  }
  return scraper;
}

/**
 * Match update cron job
 * Runs every 10 minutes to find and update matches
 */
async function runMatchUpdateJob() {
  if (isShuttingDown) {
    Logger.info('[MatchUpdateCron] Shutdown in progress, skipping execution');
    return;
  }

  Logger.info('\n=== [MatchUpdateCron] Starting scheduled execution ===');
  Logger.info(`[MatchUpdateCron] Time: ${new Date().toISOString()}`);

  try {
    const scraperInstance = await initializeScraper();
    const orchestrator = new MatchUpdateOrchestratorService(scraperInstance);

    // Get stats before update
    const statsBefore = await orchestrator.getStats();
    Logger.info(`[MatchUpdateCron] Matches needing update: ${statsBefore.matchesNeedingUpdate}`);

    // Run the update process
    const result = await orchestrator.processMatchUpdates();

    Logger.info('[MatchUpdateCron] Results:');
    Logger.info(`  ✅ Processed: ${result.processed}`);

    // Queue-based results
    if (result.queued !== undefined) {
      Logger.info(`  📋 Queued: ${result.queued}`);
      Logger.info(`  ⚡ Processing: Concurrent (workers will process jobs in background)`);
    }

    // Direct processing results
    if (result.successful !== undefined) {
      Logger.info(`  ✅ Successful: ${result.successful}`);
      Logger.info(`  ❌ Failed: ${result.failed}`);
      Logger.info(`  📊 Standings Updated: ${result.standingsUpdated}`);
    }

    Logger.info('=== [MatchUpdateCron] Completed ===\n');
  } catch (error) {
    Logger.error(error as Error, {
      domain: DOMAINS.DATA_PROVIDER,
      component: 'scheduler',
      operation: 'runMatchUpdateJob',
    });
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
    Logger.info('[Scheduler] Already shutting down...');
    return;
  }

  isShuttingDown = true;
  Logger.info(`\n[Scheduler] Received ${signal}, shutting down gracefully...`);

  try {
    // Stop queue workers first (allows current jobs to finish)
    Logger.info('[Scheduler] Stopping queue workers...');
    await stopQueue();
    Logger.info('[Scheduler] ✅ Queue workers stopped');

    // Close browser
    if (scraper) {
      Logger.info('[Scheduler] Closing browser...');
      await scraper.close();
      scraper = null;
      Logger.info('[Scheduler] ✅ Browser closed');
    }

    Logger.info('[Scheduler] 🎉 Shutdown complete');
    process.exit(0);
  } catch (error) {
    Logger.error(error as Error, {
      domain: DOMAINS.DATA_PROVIDER,
      component: 'scheduler',
      operation: 'shutdown',
    });
    process.exit(1);
  }
}

/**
 * Start all cron jobs
 */
async function startCronJobs() {
  Logger.info('\n========================================');
  Logger.info('🚀 Best Shot Scheduler Starting...');
  Logger.info('========================================\n');

  Logger.info('Configuration:', {
    matchPollingEnabled: MATCH_POLLING_ENABLED,
    schedule: CRON_SCHEDULE,
    desc: getCronDescription(CRON_SCHEDULE),
    env: process.env.NODE_ENV || 'development',
  });

  if (!MATCH_POLLING_ENABLED) {
    Logger.info('⚠️  Match polling is DISABLED');
    Logger.info('   Set MATCH_POLLING_ENABLED=true to enable\n');
    return;
  }

  // Initialize queue and workers for concurrent processing
  Logger.info('[Scheduler] Initializing queue and workers...');
  try {
    const queue = await getQueue();

    if (queue) {
      // Queue available - initialize workers for concurrent processing
      Logger.info('[Scheduler] ✅ Queue service available');

      // Initialize browser for workers
      const scraperInstance = await initializeScraper();
      const orchestrator = new MatchUpdateOrchestratorService(scraperInstance);

      // Register workers
      await orchestrator.registerWorkers(queue);
      Logger.info('[Scheduler] ✅ Queue workers initialized successfully');

      Logger.info('[Scheduler] Queue Configuration:', {
        queueName: 'update-match',
        workers: 10,
        concurrency: 1,
        processingMode: 'Concurrent (background workers)',
      });
    } else {
      // Queue unavailable - will fall back to direct processing
      Logger.info('[Scheduler] ⚠️  Queue service unavailable');
      Logger.info('[Scheduler] Mode: Sequential processing (fallback)');
    }
  } catch (error) {
    // Queue initialization failed - graceful degradation
    Logger.error(error as Error, {
      domain: DOMAINS.DATA_PROVIDER,
      component: 'scheduler',
      operation: 'initializeQueue',
    });
    Logger.info('[Scheduler] Mode: Sequential processing (fallback)');
  }

  // Schedule match update job
  Logger.info('[Scheduler] Scheduling match update cron job...');
  cron.schedule(CRON_SCHEDULE, runMatchUpdateJob, {
    timezone: 'UTC',
  });

  Logger.info('✅ Match update cron job scheduled successfully\n');

  // Run once immediately on startup (optional - comment out if not desired)
  Logger.info('[Scheduler] Running initial match update...');
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
  Logger.error(reason instanceof Error ? reason : new Error(String(reason)), {
    domain: DOMAINS.DATA_PROVIDER,
    component: 'scheduler',
    operation: 'unhandledRejection',
  });
});

process.on('uncaughtException', error => {
  Logger.error(error, {
    domain: DOMAINS.DATA_PROVIDER,
    component: 'scheduler',
    operation: 'uncaughtException',
  });
  shutdown('UNCAUGHT_EXCEPTION');
});

// Start the scheduler
startCronJobs().catch(error => {
  Logger.error(error, {
    domain: DOMAINS.DATA_PROVIDER,
    component: 'scheduler',
    operation: 'startCronJobs',
  });
  process.exit(1);
});
