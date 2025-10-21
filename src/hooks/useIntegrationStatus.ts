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

// Simple cache for integration status to prevent repeated calls
let integrationStatusCache: IntegrationStatus | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 3 * 60 * 1000; // 3 minutes

// Helper function to get cached integration status
async function getCachedIntegrationStatus(): Promise<IntegrationStatus> {
  const now = Date.now();
  
  // Return cached data if it's still valid
  if (integrationStatusCache && (now - cacheTimestamp) < CACHE_DURATION) {
    debugLogger.debug('useIntegrationStatus', 'Using cached integration status');
    return integrationStatusCache;
  }
  
  // Fetch fresh data and update cache
  debugLogger.debug('useIntegrationStatus', 'Fetching fresh integration status');
  const { data: integrations, error } = await supabase
    .from('integrations')
    .select('platform')
    .eq('connected', true);

  if (error) {
    debugLogger.error('useIntegrationStatus', 'Failed to fetch integration status', error);
    throw error;
  }

  const status: IntegrationStatus = {
    facebookAds: integrations.some(i => i.platform === 'facebookAds'),
    googleAds: integrations.some(i => i.platform === 'googleAds'),
    googleSheets: integrations.some(i => i.platform === 'googleSheets'),
    goHighLevel: integrations.some(i => i.platform === 'goHighLevel'),
    googleAi: integrations.some(i => i.platform === 'googleAi'),
  };

  integrationStatusCache = status;
  cacheTimestamp = now;
  
  return status;
}

/**
 * Shared hook for fetching integration connection status
 * Uses caching to prevent repeated API calls
 */
export const useIntegrationStatus = () => {
  return useQuery({
    queryKey: ['integration-status'],
    queryFn: getCachedIntegrationStatus,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1, // Only retry once on failure
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Don't refetch on component mount if data exists
  });
};

// Function to invalidate integration status cache
export function invalidateIntegrationStatusCache() {
  integrationStatusCache = null;
  cacheTimestamp = 0;
}
