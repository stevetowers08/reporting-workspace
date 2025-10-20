import { debugLogger } from '@/lib/debug';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

interface IntegrationStatus {
  facebookAds: boolean;
  googleAds: boolean;
  googleSheets: boolean;
  goHighLevel: boolean;
  googleAi: boolean;
}

/**
 * Shared hook for fetching integration connection status
 * Replaces multiple duplicate calls across components
 */
export const useIntegrationStatus = () => {
  return useQuery({
    queryKey: ['integration-status'],
    queryFn: async (): Promise<IntegrationStatus> => {
      try {
        const { data: integrations, error } = await supabase
          .from('integrations')
          .select('platform')
          .eq('connected', true);

        if (error) {
          debugLogger.error('useIntegrationStatus', 'Failed to fetch integration status', error);
          throw error;
        }

        // Initialize all platforms as false
        const statusMap: IntegrationStatus = {
          facebookAds: false,
          googleAds: false,
          googleSheets: false,
          goHighLevel: false,
          googleAi: false,
        };

        // Set to true if found in database
        integrations?.forEach(integration => {
          switch (integration.platform) {
            case 'facebookAds':
              statusMap.facebookAds = true;
              break;
            case 'googleAds':
              statusMap.googleAds = true;
              break;
            case 'googleSheets':
              statusMap.googleSheets = true;
              break;
            case 'goHighLevel':
              statusMap.goHighLevel = true;
              break;
            case 'google-ai':
              statusMap.googleAi = true;
              break;
          }
        });

        debugLogger.debug('useIntegrationStatus', 'Integration status fetched', statusMap);
        return statusMap;
      } catch (error) {
        debugLogger.error('useIntegrationStatus', 'Error fetching integration status', error);
        // Return default status on error
        return {
          facebookAds: false,
          googleAds: false,
          googleSheets: false,
          goHighLevel: false,
          googleAi: false,
        };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });
};
