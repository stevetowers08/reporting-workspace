/**
 * Development Utilities
 * Provides development-specific optimizations and debugging tools
 */

import { getEnvConfig, isDevelopment } from './envValidator';

export class DevUtils {
  private static instance: DevUtils;
  private config = getEnvConfig();

  static getInstance(): DevUtils {
    if (!DevUtils.instance) {
      DevUtils.instance = new DevUtils();
    }
    return DevUtils.instance;
  }

  /**
   * Log development information
   */
  logDevInfo(message: string, data?: any): void {
    if (isDevelopment() && this.config.enableDebug) {
      debugLogger.info('DevUtils', `[DEV] ${message}`, data || '');
    }
  }

  /**
   * Log performance metrics
   */
  logPerformance(label: string, startTime: number): void {
    if (isDevelopment() && this.config.enableDebug) {
      const duration = performance.now() - startTime;
      debugLogger.info('DevUtils', `⚡ [PERF] ${label}: ${duration.toFixed(2)}ms`);
    }
  }

  /**
   * Log API calls in development
   */
  logApiCall(method: string, url: string, data?: any): void {
    if (isDevelopment() && this.config.enableDebug) {
      debugLogger.info('DevUtils', `🌐 [API] ${method} ${url}`, data || '');
    }
  }

  /**
   * Log React Query operations
   */
  logQueryOperation(operation: string, queryKey: string[], data?: any): void {
    if (isDevelopment() && this.config.enableDebug) {
      debugLogger.info('DevUtils', `🔄 [QUERY] ${operation}:`, queryKey, data || '');
    }
  }

  /**
   * Log Supabase operations
   */
  logSupabaseOperation(operation: string, table: string, data?: any): void {
    if (isDevelopment() && this.config.enableDebug) {
      debugLogger.info('DevUtils', `🗄️ [SUPABASE] ${operation} ${table}:`, data || '');
    }
  }

  /**
   * Get optimized cache settings for development
   */
  getCacheSettings() {
    return {
      ttl: this.config.cacheTtl,
      maxSize: this.config.cacheMaxSize,
      // Development-specific cache settings
      ...(isDevelopment() && {
        staleTime: 0, // Always refetch in development
        cacheTime: this.config.cacheTtl,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
      }),
    };
  }

  /**
   * Get optimized API settings for development
   */
  getApiSettings() {
    return {
      timeout: this.config.apiTimeout,
      rateLimit: this.config.apiRateLimit,
      rateWindow: this.config.apiRateWindow,
      // Development-specific API settings
      ...(isDevelopment() && {
        retry: 1, // Fewer retries in development
        retryDelay: 1000,
      }),
    };
  }

  /**
   * Check if a feature is enabled
   */
  isFeatureEnabled(feature: string): boolean {
    const env = import.meta.env;
    return env[`VITE_ENABLE_${feature.toUpperCase()}`] === 'true';
  }

  /**
   * Get environment-specific configuration
   */
  getEnvConfig() {
    return this.config;
  }

  /**
   * Performance monitoring wrapper
   */
  withPerformanceMonitoring<T>(
    label: string,
    fn: () => T | Promise<T>
  ): T | Promise<T> {
    if (!isDevelopment() || !this.config.enableDebug) {
      return fn();
    }

    const startTime = performance.now();
    const result = fn();
    
    if (result instanceof Promise) {
      return result.finally(() => {
        this.logPerformance(label, startTime);
      });
    } else {
      this.logPerformance(label, startTime);
      return result;
    }
  }
}

// Export singleton instance
export const devUtils = DevUtils.getInstance();

// Export convenience functions
export const logDev = (message: string, data?: any) => devUtils.logDevInfo(message, data);
export const logPerf = (label: string, startTime: number) => devUtils.logPerformance(label, startTime);
export const logApi = (method: string, url: string, data?: any) => devUtils.logApiCall(method, url, data);
export const logQuery = (operation: string, queryKey: string[], data?: any) => devUtils.logQueryOperation(operation, queryKey, data);
export const logSupabase = (operation: string, table: string, data?: any) => devUtils.logSupabaseOperation(operation, table, data);
export const withPerf = <T>(label: string, fn: () => T | Promise<T>) => devUtils.withPerformanceMonitoring(label, fn);
export const isFeatureEnabled = (feature: string) => devUtils.isFeatureEnabled(feature);
