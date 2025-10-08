/* eslint-disable no-undef, no-unused-vars, @typescript-eslint/no-explicit-any */

/**
 * Google Ads API Rate Limiter
 * Implements Google Ads API v17 rate limits:
 * - 15,000 operations/day per developer token (searches/reports combined)
 * - 5 QPS per token, bucketed by customer ID
 * - 1,000 reports/hour (reasonable estimate)
 */
export class GoogleAdsRateLimiter {
  private static readonly LIMITS = {
    // Daily limit: 15,000 operations per developer token
    daily: { operations: 15000, window: 24 * 60 * 60 * 1000 },
    // QPS limit: 5 requests per second per token, bucketed by customer ID
    qps: { requests: 5, window: 1000 },
    // Reports limit: 1,000 reports per hour (conservative estimate)
    reports: { requests: 1000, window: 60 * 60 * 1000 }
  };

  // Rate limiting state
  private static dailyUsage = new Map<string, { count: number; resetTime: number }>();
  private static qpsUsage = new Map<string, { count: number; resetTime: number }>();
  private static reportsUsage = new Map<string, { count: number; resetTime: number }>();

  // Request queue for throttling
  private static requestQueue: Array<{
    resolve: (value: unknown) => void;
    reject: (error: unknown) => void;
    request: () => Promise<unknown>;
    customerId?: string;
  }> = [];
  
  private static isProcessing = false;

  /**
   * Make a rate-limited request to Google Ads API
   */
  static async makeRequest<T>(
    endpoint: string,
    data: unknown,
    customerId?: string
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        resolve,
        reject,
        request: () => this.executeRequest(endpoint, data, customerId),
        customerId
      });
      
      this.processQueue();
    });
  }

  /**
   * Process the request queue with rate limiting
   */
  private static async processQueue(): Promise<void> {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (!request) continue;

      try {
        // Check rate limits before executing
        const canProceed = await this.checkRateLimits(request.customerId);
        
        if (!canProceed) {
          // Re-queue the request with a delay
          setTimeout(() => {
            this.requestQueue.unshift(request);
            this.processQueue();
          }, 1000); // Wait 1 second before retry
          break;
        }

        // Execute the request
        const result = await request.request();
        request.resolve(result);

        // Add delay between requests to respect QPS limits
        await this.delay(200); // 200ms delay = 5 QPS max

      } catch (error) {
        debugLogger.error('GoogleAdsRateLimiter', 'Request failed', error);
        request.reject(error);
      }
    }

    this.isProcessing = false;
  }

  /**
   * Check if request can proceed based on rate limits
   */
  private static async checkRateLimits(customerId?: string): Promise<boolean> {
    const now = Date.now();
    const developerToken = 'default'; // In production, use actual developer token

    // Check daily limit
    const dailyKey = developerToken;
    const dailyUsage = this.dailyUsage.get(dailyKey);
    
    if (!dailyUsage || now > dailyUsage.resetTime) {
      this.dailyUsage.set(dailyKey, { count: 1, resetTime: now + this.LIMITS.daily.window });
    } else if (dailyUsage.count >= this.LIMITS.daily.operations) {
      debugLogger.warn('GoogleAdsRateLimiter', 'Daily rate limit exceeded', {
        dailyUsage: dailyUsage.count,
        limit: this.LIMITS.daily.operations
      });
      return false;
    } else {
      dailyUsage.count++;
    }

    // Check QPS limit (per customer ID)
    if (customerId) {
      const qpsKey = `${developerToken}:${customerId}`;
      const qpsUsage = this.qpsUsage.get(qpsKey);
      
      if (!qpsUsage || now > qpsUsage.resetTime) {
        this.qpsUsage.set(qpsKey, { count: 1, resetTime: now + this.LIMITS.qps.window });
      } else if (qpsUsage.count >= this.LIMITS.qps.requests) {
        debugLogger.warn('GoogleAdsRateLimiter', 'QPS rate limit exceeded', {
          customerId,
          qpsUsage: qpsUsage.count,
          limit: this.LIMITS.qps.requests
        });
        return false;
      } else {
        qpsUsage.count++;
      }
    }

    // Check reports limit
    const reportsKey = developerToken;
    const reportsUsage = this.reportsUsage.get(reportsKey);
    
    if (!reportsUsage || now > reportsUsage.resetTime) {
      this.reportsUsage.set(reportsKey, { count: 1, resetTime: now + this.LIMITS.reports.window });
    } else if (reportsUsage.count >= this.LIMITS.reports.requests) {
      debugLogger.warn('GoogleAdsRateLimiter', 'Reports rate limit exceeded', {
        reportsUsage: reportsUsage.count,
        limit: this.LIMITS.reports.requests
      });
      return false;
    } else {
      reportsUsage.count++;
    }

    return true;
  }

  /**
   * Execute the actual API request
   */
  private static async executeRequest(endpoint: string, data: unknown, customerId?: string): Promise<unknown> {
    debugLogger.debug('GoogleAdsRateLimiter', 'Executing request', {
      endpoint,
      customerId,
      hasData: !!data
    });

    // This will be implemented by the GoogleAdsService
    // For now, we'll throw an error to indicate this needs to be integrated
    throw new Error('Rate limiter needs to be integrated with GoogleAdsService');
  }

  /**
   * Add delay between requests
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current rate limit usage statistics
   */
  static getUsageStats(): {
    daily: { used: number; limit: number; resetTime: number };
    qps: { used: number; limit: number; resetTime: number };
    reports: { used: number; limit: number; resetTime: number };
  } {
    const now = Date.now();
    const developerToken = 'default';

    const dailyUsage = this.dailyUsage.get(developerToken) || { count: 0, resetTime: now };
    const qpsUsage = this.qpsUsage.get(developerToken) || { count: 0, resetTime: now };
    const reportsUsage = this.reportsUsage.get(developerToken) || { count: 0, resetTime: now };

    return {
      daily: {
        used: dailyUsage.count,
        limit: this.LIMITS.daily.operations,
        resetTime: dailyUsage.resetTime
      },
      qps: {
        used: qpsUsage.count,
        limit: this.LIMITS.qps.requests,
        resetTime: qpsUsage.resetTime
      },
      reports: {
        used: reportsUsage.count,
        limit: this.LIMITS.reports.requests,
        resetTime: reportsUsage.resetTime
      }
    };
  }

  /**
   * Clear rate limit counters (for testing)
   */
  static clearCounters(): void {
    this.dailyUsage.clear();
    this.qpsUsage.clear();
    this.reportsUsage.clear();
    this.requestQueue = [];
    this.isProcessing = false;
  }
}
