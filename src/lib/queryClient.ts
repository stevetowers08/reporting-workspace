import { QueryClient } from '@tanstack/react-query';
import { debugLogger } from './debug';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Enhanced caching strategy
      staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh for 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache for 30 minutes
      refetchOnWindowFocus: false, // Don't refetch when window gains focus
      refetchOnMount: false, // ✅ PERFORMANCE FIX: Don't refetch on mount if data is fresh (respects staleTime)
      refetchOnReconnect: true, // Refetch when network reconnects
      refetchInterval: false, // No automatic polling by default
      
      // Smart retry logic
      retry: (failureCount, error: any) => {
        // Don't retry on client errors (4xx)
        if (error?.status >= 400 && error?.status < 500) {
          debugLogger.warn('QueryClient', 'Not retrying 4xx error', { 
            status: error.status, 
            failureCount 
          });
          return false;
        }
        
        // Don't retry on network errors after 2 attempts
        if (error?.message?.includes('network') && failureCount >= 2) {
          debugLogger.warn('QueryClient', 'Not retrying network error after 2 attempts', { 
            failureCount 
          });
          return false;
        }
        
        // Retry up to 3 times for server errors (5xx)
        const shouldRetry = failureCount < 3;
        debugLogger.info('QueryClient', 'Retry decision', { 
          failureCount, 
          shouldRetry, 
          errorStatus: error?.status 
        });
        return shouldRetry;
      },
      
      // Exponential backoff with jitter
      retryDelay: (attemptIndex) => {
        const baseDelay = Math.min(1000 * 2 ** attemptIndex, 10000); // Max 10 seconds
        const jitter = Math.random() * 1000; // Add up to 1 second of jitter
        return baseDelay + jitter;
      },
      
      // Network mode handling
      networkMode: 'online', // Only run queries when online
    },
    
    mutations: {
      // Don't retry mutations by default
      retry: false,
      
      // Network mode for mutations
      networkMode: 'online',
    },
  },
});

// Query keys factory for consistent key management
export const queryKeys = {
  clients: {
    all: ['clients'] as const,
    lists: () => [...queryKeys.clients.all, 'list'] as const,
    list: (filters: string) => [...queryKeys.clients.lists(), { filters }] as const,
    details: () => [...queryKeys.clients.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.clients.details(), id] as const,
  },
  metrics: {
    all: ['metrics'] as const,
    client: (clientId: string) => [...queryKeys.metrics.all, 'client', clientId] as const,
    clientPlatform: (clientId: string, platform: string) => 
      [...queryKeys.metrics.client(clientId), platform] as const,
    clientDateRange: (clientId: string, platform: string, dateRange: { start: string; end: string }) =>
      [...queryKeys.metrics.clientPlatform(clientId, platform), dateRange] as const,
  },
  integrations: {
    all: ['integrations'] as const,
    platform: (platform: string) => [...queryKeys.integrations.all, platform] as const,
    display: () => [...queryKeys.integrations.all, 'display'] as const,
    tokens: (platform: string) => [...queryKeys.integrations.all, 'tokens', platform] as const,
  },
  facebookAds: {
    all: ['facebookAds'] as const,
    accounts: () => [...queryKeys.facebookAds.all, 'accounts'] as const,
    metrics: (accountId: string, dateRange: { start: string; end: string }) =>
      [...queryKeys.facebookAds.all, 'metrics', accountId, dateRange] as const,
    campaigns: (accountId: string, dateRange?: { start: string; end: string }) =>
      [...queryKeys.facebookAds.all, 'campaigns', accountId, dateRange] as const,
  },
  googleAds: {
    all: ['googleAds'] as const,
    accounts: () => [...queryKeys.googleAds.all, 'accounts'] as const,
    metrics: (customerId: string, dateRange: { start: string; end: string }) =>
      [...queryKeys.googleAds.all, 'metrics', customerId, dateRange] as const,
    campaigns: (customerId: string, dateRange?: { start: string; end: string }) =>
      [...queryKeys.googleAds.all, 'campaigns', customerId, dateRange] as const,
  },
} as const;
