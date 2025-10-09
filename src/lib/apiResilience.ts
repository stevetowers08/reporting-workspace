import { debugLogger } from '@/lib/debug';

/**
 * Timeout wrapper for API calls to prevent infinite loading states
 */
export class ApiTimeoutError extends Error {
  constructor(message: string, public timeoutMs: number) {
    super(message);
    this.name = 'ApiTimeoutError';
  }
}

/**
 * Wraps a promise with a timeout to prevent infinite loading
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 30000,
  errorMessage?: string
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      const error = new ApiTimeoutError(
        errorMessage || `Request timed out after ${timeoutMs}ms`,
        timeoutMs
      );
      debugLogger.error('ApiTimeout', 'Request timeout', { timeoutMs, errorMessage });
      reject(error);
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

/**
 * Retry mechanism with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        debugLogger.error('ApiRetry', 'Max retries exceeded', { 
          maxRetries, 
          lastAttempt: attempt,
          error: lastError.message 
        });
        throw lastError;
      }

      const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
      debugLogger.warn('ApiRetry', `Retry attempt ${attempt}/${maxRetries}`, { 
        delayMs, 
        error: lastError.message 
      });
      
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw lastError!;
}

/**
 * Combined timeout and retry wrapper
 */
export function withTimeoutAndRetry<T>(
  fn: () => Promise<T>,
  timeoutMs: number = 30000,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  return withRetry(
    () => withTimeout(fn(), timeoutMs),
    maxRetries,
    baseDelayMs
  );
}

/**
 * Circuit breaker pattern to prevent cascading failures
 */
export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private failureThreshold: number = 5,
    private recoveryTimeoutMs: number = 60000,
    private monitoringPeriodMs: number = 60000
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeoutMs) {
        this.state = 'HALF_OPEN';
        debugLogger.info('CircuitBreaker', 'Moving to HALF_OPEN state');
      } else {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      debugLogger.warn('CircuitBreaker', 'Circuit breaker OPEN', { 
        failureCount: this.failureCount,
        threshold: this.failureThreshold 
      });
    }
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime
    };
  }
}

/**
 * Global circuit breakers for different services
 */
export const circuitBreakers = {
  facebookAds: new CircuitBreaker(3, 30000),
  googleAds: new CircuitBreaker(3, 30000),
  goHighLevel: new CircuitBreaker(3, 30000),
  googleSheets: new CircuitBreaker(3, 30000)
};
