/**
 * Tests for Retry with Backoff Utility
 */

import { retryWithBackoff } from './retry-with-backoff';
import { retryMatchOperation } from '@/domains/data-provider/utils/retry';
import * as Sentry from '@sentry/node';

// Mock Sentry
jest.mock('@sentry/node', () => ({
  captureException: jest.fn(),
}));

describe('retryWithBackoff', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should succeed on first attempt', async () => {
    const operation = jest.fn().mockResolvedValue('success');

    const result = await retryWithBackoff(operation);

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and eventually succeed', async () => {
    const operation = jest
      .fn()
      .mockRejectedValueOnce(new Error('Attempt 1 failed'))
      .mockRejectedValueOnce(new Error('Attempt 2 failed'))
      .mockResolvedValueOnce('success on attempt 3');

    const onRetry = jest.fn();

    const retryPromise = retryWithBackoff(operation, {
      maxAttempts: 3,
      onRetry,
    });

    // Fast-forward through all timers
    await jest.runAllTimersAsync();

    const result = await retryPromise;

    expect(result).toBe('success on attempt 3');
    expect(operation).toHaveBeenCalledTimes(3);
    expect(onRetry).toHaveBeenCalledTimes(2); // Called before attempt 2 and 3
  });

  it('should throw error after all retries exhausted', async () => {
    const finalError = new Error('All attempts failed');
    const operation = jest.fn().mockRejectedValue(finalError);
    const onFinalFailure = jest.fn();

    const retryPromise = retryWithBackoff(operation, {
      maxAttempts: 3,
      onFinalFailure,
    }).catch(error => error); // Catch immediately to prevent unhandled rejection

    // Fast-forward through all timers
    await jest.runAllTimersAsync();

    const caughtError = await retryPromise;

    expect(caughtError).toEqual(finalError);
    expect(operation).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    expect(onFinalFailure).toHaveBeenCalledWith(finalError, 4);
  });

  it('should call onRetry callback with correct parameters', async () => {
    const error1 = new Error('First failure');
    const error2 = new Error('Second failure');
    const operation = jest
      .fn()
      .mockRejectedValueOnce(error1)
      .mockRejectedValueOnce(error2)
      .mockResolvedValueOnce('success');

    const onRetry = jest.fn();

    const retryPromise = retryWithBackoff(operation, {
      maxAttempts: 3,
      delays: [30, 60, 120],
      onRetry,
    });

    // Fast-forward through all timers
    await jest.runAllTimersAsync();
    await retryPromise;

    // First retry (after first failure)
    expect(onRetry).toHaveBeenNthCalledWith(1, 1, error1, 30);
    // Second retry (after second failure)
    expect(onRetry).toHaveBeenNthCalledWith(2, 2, error2, 60);
  });

  it('should use last delay for attempts beyond delays array', async () => {
    const operation = jest
      .fn()
      .mockRejectedValueOnce(new Error('Fail 1'))
      .mockRejectedValueOnce(new Error('Fail 2'))
      .mockRejectedValueOnce(new Error('Fail 3'))
      .mockRejectedValueOnce(new Error('Fail 4'))
      .mockResolvedValueOnce('success');

    const onRetry = jest.fn();

    const retryPromise = retryWithBackoff(operation, {
      maxAttempts: 5,
      delays: [10, 20], // Only 2 delays defined
      onRetry,
    });

    // Fast-forward through all timers
    await jest.runAllTimersAsync();
    await retryPromise;

    // First retry: 10s
    expect(onRetry).toHaveBeenNthCalledWith(1, expect.any(Number), expect.any(Error), 10);
    // Second retry: 20s
    expect(onRetry).toHaveBeenNthCalledWith(2, expect.any(Number), expect.any(Error), 20);
    // Third retry: 20s (uses last delay)
    expect(onRetry).toHaveBeenNthCalledWith(3, expect.any(Number), expect.any(Error), 20);
    // Fourth retry: 20s (uses last delay)
    expect(onRetry).toHaveBeenNthCalledWith(4, expect.any(Number), expect.any(Error), 20);
  });

  it('should handle non-Error objects thrown', async () => {
    const operation = jest.fn().mockRejectedValue('string error');

    const retryPromise = retryWithBackoff(operation, {
      maxAttempts: 1,
    }).catch(error => error); // Catch immediately to prevent unhandled rejection

    await jest.runAllTimersAsync();

    const caughtError = await retryPromise;

    expect(caughtError).toBeInstanceOf(Error);
    expect((caughtError as Error).message).toBe('string error');
  });

  it('should use default options when none provided', async () => {
    const operation = jest
      .fn()
      .mockRejectedValueOnce(new Error('Fail 1'))
      .mockRejectedValueOnce(new Error('Fail 2'))
      .mockRejectedValueOnce(new Error('Fail 3'))
      .mockResolvedValueOnce('success');

    const retryPromise = retryWithBackoff(operation);

    await jest.runAllTimersAsync();
    const result = await retryPromise;

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(4); // 1 initial + 3 retries (default maxAttempts)
  });
});

describe('retryMatchOperation', () => {
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks(); // Clear all mocks including Sentry
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should log retry attempts with context', async () => {
    const operation = jest
      .fn()
      .mockRejectedValueOnce(new Error('Network timeout'))
      .mockResolvedValueOnce({ matchId: '123', status: 'success' });

    const retryPromise = retryMatchOperation(operation, 'Match scraping for match-123');

    await jest.runAllTimersAsync();
    const result = await retryPromise;

    expect(result).toEqual({ matchId: '123', status: 'success' });
    expect(consoleWarnSpy).toHaveBeenCalledWith('[Retry] Match scraping for match-123');
    expect(consoleWarnSpy).toHaveBeenCalledWith('  Attempt 1 failed: Network timeout');
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('  Retrying in'));
  });

  it('should log final failure after all retries', async () => {
    const operation = jest.fn().mockRejectedValue(new Error('Persistent failure'));

    const retryPromise = retryMatchOperation(operation, 'Match update for match-456').catch(
      error => error
    ); // Catch immediately to prevent unhandled rejection

    await jest.runAllTimersAsync();

    const caughtError = await retryPromise;

    expect(caughtError).toBeInstanceOf(Error);
    expect((caughtError as Error).message).toBe('Persistent failure');
    expect(consoleErrorSpy).toHaveBeenCalledWith('[Retry] Match update for match-456');
    expect(consoleErrorSpy).toHaveBeenCalledWith('  All 4 attempts failed!');
    expect(consoleErrorSpy).toHaveBeenCalledWith('  Final error: Persistent failure');
  });

  it('should succeed without logging when operation succeeds first time', async () => {
    const operation = jest.fn().mockResolvedValue({ data: 'success' });

    await retryMatchOperation(operation, 'Quick match update');

    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('should report final failure to Sentry with context', async () => {
    const operation = jest.fn().mockRejectedValue(new Error('SofaScore timeout'));
    const sentrySpy = jest.spyOn(Sentry, 'captureException');

    const retryPromise = retryMatchOperation(
      operation,
      'Match scraping for match-abc123'
    ).catch(error => error);

    await jest.runAllTimersAsync();
    await retryPromise;

    // Verify Sentry was called
    expect(sentrySpy).toHaveBeenCalledTimes(1);
    expect(sentrySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'SofaScore timeout',
      }),
      expect.objectContaining({
        tags: {
          retry_context: 'Match scraping for match-abc123',
          retry_attempts: '4',
        },
        level: 'error',
        extra: expect.objectContaining({
          context: 'Match scraping for match-abc123',
          totalAttempts: 4,
          errorMessage: 'SofaScore timeout',
        }),
      })
    );
  });
});
