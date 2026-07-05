/**
 * Retry with Exponential Backoff Utility
 *
 * Retries a failed operation with increasing delays between attempts.
 * Useful for transient failures like network issues or rate limiting.
 *
 * Default Strategy:
 * - Attempt 1: Immediate
 * - Attempt 2: Wait 30 seconds, then retry
 * - Attempt 3: Wait 60 seconds, then retry
 * - Attempt 4: Wait 120 seconds, then retry
 *
 * If all attempts fail, throws the last error
 */

export type RetryOptions = {
  /**
   * Maximum number of retry attempts (default: 3)
   */
  maxAttempts?: number;

  /**
   * Delay in seconds for each attempt
   * Default: [30, 60, 120] (exponential backoff)
   */
  delays?: number[];

  /**
   * Callback called before each retry
   * Useful for logging
   */
  onRetry?: (attempt: number, error: Error, delaySeconds: number) => void;

  /**
   * Callback called when all retries fail
   * Useful for final error handling/alerting
   */
  onFinalFailure?: (error: Error, attempts: number) => void;
};

/**
 * Sleep for a given number of seconds
 * Exported for testing purposes
 */
export function sleep(seconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

/**
 * Retry an async operation with exponential backoff
 *
 * @param operation - The async function to retry
 * @param options - Retry configuration
 * @returns The result of the operation if successful
 * @throws The last error if all attempts fail
 *
 * @example
 * ```typescript
 * const result = await retryWithBackoff(
 *   () => fetchMatchData(matchId),
 *   {
 *     maxAttempts: 3,
 *     onRetry: (attempt, error, delay) => {
 *       console.log(`Attempt ${attempt} failed: ${error.message}`);
 *       console.log(`Retrying in ${delay} seconds...`);
 *     },
 *     onFinalFailure: (error, attempts) => {
 *       Sentry.captureException(error);
 *     }
 *   }
 * );
 * ```
 */
export async function retryWithBackoff<T>(operation: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const {
    maxAttempts = 3,
    delays = [30, 60, 120], // Default exponential backoff
    onRetry,
    onFinalFailure,
  } = options;

  let lastError: Error | null = null;
  let attempt = 0;

  while (attempt <= maxAttempts) {
    try {
      // Attempt the operation
      const result = await operation();
      return result; // Success!
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      attempt++;

      // If we've exhausted all attempts, give up
      if (attempt > maxAttempts) {
        if (onFinalFailure) {
          onFinalFailure(lastError, attempt);
        }
        throw lastError;
      }

      // Calculate delay for this retry
      const delaySeconds = delays[attempt - 1] || delays[delays.length - 1];

      // Call retry callback if provided
      if (onRetry) {
        onRetry(attempt, lastError, delaySeconds);
      }

      // Wait before retrying
      await sleep(delaySeconds);
    }
  }

  // This should never be reached, but TypeScript requires it
  throw lastError || new Error('Unknown error during retry');
}
