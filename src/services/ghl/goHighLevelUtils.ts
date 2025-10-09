// GoHighLevel Utilities and Rate Limiting

import { debugLogger } from '@/lib/debug';

export class GHLRateLimiter {
  private static lastRequestAt = 0;
  private static windowStart = 0;
  private static requestCount = 0;
  private static readonly MIN_REQUEST_INTERVAL = 100; // 100ms between requests
  private static readonly BURST_LIMIT = 100; // 100 requests per 10 seconds
  private static readonly BURST_WINDOW = 10 * 1000; // 10 seconds

  static async sleep(ms: number): Promise<void> {
    return new Promise(resolve => globalThis.setTimeout(resolve, ms));
  }

  static async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    
    // Reset window if needed
    if (now - this.windowStart > this.BURST_WINDOW) {
      this.windowStart = now;
      this.requestCount = 0;
    }
    
    // Check burst limit
    if (this.requestCount >= this.BURST_LIMIT) {
      const waitTime = this.BURST_WINDOW - (now - this.windowStart);
      if (waitTime > 0) {
        debugLogger.warn('GHLRateLimiter', `Rate limit reached, waiting ${waitTime}ms`);
        await this.sleep(waitTime);
        this.requestCount = 0;
        this.lastRequestTime = now;
      }
    }
    
    // Enforce minimum interval between requests
    const timeSinceLastRequest = now - this.lastRequestAt;
    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      await this.sleep(this.MIN_REQUEST_INTERVAL - timeSinceLastRequest);
    }
    
    this.lastRequestAt = Date.now();
    this.requestCount++;
  }

  static async handleRateLimitError(response: Response): Promise<void> {
    const retryAfter = response.headers.get('Retry-After');
    const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 60000; // Default 1 minute
    
    debugLogger.warn('GHLRateLimiter', `Rate limit exceeded, waiting ${waitTime}ms`);
    await this.sleep(waitTime);
  }
}

export class GHLQueryBuilder {
  static buildContactQuery(dateParams?: { startDate?: string; endDate?: string }): string {
    const queryParts: string[] = [];
    
    if (dateParams?.startDate) {
      queryParts.push(`startDate=${encodeURIComponent(dateParams.startDate)}`);
    }
    
    if (dateParams?.endDate) {
      queryParts.push(`endDate=${encodeURIComponent(dateParams.endDate)}`);
    }
    
    return queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
  }

  static buildPaginationQuery(limit = 100, offset = 0): string {
    const params = new URLSearchParams();
    params.set('limit', limit.toString());
    params.set('offset', offset.toString());
    return `?${params.toString()}`;
  }
}

export class GHLCache {
  private static cache = new Map<string, { data: any; timestamp: number }>();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  static get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    const isExpired = Date.now() - cached.timestamp > this.CACHE_DURATION;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  static clear(): void {
    this.cache.clear();
  }

  static delete(key: string): void {
    this.cache.delete(key);
  }
}

export class GHLValidator {
  static validateLocationId(locationId: string): boolean {
    return typeof locationId === 'string' && locationId.trim() !== '';
  }

  static validateToken(token: string): boolean {
    return typeof token === 'string' && token.trim() !== '';
  }

  static validateDateRange(startDate?: string, endDate?: string): boolean {
    if (!startDate || !endDate) return true;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return start <= end;
  }
}

export class GHLFormatter {
  static formatCurrency(amount: number, currency = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount);
  }

  static formatPercentage(value: number, decimals = 2): string {
    return `${value.toFixed(decimals)}%`;
  }

  static formatDate(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  static formatDateTime(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
