/**
 * Tab-Specific Data Hooks
 * Duplicates existing data fetching patterns for architecture
 * Uses the same Supabase and API calls as V1, but with orchestration
 */

import { AnalyticsOrchestrator } from '@/services/data/analyticsOrchestrator';
import { useQuery } from '@tanstack/react-query';
import { useIntegrationCheck } from './useIntegrationCheck';

interface DateRange {
  start: string;
  end: string;
  period?: string; // For API preset periods like 'lastMonth', '30d'
}

// Hook for Summary tab data - OPTIMIZED: Only fetch Facebook, Google, MonthlyLeads (no GHL, no LeadData)
export const useSummaryTabData = (clientId: string | undefined, dateRange?: DateRange, clientData?: any) => {
  return useQuery({
    queryKey: ['summary-tab-data', clientId, dateRange],
    queryFn: async ({ signal }) => {
      if (!clientId) {
        throw new Error('Client ID is required');
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

      // Use provided client data or fetch if not available
      let finalClientData = clientData;
      if (!finalClientData) {
        const { DatabaseService } = await import('@/services/data/databaseService');
        finalClientData = await DatabaseService.getClientById(clientId);
      }
      if (!finalClientData) throw new Error('Client not found');

      if (signal?.aborted) {
        throw new Error('Request cancelled');
      }

      // OPTIMIZED: Only fetch what Summary tab needs (Facebook, Google, MonthlyLeads)
      // No GHL, no LeadData - completely independent
      const result = await AnalyticsOrchestrator.getSummaryDataOnly(
        clientId,
        finalDateRange,
        finalClientData
      );

      if (signal?.aborted) {
        throw new Error('Request cancelled');
      }

      return result;
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000, // 5 minutes - standardized
    gcTime: 15 * 60 * 1000, // 15 minutes - standardized
    retry: 2,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

// Hook for Meta tab data - OPTIMIZED: Only fetch Facebook data, no blocking on other integrations
export const useMetaTabData = (clientId: string | undefined, dateRange?: DateRange, clientData?: any) => {
  return useQuery({
    queryKey: ['meta-tab-data', clientId, dateRange],
    queryFn: async ({ signal }) => {
      if (!clientId) {
        throw new Error('Client ID is required');
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
      
      console.log('[useMetaTabData] Starting fetch', { clientId, finalDateRange });
      
      try {
        // Use provided client data or fetch if not available
        let finalClientData = clientData;
        if (!finalClientData) {
          const { DatabaseService } = await import('@/services/data/databaseService');
          finalClientData = await DatabaseService.getClientById(clientId);
        }
        if (!finalClientData) throw new Error('Client not found');

        if (signal?.aborted) {
          throw new Error('Request cancelled');
        }
        
        // OPTIMIZED: Only fetch Facebook data, not all dashboard data
        // This prevents blocking on GHL or other integrations
        const facebookData = await AnalyticsOrchestrator.getFacebookDataOnly(
          clientId,
          finalDateRange,
          finalClientData
        );

        if (signal?.aborted) {
          throw new Error('Request cancelled');
        }
        
        // Build minimal response with just Facebook data
        const result = {
          clientData: finalClientData,
          clientAccounts: {
            facebookAds: finalClientData.accounts?.facebookAds,
            googleAds: finalClientData.accounts?.googleAds,
            goHighLevel: finalClientData.accounts?.goHighLevel,
            googleSheets: finalClientData.accounts?.googleSheets,
            googleSheetsConfig: finalClientData.accounts?.googleSheetsConfig
          },
          dateRange: finalDateRange,
          facebookMetrics: facebookData,
          googleMetrics: undefined,
          ghlMetrics: undefined,
          leadData: undefined,
          monthlyLeadsData: undefined,
          totalLeads: facebookData?.leads || 0,
          totalSpend: facebookData?.spend || 0,
          totalRevenue: 0,
          roi: 0,
          overallConversionRate: 0,
          leadMetrics: {
            facebookCostPerLead: facebookData?.costPerLead || 0,
            googleCostPerLead: 0,
            overallCostPerLead: facebookData?.costPerLead || 0,
            leadToOpportunityRate: 0,
            opportunityToWinRate: 0,
            averageEventValue: 0,
            totalOpportunities: 0,
            averageGuestsPerEvent: 0,
            mostPopularEventType: 'Unknown',
            seasonalTrends: [],
            landingPageConversionRate: 0,
            formCompletionRate: 0,
            leadSourceBreakdown: []
          }
        };
        
        console.log('[useMetaTabData] Fetch complete', { 
          hasData: !!result,
          hasFacebookMetrics: !!result?.facebookMetrics,
          hasClientData: !!result?.clientData
        });
        
        return result;
      } catch (error) {
        console.error('[useMetaTabData] Fetch error', error);
        throw error;
      }
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000, // 5 minutes - standardized
    gcTime: 15 * 60 * 1000, // 15 minutes - standardized
    retry: 2,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

// Hook for Google tab data - OPTIMIZED: Independent loading, no blocking
export const useGoogleTabData = (clientId: string | undefined, dateRange?: DateRange, clientData?: any) => {
  const finalDateRange = dateRange || (() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);
    return {
      start: startDate.toISOString().split('T')[0], 
      end: endDate.toISOString().split('T')[0] 
    };
  })();
  
  return useQuery({
    queryKey: ['google-tab-data', clientId, dateRange],
    queryFn: async ({ signal }) => {
      if (!clientId) throw new Error('Client ID is required');
      
      // Use provided client data or fetch if not available
      let finalClientData = clientData;
      if (!finalClientData) {
        const { DatabaseService } = await import('@/services/data/databaseService');
        finalClientData = await DatabaseService.getClientById(clientId);
      }
      if (!finalClientData) throw new Error('Client not found');

      if (signal?.aborted) {
        throw new Error('Request cancelled');
      }
      
      // OPTIMIZED: Only fetch Google data, not all dashboard data
      const googleData = await AnalyticsOrchestrator.getGoogleDataOnly(clientId, finalDateRange, finalClientData);

      if (signal?.aborted) {
        throw new Error('Request cancelled');
      }
      
      return { 
        googleMetrics: googleData,
        clientData: finalClientData 
      };
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000, // 5 minutes - standardized
    gcTime: 15 * 60 * 1000, // 15 minutes - standardized
    retry: 2,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

// Hook for Leads tab data - OPTIMIZED: Only fetch LeadData (Google Sheets), no other integrations
export const useLeadsTabData = (clientId: string | undefined, dateRange?: DateRange, clientData?: any) => {
  return useQuery({
    queryKey: ['leads-tab-data', clientId, dateRange],
    queryFn: async ({ signal }) => {
      if (!clientId) {
        throw new Error('Client ID is required');
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

      // Use provided client data or fetch if not available
      let finalClientData = clientData;
      if (!finalClientData) {
        const { DatabaseService } = await import('@/services/data/databaseService');
        finalClientData = await DatabaseService.getClientById(clientId);
      }
      if (!finalClientData) throw new Error('Client not found');

      if (signal?.aborted) {
        throw new Error('Request cancelled');
      }

      // OPTIMIZED: Only fetch LeadData (Google Sheets), not all dashboard data
      // No Facebook, no Google, no GHL - completely independent
      const leadData = await AnalyticsOrchestrator.getLeadDataOnly(
        clientId,
        finalDateRange,
        finalClientData
      );

      if (signal?.aborted) {
        throw new Error('Request cancelled');
      }

      // Build minimal response with just LeadData
      return {
        clientData: finalClientData,
        clientAccounts: {
          facebookAds: finalClientData.accounts?.facebookAds,
          googleAds: finalClientData.accounts?.googleAds,
          goHighLevel: finalClientData.accounts?.goHighLevel,
          googleSheets: finalClientData.accounts?.googleSheets,
          googleSheetsConfig: finalClientData.accounts?.googleSheetsConfig
        },
        dateRange: finalDateRange,
        facebookMetrics: undefined,
        googleMetrics: undefined,
        ghlMetrics: undefined,
        leadData,
        monthlyLeadsData: undefined,
        totalLeads: leadData?.totalLeads || 0,
        totalSpend: 0,
        totalRevenue: 0,
        roi: 0,
        overallConversionRate: 0,
        leadMetrics: {
          facebookCostPerLead: 0,
          googleCostPerLead: 0,
          overallCostPerLead: 0,
          leadToOpportunityRate: 0,
          opportunityToWinRate: 0,
          averageEventValue: 0,
          totalOpportunities: 0,
          averageGuestsPerEvent: 0,
          mostPopularEventType: 'Unknown',
          seasonalTrends: [],
          landingPageConversionRate: 0,
          formCompletionRate: 0,
          leadSourceBreakdown: []
        }
      };
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000, // 5 minutes - standardized
    gcTime: 15 * 60 * 1000, // 15 minutes - standardized
    retry: 2,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

