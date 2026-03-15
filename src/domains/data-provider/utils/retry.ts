/**
 * Data Provider Retry Utilities
 *
 * Domain-specific retry logic for external data fetching operations
 * (scraping, API calls, etc.)
 */

import Logger from '@/core/logger';
import { DOMAINS } from '@/core/logger/constants';
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
      Logger.warn(`[Retry] ${context} — Attempt ${attempt} failed: ${error.message}. Retrying in ${delay}s...`, {
        domain: DOMAINS.DATA_PROVIDER,
        component: 'service',
        operation: 'retryMatchOperation',
        attempt: attempt.toString(),
        delay: delay.toString(),
      });
    },
    onFinalFailure: (error, attempts) => {
      Logger.error(error, {
        domain: DOMAINS.DATA_PROVIDER,
        component: 'service',
        operation: 'retryMatchOperation',
        context: 'final_failure',
        totalAttempts: attempts.toString(),
      });
    },
  });
}
