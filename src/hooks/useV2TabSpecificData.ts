/**
 * V2 Tab-Specific Data Hooks
 * Duplicates existing data fetching patterns for V2 architecture
 * Uses the same Supabase and API calls as V1, but with V2 orchestration
 */

import { debugLogger } from '@/lib/debug';
import { AnalyticsOrchestratorV2 } from '@/services/data/analyticsOrchestratorV2';
import { DatabaseService } from '@/services/data/databaseService';
import { useQuery } from '@tanstack/react-query';

interface DateRange {
  start: string;
  end: string;
}

// V2 Client data cache (separate from V1 cache)
const v2ClientDataCache = new Map<string, { data: any; timestamp: number }>();
const V2_CLIENT_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

// Helper function to get cached client data for V2
async function getV2CachedClientData(clientId: string) {
  const now = Date.now();
  const cached = v2ClientDataCache.get(clientId);
  
  if (cached && (now - cached.timestamp) < V2_CLIENT_CACHE_DURATION) {
    debugLogger.debug('useV2TabSpecificData', 'Using cached client data for V2', { clientId });
    return cached.data;
  }
  
  debugLogger.debug('useV2TabSpecificData', 'Fetching fresh client data for V2', { clientId });
  const clientData = await DatabaseService.getClientById(clientId);
  v2ClientDataCache.set(clientId, { data: clientData, timestamp: now });
  
  return clientData;
}

// Function to invalidate V2 client data cache
export function invalidateV2ClientDataCache(clientId?: string) {
  if (clientId) {
    v2ClientDataCache.delete(clientId);
  } else {
    v2ClientDataCache.clear();
  }
}

// V2 Hook for Summary tab data (duplicates V1 pattern exactly)
export const useV2SummaryTabData = (clientId: string | undefined, dateRange?: DateRange) => {
  return useQuery({
    queryKey: ['v2-summary-tab-data', clientId, dateRange],
    queryFn: async () => {
      if (!clientId) {
        throw new Error('Client ID is required');
      }
      
      const clientData = await getV2CachedClientData(clientId);
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
      
      debugLogger.info('useV2SummaryTabData', 'Fetching V2 summary data', { 
        clientId, 
        finalDateRange,
        clientAccounts: {
          facebookAds: clientData.accounts?.facebookAds,
          facebookAdsType: typeof clientData.accounts?.facebookAds,
          facebookAdsIsNone: clientData.accounts?.facebookAds === 'none'
        }
      });
      
      // Only fetch essential metrics for summary (same as V1)
      const clientAccounts = {
        facebookAds: clientData.accounts?.facebookAds,
        googleAds: clientData.accounts?.googleAds,
        goHighLevel: clientData.accounts?.goHighLevel,
        googleSheets: clientData.accounts?.googleSheets
      };
      
      debugLogger.info('useV2SummaryTabData', 'Calling V2 AnalyticsOrchestrator with:', {
        clientAccounts,
        willCallFacebook: clientAccounts.facebookAds && clientAccounts.facebookAds !== 'none'
      });
      
      // Use V2 AnalyticsOrchestrator with direct API calls
      const result = await AnalyticsOrchestratorV2.getDashboardData(
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

// V2 Hook for Meta tab data (duplicates V1 pattern exactly)
export const useV2MetaTabData = (clientId: string | undefined, dateRange?: DateRange) => {
  return useQuery({
    queryKey: ['v2-meta-tab-data', clientId, dateRange],
    queryFn: async () => {
      if (!clientId) {
        throw new Error('Client ID is required');
      }
      
      const clientData = await getV2CachedClientData(clientId);
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
      
      debugLogger.info('useV2MetaTabData', 'Fetching V2 meta data', { clientId, finalDateRange });
      
      // Use V2 AnalyticsOrchestrator with direct API calls
      const result = await AnalyticsOrchestratorV2.getDashboardData(
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

// V2 Hook for Google tab data (duplicates V1 pattern exactly)
export const useV2GoogleTabData = (clientId: string | undefined, dateRange?: DateRange) => {
  return useQuery({
    queryKey: ['v2-google-tab-data', clientId, dateRange],
    queryFn: async () => {
      if (!clientId) {
        throw new Error('Client ID is required');
      }
      
      const clientData = await getV2CachedClientData(clientId);
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
      
      debugLogger.info('useV2GoogleTabData', 'Fetching V2 google data', { clientId, finalDateRange });
      
      // Use V2 AnalyticsOrchestrator with direct API calls
      const result = await AnalyticsOrchestratorV2.getDashboardData(
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

// V2 Hook for Leads tab data (duplicates V1 pattern exactly)
export const useV2LeadsTabData = (clientId: string | undefined, dateRange?: DateRange) => {
  return useQuery({
    queryKey: ['v2-leads-tab-data', clientId, dateRange],
    queryFn: async () => {
      if (!clientId) {
        throw new Error('Client ID is required');
      }
      
      const clientData = await getV2CachedClientData(clientId);
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
      
      debugLogger.info('useV2LeadsTabData', 'Fetching V2 leads data', { clientId, finalDateRange });
      
      // Use V2 AnalyticsOrchestrator with direct API calls
      const result = await AnalyticsOrchestratorV2.getDashboardData(
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

