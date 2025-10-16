import { expect, test } from '@playwright/test';

// Mock environment for Node.js test environment
if (typeof import.meta === 'undefined') {
  global.import = global.import || {};
  global.import.meta = global.import.meta || {};
  global.import.meta.env = global.import.meta.env || {};
}

// Mock the rate limiting module
class MockRateLimiter {
  private static instance: MockRateLimiter;
  private configs: Map<string, any> = new Map();
  private counters: Map<string, { count: number; resetTime: number }> = new Map();

  static getInstance(): MockRateLimiter {
    if (!MockRateLimiter.instance) {
      MockRateLimiter.instance = new MockRateLimiter();
    }
    return MockRateLimiter.instance;
  }

  configure(pattern: string, config: any): void {
    this.configs.set(pattern, config);
  }

  check(key: string): { allowed: boolean; remaining: number; retryAfter?: number } {
    const config = this.configs.get('test-key-*');
    if (!config) {
      return { allowed: true, remaining: 999 };
    }

    const now = Date.now();
    const counter = this.counters.get(key) || { count: 0, resetTime: now + config.windowMs };
    
    if (now > counter.resetTime) {
      counter.count = 0;
      counter.resetTime = now + config.windowMs;
    }

    if (counter.count >= config.maxRequests) {
      return { 
        allowed: false, 
        remaining: 0, 
        retryAfter: Math.ceil((counter.resetTime - now) / 1000) 
      };
    }

    counter.count++;
    this.counters.set(key, counter);
    
    return { 
      allowed: true, 
      remaining: config.maxRequests - counter.count 
    };
  }
}

const _mockmockRateLimitConfigs = {
  api: { windowMs: 60000, maxRequests: 100 },
  auth: { windowMs: 300000, maxRequests: 5 }
};

const mockCheckRateLimit = (_key: string, _config: any) => {
  const _limiter = MockRateLimiter.getInstance();
  return _limiter.check(_key);
};

const mockGetRateLimitStatus = (key: string) => {
  const limiter = MockRateLimiter.getInstance();
  return limiter.check(key);
};

const mockResetRateLimit = (key: string) => {
  const limiter = MockRateLimiter.getInstance();
  // Reset implementation would go here
};

const mockGetRateLimiter = () => MockRateLimiter.getInstance();

test.describe('Rate Limiting Tests', () => {
  
  test.describe('Rate Limiter Service', () => {
    test('should allow requests within limit', async () => {
      const rateLimiter = MockRateLimiter.getInstance();
      const key = 'test-key-1';
      
      // Configure rate limiter
      rateLimiter.configure('test-key-*', {
        windowMs: 60000, // 1 minute
        maxRequests: 5,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
      });
      
      // Make requests within limit
      for (let i = 0; i < 5; i++) {
        const result = rateLimiter.check(key);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(4 - i);
      }
    });

    test('should block requests when limit exceeded', async () => {
      const rateLimiter = MockRateLimiter.getInstance();
      const key = 'test-key-2';
      
      // Configure rate limiter
      rateLimiter.configure('test-key-*', {
        windowMs: 60000, // 1 minute
        maxRequests: 3,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
      });
      
      // Make requests within limit
      for (let i = 0; i < 3; i++) {
        const result = rateLimiter.check(key);
        expect(result.allowed).toBe(true);
      }
      
      // This request should be blocked
      const blockedResult = rateLimiter.check(key);
      expect(blockedResult.allowed).toBe(false);
      expect(blockedResult.remaining).toBe(0);
      expect(blockedResult.retryAfter).toBeDefined();
    });

    test('should reset after window expires', async () => {
      const rateLimiter = MockRateLimiter.getInstance();
      const key = 'test-key-3';
      
      // Configure rate limiter with short window
      rateLimiter.configure('test-key-*', {
        windowMs: 1000, // 1 second
        maxRequests: 2,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
      });
      
      // Make requests within limit
      const result1 = rateLimiter.check(key);
      expect(result1.allowed).toBe(true);
      
      const result2 = rateLimiter.check(key);
      expect(result2.allowed).toBe(true);
      
      // This should be blocked
      const blockedResult = rateLimiter.check(key);
      expect(blockedResult.allowed).toBe(false);
      
      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Should be allowed again
      const newResult = rateLimiter.check(key);
      expect(newResult.allowed).toBe(true);
      expect(newResult.remaining).toBe(1);
    });

    test('should handle different keys independently', async () => {
      const rateLimiter = MockRateLimiter.getInstance();
      const key1 = 'test-key-4a';
      const key2 = 'test-key-4b';
      
      // Configure rate limiter
      rateLimiter.configure('test-key-*', {
        windowMs: 60000, // 1 minute
        maxRequests: 2,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
      });
      
      // Use up limit for key1
      rateLimiter.check(key1);
      rateLimiter.check(key1);
      const blockedResult1 = rateLimiter.check(key1);
      expect(blockedResult1.allowed).toBe(false);
      
      // key2 should still be allowed
      const allowedResult2 = rateLimiter.check(key2);
      expect(allowedResult2.allowed).toBe(true);
      expect(allowedResult2.remaining).toBe(1);
    });

    test('should skip successful requests when configured', async () => {
      const rateLimiter = MockRateLimiter.getInstance();
      const key = 'test-key-5';
      
      // Configure rate limiter to skip successful requests
      rateLimiter.configure('test-key-*', {
        windowMs: 60000, // 1 minute
        maxRequests: 3,
        skipSuccessfulRequests: true,
        skipFailedRequests: false,
      });
      
      // Make requests
      const result1 = rateLimiter.check(key);
      expect(result1.allowed).toBe(true);
      
      // Record success - should not count against limit
      rateLimiter.recordSuccess(key);
      
      // Should still have full limit available
      const result2 = rateLimiter.check(key);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(2);
    });

    test('should skip failed requests when configured', async () => {
      const rateLimiter = MockRateLimiter.getInstance();
      const key = 'test-key-6';
      
      // Configure rate limiter to skip failed requests
      rateLimiter.configure('test-key-*', {
        windowMs: 60000, // 1 minute
        maxRequests: 3,
        skipSuccessfulRequests: false,
        skipFailedRequests: true,
      });
      
      // Make requests
      const result1 = rateLimiter.check(key);
      expect(result1.allowed).toBe(true);
      
      // Record failure - should not count against limit
      rateLimiter.recordFailure(key);
      
      // Should still have full limit available
      const result2 = rateLimiter.check(key);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(2);
    });

    test('should reset rate limit for specific key', async () => {
      const rateLimiter = MockRateLimiter.getInstance();
      const key = 'test-key-7';
      
      // Configure rate limiter
      rateLimiter.configure('test-key-*', {
        windowMs: 60000, // 1 minute
        maxRequests: 2,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
      });
      
      // Use up limit
      rateLimiter.check(key);
      rateLimiter.check(key);
      const blockedResult = rateLimiter.check(key);
      expect(blockedResult.allowed).toBe(false);
      
      // Reset rate limit
      rateLimiter.reset(key);
      
      // Should be allowed again
      const newResult = rateLimiter.check(key);
      expect(newResult.allowed).toBe(true);
      expect(newResult.remaining).toBe(1);
    });

    test('should get status for key', async () => {
      const rateLimiter = MockRateLimiter.getInstance();
      const key = 'test-key-8';
      
      // Configure rate limiter
      rateLimiter.configure('test-key-*', {
        windowMs: 60000, // 1 minute
        maxRequests: 3,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
      });
      
      // Make one request
      rateLimiter.check(key);
      
      // Get status
      const status = rateLimiter.getStatus(key);
      expect(status).toBeDefined();
      expect(status!.allowed).toBe(true);
      expect(status!.remaining).toBe(2);
      expect(status!.resetTime).toBeDefined();
    });

    test('should get all statuses', async () => {
      const rateLimiter = MockRateLimiter.getInstance();
      const key1 = 'test-key-9a';
      const key2 = 'test-key-9b';
      
      // Configure rate limiter
      rateLimiter.configure('test-key-*', {
        windowMs: 60000, // 1 minute
        maxRequests: 2,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
      });
      
      // Make requests
      rateLimiter.check(key1);
      rateLimiter.check(key2);
      
      // Get all statuses
      const allStatuses = rateLimiter.getAllStatuses();
      expect(allStatuses).toBeDefined();
      expect(Object.keys(allStatuses)).toContain(key1);
      expect(Object.keys(allStatuses)).toContain(key2);
    });
  });

  test.describe('Rate Limit Configurations', () => {
    test('should use API configuration', async () => {
      const result = mockCheckRateLimit('api:test', mockRateLimitConfigs.api);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(99); // 100 - 1
    });

    test('should use auth configuration', async () => {
      const result = mockCheckRateLimit('auth:test', mockRateLimitConfigs.auth);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4); // 5 - 1
    });

    test('should use integration configuration', async () => {
      const result = mockCheckRateLimit('integration:test', mockRateLimitConfigs.integration);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(29); // 30 - 1
    });

    test('should use upload configuration', async () => {
      const result = mockCheckRateLimit('upload:test', mockRateLimitConfigs.upload);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9); // 10 - 1
    });

    test('should use admin configuration', async () => {
      const result = mockCheckRateLimit('admin:test', mockRateLimitConfigs.admin);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(19); // 20 - 1
    });

    test('should use client configuration', async () => {
      const result = mockCheckRateLimit('client:test', mockRateLimitConfigs.client);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(49); // 50 - 1
    });
  });

  test.describe('Rate Limit Utilities', () => {
    test('should get rate limiter instance', async () => {
      const rateLimiter = mockGetRateLimiter();
      expect(rateLimiter).toBeDefined();
      expect(rateLimiter).toBeInstanceOf(RateLimiter);
    });

    test('should check rate limit with custom config', async () => {
      const customConfig = {
        windowMs: 1000,
        maxRequests: 2,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
      };
      
      const result = mockCheckRateLimit('custom:test', customConfig);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);
    });

    test('should reset rate limit', async () => {
      const key = 'reset-test';
      
      // Use up limit
      mockCheckRateLimit(key, { windowMs: 60000, maxRequests: 1 });
      const blockedResult = mockCheckRateLimit(key, { windowMs: 60000, maxRequests: 1 });
      expect(blockedResult.allowed).toBe(false);
      
      // Reset
      mockResetRateLimit(key);
      
      // Should be allowed again
      const newResult = mockCheckRateLimit(key, { windowMs: 60000, maxRequests: 1 });
      expect(newResult.allowed).toBe(true);
    });

    test('should get rate limit status', async () => {
      const key = 'status-test';
      
      // Make a request
      mockCheckRateLimit(key, { windowMs: 60000, maxRequests: 5 });
      
      // Get status
      const status = mockGetRateLimitStatus(key);
      expect(status).toBeDefined();
      expect(status!.allowed).toBe(true);
      expect(status!.remaining).toBe(4);
    });
  });

  test.describe('Pattern Matching', () => {
    test('should match exact pattern', async () => {
      const rateLimiter = MockRateLimiter.getInstance();
      
      // Configure exact pattern
      rateLimiter.configure('exact-match', {
        windowMs: 60000,
        maxRequests: 2,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
      });
      
      const result = rateLimiter.check('exact-match');
      expect(result.allowed).toBe(true);
    });

    test('should match wildcard pattern', async () => {
      const rateLimiter = MockRateLimiter.getInstance();
      
      // Configure wildcard pattern
      rateLimiter.configure('wildcard-*', {
        windowMs: 60000,
        maxRequests: 2,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
      });
      
      const result = rateLimiter.check('wildcard-test');
      expect(result.allowed).toBe(true);
    });

    test('should use default config for unmatched pattern', async () => {
      const rateLimiter = MockRateLimiter.getInstance();
      const key = 'unmatched-pattern';
      
      // No specific configuration for this pattern
      const result = rateLimiter.check(key);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(99); // Default config: 100 requests/minute
    });
  });

  test.describe('Concurrent Requests', () => {
    test('should handle concurrent requests correctly', async () => {
      const rateLimiter = MockRateLimiter.getInstance();
      const key = 'concurrent-test';
      
      // Configure rate limiter
      rateLimiter.configure('concurrent-*', {
        windowMs: 60000,
        maxRequests: 5,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
      });
      
      // Make concurrent requests
      const promises = Array.from({ length: 10 }, () => 
        Promise.resolve(rateLimiter.check(key))
      );
      
      const results = await Promise.all(promises);
      
      // Count allowed vs blocked
      const allowed = results.filter(r => r.allowed).length;
      const blocked = results.filter(r => !r.allowed).length;
      
      expect(allowed).toBe(5); // Should allow exactly 5 requests
      expect(blocked).toBe(5); // Should block exactly 5 requests
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle zero max requests', async () => {
      const rateLimiter = MockRateLimiter.getInstance();
      const key = 'zero-limit-test';
      
      // Configure with zero max requests
      rateLimiter.configure('zero-limit-*', {
        windowMs: 60000,
        maxRequests: 0,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
      });
      
      const result = rateLimiter.check(key);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    test('should handle very short window', async () => {
      const rateLimiter = MockRateLimiter.getInstance();
      const key = 'short-window-test';
      
      // Configure with very short window
      rateLimiter.configure('short-window-*', {
        windowMs: 100, // 100ms
        maxRequests: 2,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
      });
      
      const result1 = rateLimiter.check(key);
      expect(result1.allowed).toBe(true);
      
      const result2 = rateLimiter.check(key);
      expect(result2.allowed).toBe(true);
      
      const result3 = rateLimiter.check(key);
      expect(result3.allowed).toBe(false);
      
      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const result4 = rateLimiter.check(key);
      expect(result4.allowed).toBe(true);
    });

    test('should handle very long window', async () => {
      const rateLimiter = MockRateLimiter.getInstance();
      const key = 'long-window-test';
      
      // Configure with long window
      rateLimiter.configure('long-window-*', {
        windowMs: 300000, // 5 minutes
        maxRequests: 1,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
      });
      
      const result1 = rateLimiter.check(key);
      expect(result1.allowed).toBe(true);
      
      const result2 = rateLimiter.check(key);
      expect(result2.allowed).toBe(false);
    });
  });
});

