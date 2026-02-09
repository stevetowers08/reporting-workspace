/**
 * useGroups - React Query hook for managing groups
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import {
  getAllGroups,
  createGroup,
  updateGroup,
  deleteGroup,
} from '@/services/data/groupService';
import { CreateGroupRequest, UpdateGroupRequest, Group } from '@/types/groups';
import { debugLogger } from '@/lib/debug';

const QUERY_KEY = 'groups';

interface UseGroupsOptions {
  status?: 'active' | 'paused' | 'archived';
  enabled?: boolean;
}

export function useGroups(options: UseGroupsOptions = {}) {
  const queryClient = useQueryClient();
  const { status, enabled = true } = options;

  // Query for fetching all groups
  const {
    data: groups = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, { status }],
    queryFn: () => getAllGroups(status),
    enabled,
  });

  // Mutation for creating a group
  const createMutation = useMutation({
    mutationFn: (data: CreateGroupRequest) => createGroup(data),
    onSuccess: (newGroup) => {
      debugLogger.info('useGroups', 'Group created successfully', { id: newGroup.id });
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
    onError: (error: Error) => {
      debugLogger.error('useGroups', 'Failed to create group', error);
    },
  });

  // Mutation for updating a group
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateGroupRequest }) =>
      updateGroup(id, updates),
    onSuccess: (_, variables) => {
      debugLogger.info('useGroups', 'Group updated successfully', { id: variables.id });
      // Invalidate specific queries
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, variables.id] });
    },
    onError: (error: Error, variables) => {
      debugLogger.error('useGroups', 'Failed to update group', { id: variables.id, error });
    },
  });

  // Mutation for deleting a group
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteGroup(id),
    onSuccess: (_, id) => {
      debugLogger.info('useGroups', 'Group deleted successfully', { id });
      // Remove from cache and invalidate
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
    onError: (error: Error, id) => {
      debugLogger.error('useGroups', 'Failed to delete group', { id, error });
    },
  });

  // Wrapper functions with proper typing
  const handleCreateGroup = useCallback(
    async (data: CreateGroupRequest): Promise<Group> => {
      return createMutation.mutateAsync(data);
    },
    [createMutation]
  );

  const handleUpdateGroup = useCallback(
    async (id: string, updates: UpdateGroupRequest): Promise<Group> => {
      return updateMutation.mutateAsync({ id, updates });
    },
    [updateMutation]
  );

  const handleDeleteGroup = useCallback(
    async (id: string): Promise<void> => {
      return deleteMutation.mutateAsync(id);
    },
    [deleteMutation]
  );

  const refreshGroups = useCallback(() => {
    refetch();
  }, [refetch]);

  return {
    groups,
    isLoading,
    error: error as Error | null,
    createGroup: handleCreateGroup,
    updateGroup: handleUpdateGroup,
    deleteGroup: handleDeleteGroup,
    refreshGroups,
    // Expose mutation states for UI feedback
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
