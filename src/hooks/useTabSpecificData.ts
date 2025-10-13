import { debugLogger } from '@/lib/debug';
import { DatabaseService } from '@/services/data/databaseService';
import { EventMetricsService } from '@/services/data/eventMetricsService';
import { LeadDataService } from '@/services/data/leadDataService';
import { GoHighLevelAnalyticsService } from '@/services/ghl/goHighLevelAnalyticsService';
import { useQuery } from '@tanstack/react-query';

interface DateRange {
  start: string;
  end: string;
}

// Hook for Summary tab data (minimal data needed for overview)
export const useSummaryTabData = (clientId: string | undefined, dateRange?: DateRange) => {
  return useQuery({
    queryKey: ['summary-tab-data', clientId, dateRange],
    queryFn: async () => {
      if (!clientId) throw new Error('Client ID is required');
      
      const clientData = await DatabaseService.getClientById(clientId);
      if (!clientData) throw new Error('Client not found');
      
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
      
      
      debugLogger.info('useSummaryTabData', 'Calling EventMetricsService with:', {
        clientAccounts,
        willCallFacebook: clientAccounts.facebookAds && clientAccounts.facebookAds !== 'none'
      });
      
      const result = await EventMetricsService.getComprehensiveMetrics(
        clientId,
        finalDateRange,
        clientAccounts
      );
      
      return { ...result, clientData };
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: 1,
    refetchOnWindowFocus: false,
    timeout: 30000, // 30 second timeout to prevent infinite loading
  });
};

// Hook for Meta/Facebook Ads tab data
export const useMetaTabData = (clientId: string | undefined, dateRange?: DateRange) => {
  return useQuery({
    queryKey: ['meta-tab-data', clientId, dateRange, 'with-previous-period'],
    queryFn: async () => {
      if (!clientId) throw new Error('Client ID is required');
      
      const clientData = await DatabaseService.getClientById(clientId);
      if (!clientData) throw new Error('Client not found');
      
      const finalDateRange = dateRange || (() => {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 30);
        return {
          start: startDate.toISOString().split('T')[0], 
          end: endDate.toISOString().split('T')[0] 
        };
      })();
      
      
      debugLogger.info('useMetaTabData', 'Fetching Meta ads data', { 
        clientId, 
        finalDateRange,
        clientAccounts: {
          facebookAds: clientData.accounts?.facebookAds,
          facebookAdsType: typeof clientData.accounts?.facebookAds,
          facebookAdsIsNone: clientData.accounts?.facebookAds === 'none'
        }
      });
      
      // Only fetch Facebook/Meta specific data
      const clientAccounts = {
        facebookAds: clientData.accounts?.facebookAds,
        googleAds: undefined, // Don't fetch Google data for Meta tab
        goHighLevel: undefined,
        googleSheets: undefined
      };
      
      
      debugLogger.info('useMetaTabData', 'Calling EventMetricsService with:', {
        clientAccounts,
        willCallFacebook: clientAccounts.facebookAds && clientAccounts.facebookAds !== 'none'
      });
      
      const result = await EventMetricsService.getComprehensiveMetrics(
        clientId,
        finalDateRange,
        clientAccounts,
        undefined, // clientConversionActions
        true // includePreviousPeriod
      );
      
      return { ...result, clientData };
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    timeout: 30000, // 30 second timeout to prevent infinite loading
  });
};

// Hook for Google Ads tab data
export const useGoogleTabData = (clientId: string | undefined, dateRange?: DateRange) => {
  return useQuery({
    queryKey: ['google-tab-data', clientId, dateRange],
    queryFn: async () => {
      if (!clientId) throw new Error('Client ID is required');
      
      const clientData = await DatabaseService.getClientById(clientId);
      if (!clientData) throw new Error('Client not found');
      
      const finalDateRange = dateRange || (() => {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 30);
        return {
          start: startDate.toISOString().split('T')[0], 
          end: endDate.toISOString().split('T')[0] 
        };
      })();
      
      debugLogger.info('useGoogleTabData', 'Fetching Google ads data', { clientId, finalDateRange });
      
      // Only fetch Google specific data
      const clientAccounts = {
        facebookAds: undefined, // Don't fetch Facebook data for Google tab
        googleAds: clientData.accounts?.googleAds,
        goHighLevel: undefined,
        googleSheets: undefined
      };
      
      const result = await EventMetricsService.getComprehensiveMetrics(
        clientId,
        finalDateRange,
        clientAccounts
      );
      
      return { ...result, clientData };
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    timeout: 30000, // 30 second timeout to prevent infinite loading
  });
};

// Hook for Leads tab data (GoHighLevel + Google Sheets)
export const useLeadsTabData = (clientId: string | undefined, dateRange?: DateRange) => {
  return useQuery({
    queryKey: ['leads-tab-data', clientId, dateRange],
    queryFn: async () => {
      if (!clientId) throw new Error('Client ID is required');
      
      const clientData = await DatabaseService.getClientById(clientId);
      if (!clientData) throw new Error('Client not found');
      
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
      
      // Only fetch GoHighLevel and Google Sheets data
      const clientAccounts = {
        facebookAds: undefined, // Don't fetch Facebook data for Leads tab
        googleAds: undefined, // Don't fetch Google Ads data for Leads tab
        goHighLevel: clientData.accounts?.goHighLevel,
        googleSheets: clientData.accounts?.googleSheets,
        googleSheetsConfig: clientData.accounts?.googleSheetsConfig
      };
      
      const result = await EventMetricsService.getComprehensiveMetrics(
        clientId,
        finalDateRange,
        clientAccounts
      );
      
      // Also fetch lead data from Google Sheets
      let leadData = null;
      try {
        if (clientData.accounts?.googleSheetsConfig) {
          leadData = await LeadDataService.fetchLeadData(
            clientData.accounts.googleSheetsConfig.spreadsheetId,
            clientData.accounts.googleSheetsConfig.sheetName
          );
        } else {
          leadData = await LeadDataService.fetchLeadData();
        }
      } catch (error) {
        debugLogger.warn('useLeadsTabData', 'Failed to fetch lead data', error);
      }
      
      return { ...result, clientData, leadData };
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    timeout: 30000, // 30 second timeout to prevent infinite loading
  });
};

// Hook for GoHighLevel specific data (used in leads tab)
export const useGHLTabData = (locationId: string | undefined, dateRange?: DateRange) => {
  return useQuery({
    queryKey: ['ghl-tab-data', locationId, dateRange],
    queryFn: async () => {
      if (!locationId) throw new Error('Location ID is required');
      
      debugLogger.info('useGHLTabData', 'Fetching GHL data', { locationId, dateRange });
      
      const apiDateRange = dateRange ? {
        startDate: dateRange.start,
        endDate: dateRange.end
      } : undefined;
      
      const metrics = await GoHighLevelAnalyticsService.getGHLMetrics(locationId, apiDateRange);
      
      return metrics;
    },
    enabled: !!locationId,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    timeout: 30000, // 30 second timeout to prevent infinite loading
  });
};
