/**
 * useClientGroups - Hook to get groups that a client belongs to
 */

import { useQuery } from '@tanstack/react-query';
import { getGroupsForClient } from '@/services/data/groupService';
import { debugLogger } from '@/lib/debug';

const QUERY_KEY = 'client-groups';

export function useClientGroups(clientId: string | undefined) {
  const {
    data: groups = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, clientId],
    queryFn: () => {
      if (!clientId) return Promise.resolve([]);
      return getGroupsForClient(clientId);
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    groups,
    isLoading,
    error: error as Error | null,
    refreshGroups: refetch,
  };
}

export default useClientGroups;
