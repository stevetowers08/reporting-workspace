/**
 * useGroup - React Query hook for managing a single group and its clients
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import {
  getGroupWithClients,
  updateGroup,
  addClientToGroup,
  addClientsToGroup,
  removeClientFromGroup,
  reorderGroupClients,
  createShareLink,
  revokeShareToken,
  cloneGroup,
} from '@/services/data/groupService';
import { UpdateGroupRequest, ShareOptions, CreateShareLinkResponse, GroupWithClients } from '@/types/groups';
import { debugLogger } from '@/lib/debug';

const QUERY_KEY = 'group';

interface UseGroupResult {
  group: GroupWithClients | null;
  isLoading: boolean;
  error: Error | null;
  addClient: (clientId: string) => Promise<void>;
  addClients: (clientIds: string[]) => Promise<void>;
  removeClient: (clientId: string) => Promise<void>;
  reorderClients: (orders: { clientId: string; order: number }[]) => Promise<void>;
  generateShareLink: (options?: ShareOptions) => Promise<CreateShareLinkResponse>;
  revokeShareLink: () => Promise<void>;
  clone: (newName: string) => Promise<GroupWithClients>;
  update: (updates: UpdateGroupRequest) => Promise<GroupWithClients>;
  refreshGroup: () => void;
  isAddingClient: boolean;
  isRemovingClient: boolean;
  isGeneratingShareLink: boolean;
}

export function useGroup(groupId: string | undefined): UseGroupResult {
  const queryClient = useQueryClient();

  // Query for fetching the group with clients
  const {
    data: group,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, groupId],
    queryFn: () => (groupId ? getGroupWithClients(groupId) : Promise.resolve(null)),
    enabled: !!groupId,
  });

  // Mutation for updating group details
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateGroupRequest }) =>
      updateGroup(id, updates),
    onSuccess: () => {
      debugLogger.info('useGroup', 'Group updated successfully', { groupId });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: (error: Error) => {
      debugLogger.error('useGroup', 'Failed to update group', { groupId, error });
    },
  });

  // Mutation for adding a single client
  const addClientMutation = useMutation({
    mutationFn: ({ groupId, clientId }: { groupId: string; clientId: string }) =>
      addClientToGroup(groupId, clientId),
    onSuccess: () => {
      debugLogger.info('useGroup', 'Client added to group', { groupId });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, groupId] });
    },
    onError: (error: Error) => {
      debugLogger.error('useGroup', 'Failed to add client to group', { groupId, error });
    },
  });

  // Mutation for adding multiple clients
  const addClientsMutation = useMutation({
    mutationFn: ({ groupId, clientIds }: { groupId: string; clientIds: string[] }) =>
      addClientsToGroup(groupId, clientIds),
    onSuccess: () => {
      debugLogger.info('useGroup', 'Multiple clients added to group', { groupId });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, groupId] });
    },
    onError: (error: Error) => {
      debugLogger.error('useGroup', 'Failed to add clients to group', { groupId, error });
    },
  });

  // Mutation for removing a client
  const removeClientMutation = useMutation({
    mutationFn: ({ groupId, clientId }: { groupId: string; clientId: string }) =>
      removeClientFromGroup(groupId, clientId),
    onSuccess: () => {
      debugLogger.info('useGroup', 'Client removed from group', { groupId });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, groupId] });
    },
    onError: (error: Error) => {
      debugLogger.error('useGroup', 'Failed to remove client from group', { groupId, error });
    },
  });

  // Mutation for reordering clients
  const reorderMutation = useMutation({
    mutationFn: ({
      groupId,
      clientOrders,
    }: {
      groupId: string;
      clientOrders: { clientId: string; order: number }[];
    }) => reorderGroupClients(groupId, clientOrders),
    onSuccess: () => {
      debugLogger.info('useGroup', 'Clients reordered', { groupId });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, groupId] });
    },
    onError: (error: Error) => {
      debugLogger.error('useGroup', 'Failed to reorder clients', { groupId, error });
    },
  });

  // Mutation for creating share link
  const shareMutation = useMutation({
    mutationFn: ({
      groupId,
      options,
    }: {
      groupId: string;
      options?: ShareOptions;
    }) => createShareLink('group', groupId, options),
    onSuccess: (result) => {
      debugLogger.info('useGroup', 'Share link created', { groupId, token: result.token.substring(0, 8) });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, groupId] });
    },
    onError: (error: Error) => {
      debugLogger.error('useGroup', 'Failed to create share link', { groupId, error });
    },
  });

  // Mutation for revoking share link
  const revokeShareMutation = useMutation({
    mutationFn: async (groupId: string) => {
      if (!group?.shareable_link) {
        throw new Error('No share link to revoke');
      }
      await revokeShareToken(group.shareable_link);
    },
    onSuccess: () => {
      debugLogger.info('useGroup', 'Share link revoked', { groupId });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, groupId] });
    },
    onError: (error: Error) => {
      debugLogger.error('useGroup', 'Failed to revoke share link', { groupId, error });
    },
  });

  // Mutation for cloning group
  const cloneMutation = useMutation({
    mutationFn: ({ groupId, newName }: { groupId: string; newName: string }) =>
      cloneGroup(groupId, newName),
    onSuccess: (newGroup) => {
      debugLogger.info('useGroup', 'Group cloned', { originalId: groupId, newId: newGroup.id });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: (error: Error) => {
      debugLogger.error('useGroup', 'Failed to clone group', { groupId, error });
    },
  });

  // Wrapper functions
  const handleAddClient = useCallback(
    async (clientId: string): Promise<void> => {
      if (!groupId) throw new Error('Group ID is required');
      await addClientMutation.mutateAsync({ groupId, clientId });
    },
    [addClientMutation, groupId]
  );

  const handleAddClients = useCallback(
    async (clientIds: string[]): Promise<void> => {
      if (!groupId) throw new Error('Group ID is required');
      await addClientsMutation.mutateAsync({ groupId, clientIds });
    },
    [addClientsMutation, groupId]
  );

  const handleRemoveClient = useCallback(
    async (clientId: string): Promise<void> => {
      if (!groupId) throw new Error('Group ID is required');
      await removeClientMutation.mutateAsync({ groupId, clientId });
    },
    [removeClientMutation, groupId]
  );

  const handleReorderClients = useCallback(
    async (orders: { clientId: string; order: number }[]): Promise<void> => {
      if (!groupId) throw new Error('Group ID is required');
      await reorderMutation.mutateAsync({ groupId, clientOrders: orders });
    },
    [reorderMutation, groupId]
  );

  const handleGenerateShareLink = useCallback(
    async (options?: ShareOptions): Promise<CreateShareLinkResponse> => {
      if (!groupId) throw new Error('Group ID is required');
      return shareMutation.mutateAsync({ groupId, options });
    },
    [shareMutation, groupId]
  );

  const handleRevokeShareLink = useCallback(async (): Promise<void> => {
    if (!groupId) throw new Error('Group ID is required');
    await revokeShareMutation.mutateAsync(groupId);
  }, [revokeShareMutation, groupId]);

  const handleClone = useCallback(
    async (newName: string): Promise<GroupWithClients> => {
      if (!groupId) throw new Error('Group ID is required');
      const newGroup = await cloneMutation.mutateAsync({ groupId, newName });
      // Fetch the full group with clients
      const fullGroup = await getGroupWithClients(newGroup.id);
      return fullGroup!;
    },
    [cloneMutation, groupId]
  );

  const handleUpdate = useCallback(
    async (updates: UpdateGroupRequest): Promise<GroupWithClients> => {
      if (!groupId) throw new Error('Group ID is required');
      await updateMutation.mutateAsync({ id: groupId, updates });
      // Refetch to get updated data
      const updated = await getGroupWithClients(groupId);
      return updated!;
    },
    [updateMutation, groupId]
  );

  const refreshGroup = useCallback(() => {
    refetch();
  }, [refetch]);

  return {
    group: group || null,
    isLoading,
    error: error as Error | null,
    addClient: handleAddClient,
    addClients: handleAddClients,
    removeClient: handleRemoveClient,
    reorderClients: handleReorderClients,
    generateShareLink: handleGenerateShareLink,
    revokeShareLink: handleRevokeShareLink,
    clone: handleClone,
    update: handleUpdate,
    refreshGroup,
    isAddingClient: addClientMutation.isPending,
    isRemovingClient: removeClientMutation.isPending,
    isGeneratingShareLink: shareMutation.isPending,
  };
}
