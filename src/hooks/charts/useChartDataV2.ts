/**
 * V2 Chart Data Hooks
 * Uses improved AnalyticsOrchestratorV2 with smart caching and deduplication
 * Implements researched best practices for React Query configuration
 */

import { debugLogger } from '@/lib/debug';
import { AnalyticsOrchestratorV2 } from '@/services/data/analyticsOrchestratorV2';
import { DatabaseService } from '@/services/data/databaseService';
import { useQuery } from '@tanstack/react-query';

// Define DateRange interface locally to avoid import issues
interface DateRange {
  start: string;
  end: string;
}

// Shared client data cache to prevent repeated API calls (V2 improvement)
const clientDataCache = new Map<string, { data: any; timestamp: number }>();
const CLIENT_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

// Helper function to get cached client data (V2 improvement)
async function getCachedClientData(clientId: string) {
  const now = Date.now();
  const cached = clientDataCache.get(clientId);
  
  if (cached && (now - cached.timestamp) < CLIENT_CACHE_DURATION) {
    debugLogger.debug('useChartDataV2', 'Using cached client data', { clientId });
    return cached.data;
  }
  
  debugLogger.debug('useChartDataV2', 'Fetching fresh client data', { clientId });
  const clientData = await DatabaseService.getClientById(clientId);
  clientDataCache.set(clientId, { data: clientData, timestamp: now });
  
  return clientData;
}

// Hook for fetching comprehensive dashboard data with V2 improvements
export const useDashboardDataV2 = (clientId: string | undefined, dateRange: DateRange | undefined) => {
  return useQuery({
    queryKey: ['dashboard-data-v2', clientId, dateRange],
    queryFn: async () => {
      if (!clientId || !dateRange) {
        throw new Error('Client ID and Date Range are required for dashboard data');
      }
      
      debugLogger.debug('useDashboardDataV2', 'Fetching dashboard data', { clientId, dateRange });
      return AnalyticsOrchestratorV2.getDashboardData(clientId, dateRange);
    },
    enabled: !!clientId && !!dateRange,
    staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in memory longer
    retry: 1, // Only retry once on failure (best practice)
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Use cache if available
    retryOnMount: false, // Don't retry on component mount
    refetchOnReconnect: true, // Refetch when network reconnects
  });
};

// Hook for fetching integration status with V2 improvements
export const useIntegrationStatusV2 = () => {
  return useQuery({
    queryKey: ['integration-status-v2'],
    queryFn: async () => {
      debugLogger.debug('useIntegrationStatusV2', 'Fetching integration status');
      return AnalyticsOrchestratorV2.getIntegrationStatus();
    },
    staleTime: 3 * 60 * 1000, // 3 minutes - integration status changes less frequently
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1, // Only retry once on failure
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Use cache if available
    retryOnMount: false, // Don't retry on component mount
    refetchOnReconnect: true, // Refetch when network reconnects
  });
};

// Hook for Summary tab with V2 improvements
export const useSummaryTabDataV2 = (clientId: string | undefined, dateRange: DateRange | undefined) => {
  return useQuery({
    queryKey: ['summary-tab-data-v2', clientId, dateRange],
    queryFn: async () => {
      if (!clientId || !dateRange) {
        throw new Error('Client ID and Date Range are required');
      }
      
      debugLogger.debug('useSummaryTabDataV2', 'Fetching summary data', { clientId, dateRange });
      return AnalyticsOrchestratorV2.getDashboardData(clientId, dateRange);
    },
    enabled: !!clientId && !!dateRange,
    staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in memory longer
    retry: 1, // Only retry once on failure
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Use cache if available
    retryOnMount: false, // Don't retry on component mount
    refetchOnReconnect: true, // Refetch when network reconnects
  });
};

// Hook for Meta tab with V2 improvements
export const useMetaTabDataV2 = (clientId: string | undefined, dateRange: DateRange | undefined) => {
  return useQuery({
    queryKey: ['meta-tab-data-v2', clientId, dateRange],
    queryFn: async () => {
      if (!clientId || !dateRange) {
        throw new Error('Client ID and Date Range are required');
      }
      
      debugLogger.debug('useMetaTabDataV2', 'Fetching Meta data', { clientId, dateRange });
      return AnalyticsOrchestratorV2.getDashboardData(clientId, dateRange);
    },
    enabled: !!clientId && !!dateRange,
    staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in memory longer
    retry: 1, // Only retry once on failure
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Use cache if available
    retryOnMount: false, // Don't retry on component mount
    refetchOnReconnect: true, // Refetch when network reconnects
  });
};

// Hook for Google tab with V2 improvements
export const useGoogleTabDataV2 = (clientId: string | undefined, dateRange: DateRange | undefined) => {
  return useQuery({
    queryKey: ['google-tab-data-v2', clientId, dateRange],
    queryFn: async () => {
      if (!clientId || !dateRange) {
        throw new Error('Client ID and Date Range are required');
      }
      
      debugLogger.debug('useGoogleTabDataV2', 'Fetching Google data', { clientId, dateRange });
      return AnalyticsOrchestratorV2.getDashboardData(clientId, dateRange);
    },
    enabled: !!clientId && !!dateRange,
    staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in memory longer
    retry: 1, // Only retry once on failure
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Use cache if available
    retryOnMount: false, // Don't retry on component mount
    refetchOnReconnect: true, // Refetch when network reconnects
  });
};

// Hook for Leads tab with V2 improvements
export const useLeadsTabDataV2 = (clientId: string | undefined, dateRange: DateRange | undefined) => {
  return useQuery({
    queryKey: ['leads-tab-data-v2', clientId, dateRange],
    queryFn: async () => {
      if (!clientId || !dateRange) {
        throw new Error('Client ID and Date Range are required');
      }
      
      debugLogger.debug('useLeadsTabDataV2', 'Fetching Leads data', { clientId, dateRange });
      return AnalyticsOrchestratorV2.getDashboardData(clientId, dateRange);
    },
    enabled: !!clientId && !!dateRange,
    staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in memory longer
    retry: 1, // Only retry once on failure
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Use cache if available
    retryOnMount: false, // Don't retry on component mount
    refetchOnReconnect: true, // Refetch when network reconnects
  });
};

// Utility function to invalidate V2 cache
export const invalidateV2Cache = (clientId?: string, dependency?: string) => {
  AnalyticsOrchestratorV2.invalidateCache(clientId, dependency);
};