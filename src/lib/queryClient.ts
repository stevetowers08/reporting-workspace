import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      refetchOnMount: false, // Prevent unnecessary refetches
      refetchOnReconnect: false, // Prevent refetch on network reconnect
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry up to 2 times for other errors (reduced from 3)
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Max 10 second delay
    },
    mutations: {
      retry: false,
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
