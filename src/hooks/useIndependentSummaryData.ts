import { debugLogger } from '@/lib/debug';
import { AnalyticsOrchestrator } from '@/services/data/analyticsOrchestrator';
import { EventDashboardData } from '@/services/data/eventMetricsService';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { getCachedClientData } from './useTabSpecificData';

// Simplified summary data hook that uses the same API calls as the Meta tab
const fetchSummaryData = async (clientId: string, dateRange: { start: string; end: string }): Promise<EventDashboardData> => {
  const clientData = await getCachedClientData(clientId);
  if (!clientData) {
    throw new Error('Client not found');
  }
  
  debugLogger.info('fetchSummaryData', 'Using AnalyticsOrchestrator for summary data', { 
    clientId, 
    dateRange,
    clientAccounts: {
      facebookAds: clientData.accounts?.facebookAds,
      googleAds: clientData.accounts?.googleAds,
      goHighLevel: clientData.accounts?.goHighLevel
    }
  });
  
  // Use the same API calls as the Meta tab - this is what works!
  const result = await AnalyticsOrchestrator.getDashboardData(clientId, dateRange);
  
  debugLogger.info('fetchSummaryData', 'Summary data fetched successfully', {
    totalLeads: result.totalLeads,
    totalSpend: result.totalSpend,
    totalRevenue: result.totalRevenue,
    hasFacebookData: !!result.facebookMetrics,
    hasGoogleData: !!result.googleMetrics,
    facebookLeads: result.facebookMetrics?.leads || 0,
    googleLeads: result.googleMetrics?.leads || 0
  });
  
  return result;
};

export const useIndependentSummaryData = (clientId: string | undefined, dateRange?: { start: string; end: string }): ReturnType<typeof useQuery<EventDashboardData>> => {
  // Calculate default date range (last 30 days)
  const defaultDateRange = React.useMemo(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);
    return {
      start: startDate.toISOString().split('T')[0], 
      end: endDate.toISOString().split('T')[0] 
    };
  }, []);
  
  const finalDateRange = dateRange || defaultDateRange;
  
  return useQuery<EventDashboardData>({
    queryKey: ['independent-summary-data', clientId, finalDateRange.start, finalDateRange.end],
    queryFn: () => fetchSummaryData(clientId!, finalDateRange),
    enabled: !!clientId,
    staleTime: 2 * 60 * 1000, // 2 minutes - shorter for more responsive data
    gcTime: 10 * 60 * 1000, // 10 minutes - shorter garbage collection
    retry: (failureCount, error) => {
      // Only retry once for network errors, not for client errors
      if (failureCount < 1 && error instanceof Error && !error.message.includes('Client not found')) {
        return true;
      }
      return false;
    },
    refetchOnWindowFocus: false, // Prevent refetch on window focus
    refetchOnMount: false, // Use cached data if available
    refetchOnReconnect: true, // Refetch when network reconnects
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
};