/**
 * Circuit Breaker Pattern Implementation
 * Simple, robust retry logic with exponential backoff and circuit breaker
 * Based on industry best practices for API resilience
 */

import { debugLogger } from './debug';

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  circuitBreakerThreshold: number;
  circuitBreakerTimeout: number;
}

export interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

export class CircuitBreaker {
  private state: CircuitBreakerState = {
    failures: 0,
    lastFailureTime: 0,
    state: 'CLOSED'
  };

  private readonly config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = {
      maxRetries: config.maxRetries ?? 3,
      baseDelay: config.baseDelay ?? 1000,
      maxDelay: config.maxDelay ?? 30000,
      backoffMultiplier: config.backoffMultiplier ?? 2,
      circuitBreakerThreshold: config.circuitBreakerThreshold ?? 5,
      circuitBreakerTimeout: config.circuitBreakerTimeout ?? 60000,
      ...config
    };
  }

  /**
   * Execute a function with circuit breaker and retry logic
   */
  async execute<T>(fn: () => Promise<T>, context: string = 'unknown'): Promise<T> {
    // Check circuit breaker state
    if (this.state.state === 'OPEN') {
      if (Date.now() - this.state.lastFailureTime > this.config.circuitBreakerTimeout) {
        this.state.state = 'HALF_OPEN';
        debugLogger.info('CircuitBreaker', `Circuit breaker transitioning to HALF_OPEN for ${context}`);
      } else {
        throw new Error(`Circuit breaker is OPEN for ${context}. Too many failures.`);
      }
    }

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        debugLogger.debug('CircuitBreaker', `Attempt ${attempt + 1}/${this.config.maxRetries + 1} for ${context}`);
        
        const result = await fn();
        
        // Success - reset circuit breaker
        this.onSuccess(context);
        return result;
        
      } catch (error) {
        lastError = error as Error;
        
        // Check if this is a retryable error
        if (!this.isRetryableError(error)) {
          debugLogger.warn('CircuitBreaker', `Non-retryable error for ${context}`, error);
          throw error;
        }
        
        // If this is the last attempt, don't wait
        if (attempt === this.config.maxRetries) {
          break;
        }
        
        // Calculate delay with exponential backoff
        const delay = this.calculateDelay(attempt);
        debugLogger.warn('CircuitBreaker', `Attempt ${attempt + 1} failed for ${context}, retrying in ${delay}ms`, error);
        
        await this.sleep(delay);
      }
    }
    
    // All retries failed
    this.onFailure(context);
    throw lastError || new Error(`All retry attempts failed for ${context}`);
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Network errors, timeouts, and 5xx errors are retryable
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      return true;
    }
    
    // HTTP status codes
    if (error.status || error.response?.status) {
      const status = error.status || error.response.status;
      return status >= 500 || status === 429; // Server errors and rate limits
    }
    
    // Network errors
    if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      return true;
    }
    
    return false;
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private calculateDelay(attempt: number): number {
    const exponentialDelay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt);
    const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
    const delay = Math.min(exponentialDelay + jitter, this.config.maxDelay);
    
    return Math.floor(delay);
  }

  /**
   * Handle successful execution
   */
  private onSuccess(context: string): void {
    if (this.state.state === 'HALF_OPEN') {
      this.state.state = 'CLOSED';
      debugLogger.info('CircuitBreaker', `Circuit breaker CLOSED for ${context} after successful retry`);
    }
    
    this.state.failures = 0;
  }

  /**
   * Handle failed execution
   */
  private onFailure(context: string): void {
    this.state.failures++;
    this.state.lastFailureTime = Date.now();
    
    if (this.state.failures >= this.config.circuitBreakerThreshold) {
      this.state.state = 'OPEN';
      debugLogger.error('CircuitBreaker', `Circuit breaker OPENED for ${context} after ${this.state.failures} failures`);
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current circuit breaker state
   */
  getState(): CircuitBreakerState {
    return { ...this.state };
  }

  /**
   * Reset circuit breaker state
   */
  reset(): void {
    this.state = {
      failures: 0,
      lastFailureTime: 0,
      state: 'CLOSED'
    };
    debugLogger.info('CircuitBreaker', 'Circuit breaker state reset');
  }
}

// Global circuit breaker instances for different services
export const facebookCircuitBreaker = new CircuitBreaker({
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  circuitBreakerThreshold: 5,
  circuitBreakerTimeout: 60000
});

export const googleCircuitBreaker = new CircuitBreaker({
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  circuitBreakerThreshold: 5,
  circuitBreakerTimeout: 60000
});

export const ghlCircuitBreaker = new CircuitBreaker({
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  circuitBreakerThreshold: 5,
  circuitBreakerTimeout: 60000
});

export const sheetsCircuitBreaker = new CircuitBreaker({
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  circuitBreakerThreshold: 5,
  circuitBreakerTimeout: 60000
});
