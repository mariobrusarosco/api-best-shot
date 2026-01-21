/**
 * Data Provider Retry Utilities
 *
 * Domain-specific retry logic for external data fetching operations
 * (scraping, API calls, etc.)
 */

import * as Sentry from '@sentry/node';
import { retryWithBackoff } from '@/utils/retry-with-backoff';

/**
 * Retry with default settings optimized for match scraping
 *
 * - 3 attempts total (1 initial + 2 retries)
 * - Delays: 30s, 60s, 120s (exponential backoff)
 * - Logs retries to console
 * - Reports final failures to Sentry
 *
 * @param operation - The async function to retry
 * @param context - Context string for logging (e.g., "Match scraping for match-123")
 * @returns The result of the operation if successful
 *
 * @example
 * ```typescript
 * const matchData = await retryMatchOperation(
 *   () => scrapeMatch(matchId),
 *   `Match scraping for ${matchId}`
 * );
 * ```
 */
export async function retryMatchOperation<T>(operation: () => Promise<T>, context: string): Promise<T> {
  return retryWithBackoff(operation, {
    maxAttempts: 3,
    delays: [30, 60, 120],
    onRetry: (attempt, error, delay) => {
      console.warn(`[Retry] ${context}`);
      console.warn(`  Attempt ${attempt} failed: ${error.message}`);
      console.warn(`  Retrying in ${delay} seconds...`);
    },
    onFinalFailure: (error, attempts) => {
      console.error(`[Retry] ${context}`);
      console.error(`  All ${attempts} attempts failed!`);
      console.error(`  Final error: ${error.message}`);

      // Report to Sentry with context
      Sentry.captureException(error, {
        tags: {
          retry_context: context,
          retry_attempts: attempts.toString(),
        },
        level: 'error',
        extra: {
          context,
          totalAttempts: attempts,
          errorMessage: error.message,
          errorStack: error.stack,
        },
      });
    },
  });
}
