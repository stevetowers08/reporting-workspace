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
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
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
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

// Hook for Google tab data
export const useGoogleTabData = (clientId: string | undefined, dateRange?: DateRange) => {
  // Use React Query for client data
  const { data: clientData, isLoading: clientLoading } = useClientData(clientId);
  
  return useQuery({
    queryKey: ['google-tab-data', clientId, dateRange],
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
      
      // debugLogger.info('useGoogleTabData', 'Fetching google data', { clientId, finalDateRange });
      
      // Use AnalyticsOrchestrator with direct API calls
      const result = await AnalyticsOrchestrator.getDashboardData(
        clientId,
        finalDateRange
      );
      
      return { ...result, clientData };
    },
    enabled: !!clientId && !!clientData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
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
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

