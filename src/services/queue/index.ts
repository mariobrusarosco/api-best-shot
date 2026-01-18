/**
 * Queue Service
 *
 * Main entry point for queue operations. Uses adapter pattern
 * to abstract the underlying queue implementation (pg-boss).
 *
 * To swap queue providers (e.g., to Bull/BullMQ):
 * 1. Create new adapter implementing IQueue interface
 * 2. Replace PgBossAdapter with new adapter here
 * 3. No changes needed in application code!
 */

import { PgBossAdapter } from './pg-boss-adapter';
import type { IQueue } from './queue.interface';
import { env } from '../../config/env';

let queue: IQueue | null = null;

async function initializeQueue(): Promise<IQueue | null> {
  if (!env.DB_STRING_CONNECTION) {
    console.warn('⚠️ Queue not configured - DB_STRING_CONNECTION not set');
    return null;
  }

  try {
    // Create adapter instance
    queue = new PgBossAdapter(env.DB_STRING_CONNECTION);

    // Start the queue
    await queue.start();
    console.log('✅ Queue service initialized successfully');
    return queue;
  } catch (error) {
    console.error('❌ Failed to initialize queue:', error instanceof Error ? error.message : String(error));

    // Don't exit in production - let app run without queue
    if (env.NODE_ENV === 'development') {
      process.exit(1);
    } else {
      console.warn('⚠️ Continuing without queue in non-development environment');
      return null;
    }
  }
}

// Initialize on module load
const queuePromise = initializeQueue();

/**
 * Get the queue instance
 *
 * Returns the initialized queue or null if initialization failed.
 * Always await this function before using the queue.
 *
 * @example
 * ```typescript
 * const queue = await getQueue();
 * if (queue) {
 *   await queue.send('my-job', { data: 'test' });
 * }
 * ```
 */
export async function getQueue(): Promise<IQueue | null> {
  await queuePromise;
  return queue;
}

/**
 * Stop the queue gracefully
 *
 * Call this during application shutdown to ensure
 * all jobs are properly cleaned up.
 *
 * @example
 * ```typescript
 * process.on('SIGTERM', async () => {
 *   await stopQueue();
 *   process.exit(0);
 * });
 * ```
 */
export async function stopQueue(): Promise<void> {
  if (queue) {
    await queue.stop();
    console.log('✅ Queue service stopped gracefully');
  }
}

// Named exports
export { IQueue, JobOptions, JobHandler, QueueJob, WorkerOptions } from './queue.interface';

// Default export
export default { getQueue, stopQueue };
