/**
 * Tab-Specific Data Hooks
 * Duplicates existing data fetching patterns for architecture
 * Uses the same Supabase and API calls as V1, but with orchestration
 */

import { debugLogger } from '@/lib/debug';
import { AnalyticsOrchestrator } from '@/services/data/analyticsOrchestrator';
import { DatabaseService } from '@/services/data/databaseService';
import { useQuery } from '@tanstack/react-query';

interface DateRange {
  start: string;
  end: string;
}

// Client data cache (separate from other cache)
const clientDataCache = new Map<string, { data: any; timestamp: number }>();
const CLIENT_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

// Helper function to get cached client data
export async function getCachedClientData(clientId: string) {
  const now = Date.now();
  const cached = clientDataCache.get(clientId);
  
  if (cached && (now - cached.timestamp) < CLIENT_CACHE_DURATION) {
    debugLogger.debug('useTabSpecificData', 'Using cached client data', { clientId });
    return cached.data;
  }
  
  debugLogger.debug('useTabSpecificData', 'Fetching fresh client data', { clientId });
  const clientData = await DatabaseService.getClientById(clientId);
  clientDataCache.set(clientId, { data: clientData, timestamp: now });
  
  return clientData;
}

// Function to invalidate client data cache
export function invalidateClientDataCache(clientId?: string) {
  if (clientId) {
    clientDataCache.delete(clientId);
  } else {
    clientDataCache.clear();
  }
}

// Hook for Summary tab data
export const useSummaryTabData = (clientId: string | undefined, dateRange?: DateRange) => {
  return useQuery({
    queryKey: ['summary-tab-data', clientId, dateRange],
    queryFn: async () => {
      if (!clientId) {
        throw new Error('Client ID is required');
      }
      
      const clientData = await getCachedClientData(clientId);
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
      
      debugLogger.info('useSummaryTabData', 'Fetching summary data', { 
        clientId, 
        finalDateRange,
        clientAccounts: {
          facebookAds: clientData.accounts?.facebookAds,
          facebookAdsType: typeof clientData.accounts?.facebookAds,
          facebookAdsIsNone: clientData.accounts?.facebookAds === 'none'
        }
      });
      
      // Only fetch essential metrics for summary
      const clientAccounts = {
        facebookAds: clientData.accounts?.facebookAds,
        googleAds: clientData.accounts?.googleAds,
        goHighLevel: clientData.accounts?.goHighLevel,
        googleSheets: clientData.accounts?.googleSheets
      };
      
      debugLogger.info('useSummaryTabData', 'Calling AnalyticsOrchestrator with:', {
        clientAccounts,
        willCallFacebook: clientAccounts.facebookAds && clientAccounts.facebookAds !== 'none'
      });
      
      // Use AnalyticsOrchestrator with direct API calls
      const result = await AnalyticsOrchestrator.getDashboardData(
        clientId,
        finalDateRange
      );
      
      return { ...result, clientData };
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });
};

// Hook for Meta tab data
export const useMetaTabData = (clientId: string | undefined, dateRange?: DateRange) => {
  return useQuery({
    queryKey: ['meta-tab-data', clientId, dateRange],
    queryFn: async () => {
      if (!clientId) {
        throw new Error('Client ID is required');
      }
      
      const clientData = await getCachedClientData(clientId);
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
      
      debugLogger.info('useMetaTabData', 'Fetching meta data', { clientId, finalDateRange });
      
      // Use AnalyticsOrchestrator with direct API calls
      const result = await AnalyticsOrchestrator.getDashboardData(
        clientId,
        finalDateRange
      );
      
      return { ...result, clientData };
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });
};

// Hook for Google tab data
export const useGoogleTabData = (clientId: string | undefined, dateRange?: DateRange) => {
  return useQuery({
    queryKey: ['google-tab-data', clientId, dateRange],
    queryFn: async () => {
      if (!clientId) {
        throw new Error('Client ID is required');
      }
      
      const clientData = await getCachedClientData(clientId);
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
      
      debugLogger.info('useGoogleTabData', 'Fetching google data', { clientId, finalDateRange });
      
      // Use AnalyticsOrchestrator with direct API calls
      const result = await AnalyticsOrchestrator.getDashboardData(
        clientId,
        finalDateRange
      );
      
      return { ...result, clientData };
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });
};

// Hook for Leads tab data
export const useLeadsTabData = (clientId: string | undefined, dateRange?: DateRange) => {
  return useQuery({
    queryKey: ['leads-tab-data', clientId, dateRange],
    queryFn: async () => {
      if (!clientId) {
        throw new Error('Client ID is required');
      }
      
      const clientData = await getCachedClientData(clientId);
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
      
      debugLogger.info('useLeadsTabData', 'Fetching leads data', { clientId, finalDateRange });
      
      // Use AnalyticsOrchestrator with direct API calls
      const result = await AnalyticsOrchestrator.getDashboardData(
        clientId,
        finalDateRange
      );
      
      return { ...result, clientData };
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });
};

