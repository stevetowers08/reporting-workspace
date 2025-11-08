/**
 * Tab-Specific Data Hooks
 * Duplicates existing data fetching patterns for architecture
 * Uses the same Supabase and API calls as V1, but with orchestration
 */

import { useClientData } from '@/hooks/useDashboardQueries';
import { AnalyticsOrchestrator } from '@/services/data/analyticsOrchestrator';
import { useQuery } from '@tanstack/react-query';

interface DateRange {
  start: string;
  end: string;
  period?: string; // For API preset periods like 'lastMonth', '30d'
}

// Hook for Summary tab data
export const useSummaryTabData = (clientId: string | undefined, dateRange?: DateRange) => {
  // Use React Query for client data
  const { data: clientData, isLoading: clientLoading } = useClientData(clientId);
  
  return useQuery({
    queryKey: ['summary-tab-data', clientId, dateRange],
    queryFn: async () => {
      if (!clientId) {
        throw new Error('Client ID is required');
      }
      
      if (!clientData) {
        throw new Error('Client not found');
      }
      
      const finalDateRange = dateRange || (() => {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 30);
        return {
          start: startDate.toISOString().split('T')[0], 
          end: endDate.toISOString().split('T')[0] 
        };
      })();
      
      // Only log errors in production, remove debug info logging
      // debugLogger.info('useSummaryTabData', 'Fetching summary data', { 
      //   clientId, 
      //   finalDateRange,
      //   clientAccounts: {
      //     facebookAds: clientData.accounts?.facebookAds,
      //     facebookAdsType: typeof clientData.accounts?.facebookAds,
      //     facebookAdsIsNone: clientData.accounts?.facebookAds === 'none'
      //   }
      // });
      
      // Only fetch essential metrics for summary
      const clientAccounts = {
        facebookAds: clientData.accounts?.facebookAds,
        googleAds: clientData.accounts?.googleAds,
        goHighLevel: clientData.accounts?.goHighLevel,
        googleSheets: clientData.accounts?.googleSheets
      };
      
      // Removed debug logging for production performance
      
      // Use AnalyticsOrchestrator with direct API calls
      const result = await AnalyticsOrchestrator.getDashboardData(
        clientId,
        finalDateRange
      );
      
      return { ...result, clientData };
    },
    enabled: !!clientId && !!clientData,
    staleTime: 0, // Always fetch fresh data for reporting
    gcTime: 0, // Don't cache for reporting
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: true, // Always refetch on mount for fresh data
  });
};

// Hook for Meta tab data
export const useMetaTabData = (clientId: string | undefined, dateRange?: DateRange) => {
  // Use React Query for client data
  const { data: clientData, isLoading: clientLoading } = useClientData(clientId);
  
  return useQuery({
    queryKey: ['meta-tab-data', clientId, dateRange],
    queryFn: async () => {
      if (!clientId) {
        throw new Error('Client ID is required');
      }
      
      if (!clientData) {
        throw new Error('Client not found');
      }
      
      const finalDateRange = dateRange || (() => {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 30);
        return {
          start: startDate.toISOString().split('T')[0], 
          end: endDate.toISOString().split('T')[0] 
        };
      })();
      
      // debugLogger.info('useMetaTabData', 'Fetching meta data', { clientId, finalDateRange });
      
      // Use AnalyticsOrchestrator with direct API calls
      const result = await AnalyticsOrchestrator.getDashboardData(
        clientId,
        finalDateRange
      );
      
      return { ...result, clientData };
    },
    enabled: !!clientId && !!clientData,
    staleTime: 0, // Always fetch fresh data for reporting
    gcTime: 0, // Don't cache for reporting
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: true, // Always refetch on mount for fresh data
  });
};

// Hook for Google tab data
export const useGoogleTabData = (clientId: string | undefined, dateRange?: DateRange) => {
  const { data: clientData, isLoading: clientLoading } = useClientData(clientId);
  
  const finalDateRange = dateRange || (() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);
    return {
      start: startDate.toISOString().split('T')[0], 
      end: endDate.toISOString().split('T')[0] 
    };
  })();
  
  const query = useQuery({
    queryKey: ['google-tab-data', clientId, dateRange],
    queryFn: async () => {
      if (!clientId) throw new Error('Client ID is required');
      if (!clientData) throw new Error('Client not found');
      
      // OPTIMIZED: Only fetch Google data, not all dashboard data
      const googleData = await AnalyticsOrchestrator.getGoogleDataOnly(clientId, finalDateRange, clientData);
      return { 
        googleMetrics: googleData,
        clientData 
      };
    },
    enabled: !!clientId && !!clientData,
    staleTime: 0, // Always fetch fresh data for reporting (no caching)
    gcTime: 0, // Don't cache for reporting
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: true, // Always refetch on mount for fresh data
  });
  
  // Return with combined loading state
  // React Query's isLoading = isFetching && !data (already handles "no data yet")
  // We also need to wait for client data before we can fetch Google data
  return {
    ...query,
    isLoading: query.isLoading || clientLoading,
  };
};

// Hook for Leads tab data
export const useLeadsTabData = (clientId: string | undefined, dateRange?: DateRange) => {
  // Use React Query for client data
  const { data: clientData, isLoading: clientLoading } = useClientData(clientId);
  
  return useQuery({
    queryKey: ['leads-tab-data', clientId, dateRange],
    queryFn: async () => {
      if (!clientId) {
        throw new Error('Client ID is required');
      }
      
      if (!clientData) {
        throw new Error('Client not found');
      }
      
      const finalDateRange = dateRange || (() => {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 30);
        return {
          start: startDate.toISOString().split('T')[0], 
          end: endDate.toISOString().split('T')[0] 
        };
      })();
      
      // debugLogger.info('useLeadsTabData', 'Fetching leads data', { clientId, finalDateRange });
      
      // Use AnalyticsOrchestrator with direct API calls
      const result = await AnalyticsOrchestrator.getDashboardData(
        clientId,
        finalDateRange
      );
      
      return { ...result, clientData };
    },
    enabled: !!clientId && !!clientData,
    staleTime: 0, // Always fetch fresh data for reporting
    gcTime: 0, // Don't cache for reporting
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: true, // Always refetch on mount for fresh data
  });
};

