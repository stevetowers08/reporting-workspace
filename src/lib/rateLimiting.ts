import { debugLogger } from '@/lib/debug';
import { RateLimitConfigSchema, ValidationError } from '@/lib/validation';

/**
 * Rate Limiting Service for Production Security
 * 
 * Provides comprehensive rate limiting for:
 * - API endpoints
 * - User actions
 * - Integration requests
 * - Authentication attempts
 */

export interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export class RateLimiter {
  private static instance: RateLimiter;
  private limits: Map<string, RateLimitEntry> = new Map();
  private configs: Map<string, any> = new Map();

  private constructor() {
    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  /**
   * Configure rate limiting for a specific key pattern
   */
  configure(keyPattern: string, config: any): void {
    try {
      const validatedConfig = RateLimitConfigSchema.parse(config);
      this.configs.set(keyPattern, validatedConfig);
      debugLogger.info('RateLimiter', `Configured rate limit for ${keyPattern}`, validatedConfig);
    } catch (error) {
      debugLogger.error('RateLimiter', `Failed to configure rate limit for ${keyPattern}`, error);
      throw new ValidationError('rateLimitConfig', 'Invalid rate limit configuration');
    }
  }

  /**
   * Check if a request is allowed based on rate limiting rules
   */
  check(key: string, customConfig?: any): RateLimitResult {
    const config = customConfig || this.getConfigForKey(key);
    const now = Date.now();
    const windowMs = config.windowMs;
    const maxRequests = config.maxRequests;
    
    const entry = this.limits.get(key);
    
    if (!entry || now >= entry.resetTime) {
      // Create new window or reset expired window
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + windowMs,
        blocked: false,
      };
      this.limits.set(key, newEntry);
      
      debugLogger.debug('RateLimiter', `New rate limit window for ${key}`, {
        count: 1,
        maxRequests,
        resetTime: new Date(newEntry.resetTime).toISOString(),
      });
      
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: newEntry.resetTime,
      };
    }
    
    // Check if already blocked
    if (entry.blocked) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      debugLogger.warn('RateLimiter', `Request blocked for ${key}`, {
        count: entry.count,
        maxRequests,
        retryAfter,
      });
      
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
        retryAfter,
      };
    }
    
    // Increment counter
    entry.count++;
    
    // Check if limit exceeded
    if (entry.count > maxRequests) {
      entry.blocked = true;
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      
      debugLogger.warn('RateLimiter', `Rate limit exceeded for ${key}`, {
        count: entry.count,
        maxRequests,
        retryAfter,
      });
      
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
        retryAfter,
      };
    }
    
    debugLogger.debug('RateLimiter', `Request allowed for ${key}`, {
      count: entry.count,
      maxRequests,
      remaining: maxRequests - entry.count,
    });
    
    return {
      allowed: true,
      remaining: maxRequests - entry.count,
      resetTime: entry.resetTime,
    };
  }

  /**
   * Record a successful request (for skipSuccessfulRequests option)
   */
  recordSuccess(key: string): void {
    const config = this.getConfigForKey(key);
    if (config.skipSuccessfulRequests) {
      this.incrementCounter(key);
    }
  }

  /**
   * Record a failed request (for skipFailedRequests option)
   */
  recordFailure(key: string): void {
    const config = this.getConfigForKey(key);
    if (config.skipFailedRequests) {
      this.incrementCounter(key);
    }
  }

  /**
   * Reset rate limit for a specific key
   */
  reset(key: string): void {
    this.limits.delete(key);
    debugLogger.info('RateLimiter', `Reset rate limit for ${key}`);
  }

  /**
   * Get current status for a key
   */
  getStatus(key: string): RateLimitResult | null {
    const entry = this.limits.get(key);
    if (!entry) {
      return null;
    }
    
    const config = this.getConfigForKey(key);
    const now = Date.now();
    
    if (now >= entry.resetTime) {
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetTime: now + config.windowMs,
      };
    }
    
    return {
      allowed: !entry.blocked && entry.count <= config.maxRequests,
      remaining: Math.max(0, config.maxRequests - entry.count),
      resetTime: entry.resetTime,
      retryAfter: entry.blocked ? Math.ceil((entry.resetTime - now) / 1000) : undefined,
    };
  }

  /**
   * Get all active rate limits (for monitoring)
   */
  getAllStatuses(): Record<string, RateLimitResult> {
    const statuses: Record<string, RateLimitResult> = {};
    
    for (const [key] of this.limits) {
      const status = this.getStatus(key);
      if (status) {
        statuses[key] = status;
      }
    }
    
    return statuses;
  }

  private getConfigForKey(key: string): any {
    // Find matching config pattern
    for (const [pattern, config] of this.configs) {
      if (this.matchesPattern(key, pattern)) {
        return config;
      }
    }
    
    // Default configuration
    return {
      windowMs: 60000, // 1 minute
      maxRequests: 100,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
    };
  }

  private matchesPattern(key: string, pattern: string): boolean {
    // Simple pattern matching - can be enhanced for more complex patterns
    if (pattern === '*') return true;
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(key);
    }
    return key === pattern;
  }

  private incrementCounter(key: string): void {
    const entry = this.limits.get(key);
    if (entry) {
      entry.count++;
    }
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.limits) {
      if (now >= entry.resetTime) {
        this.limits.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      debugLogger.debug('RateLimiter', `Cleaned up ${cleaned} expired rate limit entries`);
    }
  }
}

// ============================================================================
// RATE LIMITING MIDDLEWARE FOR API ENDPOINTS
// ============================================================================

export interface RateLimitMiddlewareOptions {
  keyGenerator?: (req: any) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  onLimitReached?: (key: string, result: RateLimitResult) => void;
}

export const createRateLimitMiddleware = (
  windowMs: number = 60000,
  maxRequests: number = 100,
  options: RateLimitMiddlewareOptions = {}
) => {
  const rateLimiter = RateLimiter.getInstance();
  
  // Configure the rate limiter
  rateLimiter.configure('api', {
    windowMs,
    maxRequests,
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    skipFailedRequests: options.skipFailedRequests || false,
  });
  
  return (req: any, res: any, next: any) => {
    const key = options.keyGenerator ? options.keyGenerator(req) : 'api';
    const result = rateLimiter.check(key);
    
    if (!result.allowed) {
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests, please try again later',
        retryAfter: result.retryAfter,
        resetTime: new Date(result.resetTime).toISOString(),
      });
      
      if (options.onLimitReached) {
        options.onLimitReached(key, result);
      }
      
      return;
    }
    
    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': maxRequests.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
    });
    
    next();
  };
};

// ============================================================================
// SPECIFIC RATE LIMITING CONFIGURATIONS
// ============================================================================

export const RateLimitConfigs = {
  // API endpoints
  api: {
    windowMs: 60000, // 1 minute
    maxRequests: 100,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },
  
  // Authentication endpoints
  auth: {
    windowMs: 900000, // 15 minutes
    maxRequests: 5,
    skipSuccessfulRequests: true,
    skipFailedRequests: false,
  },
  
  // Integration API calls
  integration: {
    windowMs: 60000, // 1 minute
    maxRequests: 30,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },
  
  // File uploads
  upload: {
    windowMs: 300000, // 5 minutes
    maxRequests: 10,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },
  
  // Admin operations
  admin: {
    windowMs: 60000, // 1 minute
    maxRequests: 20,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },
  
  // Client operations
  client: {
    windowMs: 60000, // 1 minute
    maxRequests: 50,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },
} as const;

// ============================================================================
// INITIALIZE RATE LIMITING
// ============================================================================

export const initializeRateLimiting = () => {
  const rateLimiter = RateLimiter.getInstance();
  
  // Configure all rate limiting rules
  Object.entries(RateLimitConfigs).forEach(([key, config]) => {
    rateLimiter.configure(key, config);
  });
  
  debugLogger.info('RateLimiter', 'Rate limiting initialized with configurations', {
    configs: Object.keys(RateLimitConfigs),
  });
};

// ============================================================================
// EXPORT UTILITIES
// ============================================================================

export const getRateLimiter = () => RateLimiter.getInstance();

export const checkRateLimit = (key: string, config?: any) => {
  const rateLimiter = RateLimiter.getInstance();
  return rateLimiter.check(key, config);
};

export const resetRateLimit = (key: string) => {
  const rateLimiter = RateLimiter.getInstance();
  rateLimiter.reset(key);
};

export const getRateLimitStatus = (key: string) => {
  const rateLimiter = RateLimiter.getInstance();
  return rateLimiter.getStatus(key);
};

