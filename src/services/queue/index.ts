import { PgBoss } from 'pg-boss';
import { env } from '../../config/env';

let boss: PgBoss | null = null;

async function initializeQueue(): Promise<PgBoss | null> {
  if (!env.DB_STRING_CONNECTION) {
    console.warn('⚠️ Queue not configured - DB_STRING_CONNECTION not set');
    return null;
  }

  try {
    boss = new PgBoss({
      connectionString: env.DB_STRING_CONNECTION,
      schema: 'pgboss', // Use separate schema for pg-boss tables
      max: 2, // Max 2 connections (keep it lightweight)
      noScheduling: false, // Enable scheduled/delayed jobs
      retryDelay: 30, // Default retry delay: 30 seconds
      retryLimit: 3, // Default retry limit: 3 attempts
      expireInHours: 24, // Auto-clean jobs after 24 hours
    });

    await boss.start();
    console.log('✅ pg-boss queue initialized successfully');
    return boss;
  } catch (error) {
    console.error('❌ Failed to initialize pg-boss:', error instanceof Error ? error.message : String(error));

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

// Export a function that returns the queue instance
export async function getQueue(): Promise<PgBoss | null> {
  await queuePromise;
  return boss;
}

// Export for graceful shutdown
export async function stopQueue(): Promise<void> {
  if (boss) {
    await boss.stop();
    console.log('✅ pg-boss queue stopped gracefully');
  }
}

export default { getQueue, stopQueue };
