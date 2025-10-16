import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import { debugLogger } from '@/lib/debug';

/**
 * Cache invalidation utilities for React Query
 */
export class CacheManager {
  private static queryClient: any = null;

  static setQueryClient(queryClient: any) {
    this.queryClient = queryClient;
  }

  /**
   * Invalidate all client-related queries
   */
  static invalidateClients() {
    if (!this.queryClient) {return;}
    
    debugLogger.info('CacheManager', 'Invalidating all client queries');
    return this.queryClient.invalidateQueries({ 
      queryKey: queryKeys.clients.all 
    });
  }

  /**
   * Invalidate specific client queries
   */
  static invalidateClient(clientId: string) {
    if (!this.queryClient) {return;}
    
    debugLogger.info('CacheManager', 'Invalidating client queries', { clientId });
    return this.queryClient.invalidateQueries({ 
      queryKey: queryKeys.clients.detail(clientId) 
    });
  }

  /**
   * Invalidate all integration queries
   */
  static invalidateIntegrations() {
    if (!this.queryClient) {return;}
    
    debugLogger.info('CacheManager', 'Invalidating all integration queries');
    return this.queryClient.invalidateQueries({ 
      queryKey: queryKeys.integrations.all 
    });
  }

  /**
   * Invalidate specific platform integration queries
   */
  static invalidateIntegration(platform: string) {
    if (!this.queryClient) {return;}
    
    debugLogger.info('CacheManager', 'Invalidating integration queries', { platform });
    return this.queryClient.invalidateQueries({ 
      queryKey: queryKeys.integrations.platform(platform) 
    });
  }

  /**
   * Invalidate all metrics queries for a client
   */
  static invalidateClientMetrics(clientId: string) {
    if (!this.queryClient) {return;}
    
    debugLogger.info('CacheManager', 'Invalidating client metrics', { clientId });
    return this.queryClient.invalidateQueries({ 
      queryKey: queryKeys.metrics.client(clientId) 
    });
  }

  /**
   * Invalidate specific platform metrics for a client
   */
  static invalidateClientPlatformMetrics(clientId: string, platform: string) {
    if (!this.queryClient) {return;}
    
    debugLogger.info('CacheManager', 'Invalidating platform metrics', { clientId, platform });
    return this.queryClient.invalidateQueries({ 
      queryKey: queryKeys.metrics.clientPlatform(clientId, platform) 
    });
  }

  /**
   * Invalidate Facebook Ads queries
   */
  static invalidateFacebookAds(accountId?: string) {
    if (!this.queryClient) {return;}
    
    debugLogger.info('CacheManager', 'Invalidating Facebook Ads queries', { accountId });
    if (accountId) {
      return this.queryClient.invalidateQueries({ 
        queryKey: queryKeys.facebookAds.all,
        predicate: (query: any) => 
          query.queryKey.includes('facebookAds') && 
          query.queryKey.includes(accountId)
      });
    }
    return this.queryClient.invalidateQueries({ 
      queryKey: queryKeys.facebookAds.all 
    });
  }

  /**
   * Invalidate Google Ads queries
   */
  static invalidateGoogleAds(customerId?: string) {
    if (!this.queryClient) {return;}
    
    debugLogger.info('CacheManager', 'Invalidating Google Ads queries', { customerId });
    if (customerId) {
      return this.queryClient.invalidateQueries({ 
        queryKey: queryKeys.googleAds.all,
        predicate: (query: any) => 
          query.queryKey.includes('googleAds') && 
          query.queryKey.includes(customerId)
      });
    }
    return this.queryClient.invalidateQueries({ 
      queryKey: queryKeys.googleAds.all 
    });
  }

  /**
   * Clear all cached data
   */
  static clearAll() {
    if (!this.queryClient) {return;}
    
    debugLogger.info('CacheManager', 'Clearing all cached data');
    return this.queryClient.clear();
  }

  /**
   * Remove specific queries from cache
   */
  static removeQueries(queryKey: any[]) {
    if (!this.queryClient) {return;}
    
    debugLogger.info('CacheManager', 'Removing queries from cache', { queryKey });
    return this.queryClient.removeQueries({ queryKey });
  }

  /**
   * Prefetch data for better UX
   */
  static async prefetchClient(clientId: string, queryFn: () => Promise<any>) {
    if (!this.queryClient) {return;}
    
    debugLogger.info('CacheManager', 'Prefetching client data', { clientId });
    return this.queryClient.prefetchQuery({
      queryKey: queryKeys.clients.detail(clientId),
      queryFn,
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  }

  /**
   * Prefetch integration data
   */
  static async prefetchIntegration(platform: string, queryFn: () => Promise<any>) {
    if (!this.queryClient) {return;}
    
    debugLogger.info('CacheManager', 'Prefetching integration data', { platform });
    return this.queryClient.prefetchQuery({
      queryKey: queryKeys.integrations.platform(platform),
      queryFn,
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  }

  /**
   * Get cached data without triggering a fetch
   */
  static getCachedData(queryKey: any[]) {
    if (!this.queryClient) {return null;}
    
    return this.queryClient.getQueryData(queryKey);
  }

  /**
   * Set cached data manually
   */
  static setCachedData(queryKey: any[], data: any) {
    if (!this.queryClient) {return;}
    
    debugLogger.info('CacheManager', 'Setting cached data', { queryKey });
    return this.queryClient.setQueryData(queryKey, data);
  }

  /**
   * Get cache statistics
   */
  static getCacheStats() {
    if (!this.queryClient) {return null;}
    
    const cache = this.queryClient.getQueryCache();
    const queries = cache.getAll();
    
    const stats = {
      totalQueries: queries.length,
      staleQueries: queries.filter((q: any) => q.isStale()).length,
      fetchingQueries: queries.filter((q: any) => q.state.status === 'pending').length,
      errorQueries: queries.filter((q: any) => q.state.status === 'error').length,
      cacheSize: JSON.stringify(queries).length, // Rough estimate
    };
    
    debugLogger.info('CacheManager', 'Cache statistics', stats);
    return stats;
  }
}

/**
 * Hook for cache management
 */
export function useCacheManager() {
  const queryClient = useQueryClient();
  
  // Set the query client for static methods
  CacheManager.setQueryClient(queryClient);
  
  return {
    invalidateClients: () => CacheManager.invalidateClients(),
    invalidateClient: (clientId: string) => CacheManager.invalidateClient(clientId),
    invalidateIntegrations: () => CacheManager.invalidateIntegrations(),
    invalidateIntegration: (platform: string) => CacheManager.invalidateIntegration(platform),
    invalidateClientMetrics: (clientId: string) => CacheManager.invalidateClientMetrics(clientId),
    invalidateClientPlatformMetrics: (clientId: string, platform: string) => 
      CacheManager.invalidateClientPlatformMetrics(clientId, platform),
    invalidateFacebookAds: (accountId?: string) => CacheManager.invalidateFacebookAds(accountId),
    invalidateGoogleAds: (customerId?: string) => CacheManager.invalidateGoogleAds(customerId),
    clearAll: () => CacheManager.clearAll(),
    removeQueries: (queryKey: any[]) => CacheManager.removeQueries(queryKey),
    prefetchClient: (clientId: string, queryFn: () => Promise<any>) => 
      CacheManager.prefetchClient(clientId, queryFn),
    prefetchIntegration: (platform: string, queryFn: () => Promise<any>) => 
      CacheManager.prefetchIntegration(platform, queryFn),
    getCachedData: (queryKey: any[]) => CacheManager.getCachedData(queryKey),
    setCachedData: (queryKey: any[], data: any) => CacheManager.setCachedData(queryKey, data),
    getCacheStats: () => CacheManager.getCacheStats(),
  };
}
