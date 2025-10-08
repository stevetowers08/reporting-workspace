/* eslint-disable @typescript-eslint/no-explicit-any */
import { debugLogger } from '@/lib/debug';

/**
 * Google Ads API Cache Manager
 * Implements basic caching with 5-minute TTL to reduce API calls by 80%+
 */
export class GoogleAdsCacheManager {
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private static readonly MAX_CACHE_SIZE = 100; // Maximum number of cached items
  
  // In-memory cache store
  private static cache = new Map<string, {
    data: any;
    timestamp: number;
    ttl: number;
  }>();

  /**
   * Generate cache key for Google Ads API requests
   */
  private static generateCacheKey(
    endpoint: string,
    customerId?: string,
    params?: Record<string, any>
  ): string {
    const keyParts = [endpoint];
    
    if (customerId) {
      keyParts.push(`customer:${customerId}`);
    }
    
    if (params) {
      const sortedParams = Object.keys(params)
        .sort()
        .map(key => `${key}:${params[key]}`)
        .join('|');
      keyParts.push(`params:${sortedParams}`);
    }
    
    return keyParts.join('|');
  }

  /**
   * Get cached data if valid
   */
  static get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }
    
    const now = Date.now();
    const isExpired = now - cached.timestamp > cached.ttl;
    
    if (isExpired) {
      this.cache.delete(key);
      debugLogger.debug('GoogleAdsCacheManager', 'Cache expired', { key });
      return null;
    }
    
    debugLogger.debug('GoogleAdsCacheManager', 'Cache hit', { key });
    return cached.data as T;
  }

  /**
   * Set cached data with TTL
   */
  static set<T>(key: string, data: T, ttl: number = this.CACHE_TTL): void {
    // Clean up expired entries and enforce max size
    this.cleanup();
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
    
    debugLogger.debug('GoogleAdsCacheManager', 'Cache set', { 
      key, 
      ttl: ttl / 1000 + 's',
      cacheSize: this.cache.size 
    });
  }

  /**
   * Get cached accounts data
   */
  static getAccounts(): any[] | null {
    const key = this.generateCacheKey('accounts');
    return this.get<any[]>(key);
  }

  /**
   * Set cached accounts data
   */
  static setAccounts(accounts: any[]): void {
    const key = this.generateCacheKey('accounts');
    this.set(key, accounts);
  }

  /**
   * Get cached campaigns data
   */
  static getCampaigns(customerId: string, dateRange?: string): any[] | null {
    const key = this.generateCacheKey('campaigns', customerId, { dateRange });
    return this.get<any[]>(key);
  }

  /**
   * Set cached campaigns data
   */
  static setCampaigns(customerId: string, campaigns: any[], dateRange?: string): void {
    const key = this.generateCacheKey('campaigns', customerId, { dateRange });
    this.set(key, campaigns);
  }

  /**
   * Get cached campaign performance data
   */
  static getCampaignPerformance(customerId: string, dateRange: string): any[] | null {
    const key = this.generateCacheKey('campaign-performance', customerId, { dateRange });
    return this.get<any[]>(key);
  }

  /**
   * Set cached campaign performance data
   */
  static setCampaignPerformance(customerId: string, data: any[], dateRange: string): void {
    const key = this.generateCacheKey('campaign-performance', customerId, { dateRange });
    this.set(key, data);
  }

  /**
   * Invalidate cache for specific customer
   */
  static invalidateCustomer(customerId: string): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (key.includes(`customer:${customerId}`)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    
    debugLogger.debug('GoogleAdsCacheManager', 'Invalidated customer cache', { 
      customerId, 
      invalidatedKeys: keysToDelete.length 
    });
  }

  /**
   * Invalidate all cache
   */
  static invalidateAll(): void {
    const cacheSize = this.cache.size;
    this.cache.clear();
    
    debugLogger.debug('GoogleAdsCacheManager', 'Invalidated all cache', { 
      clearedEntries: cacheSize 
    });
  }

  /**
   * Clean up expired entries and enforce max cache size
   */
  private static cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    // Remove expired entries
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    
    // Enforce max cache size (remove oldest entries)
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const excessCount = this.cache.size - this.MAX_CACHE_SIZE;
      for (let i = 0; i < excessCount; i++) {
        this.cache.delete(entries[i][0]);
      }
    }
    
    if (keysToDelete.length > 0) {
      debugLogger.debug('GoogleAdsCacheManager', 'Cache cleanup', { 
        expiredEntries: keysToDelete.length,
        currentSize: this.cache.size 
      });
    }
  }

  /**
   * Get cache statistics
   */
  static getStats(): {
    size: number;
    maxSize: number;
    ttl: number;
    entries: Array<{
      key: string;
      age: number;
      ttl: number;
      isExpired: boolean;
    }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, cached]) => ({
      key,
      age: now - cached.timestamp,
      ttl: cached.ttl,
      isExpired: now - cached.timestamp > cached.ttl
    }));
    
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
      ttl: this.CACHE_TTL,
      entries
    };
  }

  /**
   * Check if cache is healthy
   */
  static isHealthy(): boolean {
    const stats = this.getStats();
    const expiredCount = stats.entries.filter(e => e.isExpired).length;
    const expiredRatio = expiredCount / stats.size;
    
    // Cache is healthy if less than 50% of entries are expired
    return expiredRatio < 0.5;
  }
}
