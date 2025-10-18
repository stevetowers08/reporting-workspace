import { debugLogger } from '@/lib/debug';
import { AgencyService } from '@/services/agency/agencyService';
import { Client } from '@/types/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

export interface UseAgencyClientsReturn {
  clients: Client[];
  loading: boolean;
  deleting: Record<string, boolean>;
  loadClients: () => Promise<void>;
  createClient: (clientData: Parameters<typeof AgencyService.createClient>[0]) => Promise<void>;
  updateClient: (clientId: string, updates: Partial<Client>) => Promise<void>;
  deleteClient: (clientId: string) => Promise<void>;
  setDeleting: (clientId: string, isDeleting: boolean) => void;
}

export const useAgencyClients = (): UseAgencyClientsReturn => {
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});
  const queryClient = useQueryClient();

  // Use React Query for clients data
  const {
    data: clients = [],
    isLoading: loading,
    refetch: loadClients
  } = useQuery({
    queryKey: ['available-clients'],
    queryFn: async () => {
      debugLogger.info('useAgencyClients', 'Fetching clients via React Query');
      return await AgencyService.loadClients();
    },
    staleTime: 30 * 1000, // 30 seconds - shorter for more frequent updates
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  const createClient = useCallback(async (clientData: Parameters<typeof AgencyService.createClient>[0]) => {
    try {
      await AgencyService.createClient(clientData);
      // Invalidate and refetch clients
      await queryClient.invalidateQueries({ queryKey: ['available-clients'] });
    } catch (error) {
      debugLogger.error('useAgencyClients', 'Failed to create client', error);
      throw error;
    }
  }, [queryClient]);

  const updateClient = useCallback(async (clientId: string, updates: Partial<Client>) => {
    try {
      await AgencyService.updateClient(clientId, updates);
      // Invalidate and refetch clients
      await queryClient.invalidateQueries({ queryKey: ['available-clients'] });
      debugLogger.info('useAgencyClients', 'Client updated and cache invalidated', { clientId, updates });
    } catch (error) {
      debugLogger.error('useAgencyClients', 'Failed to update client', error);
      throw error;
    }
  }, [queryClient]);

  const deleteClient = useCallback(async (clientId: string) => {
    try {
      await AgencyService.deleteClient(clientId);
      // Invalidate and refetch clients
      await queryClient.invalidateQueries({ queryKey: ['available-clients'] });
    } catch (error) {
      debugLogger.error('useAgencyClients', 'Failed to delete client', error);
      throw error;
    }
  }, [queryClient]);

  const setDeletingState = useCallback((clientId: string, isDeleting: boolean) => {
    setDeleting(prev => ({ ...prev, [clientId]: isDeleting }));
  }, []);

  return {
    clients,
    loading,
    deleting,
    loadClients: async () => {
      await queryClient.invalidateQueries({ queryKey: ['agency-clients'] });
    },
    createClient,
    updateClient,
    deleteClient,
    setDeleting: setDeletingState
  };
};
