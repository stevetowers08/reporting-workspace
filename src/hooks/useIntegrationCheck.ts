import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export const useIntegrationCheck = (platform: 'facebookAds' | 'googleAds') => {
  return useQuery({
    queryKey: ['integration-check', platform],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integrations')
        .select('platform, connected')
        .eq('platform', platform)
        .eq('connected', true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return !!data?.connected;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 1,
  });
};

