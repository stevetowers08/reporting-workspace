import { debugLogger } from '@/lib/debug';
import { AgencyService, Client } from '@/services/agency/agencyService';
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
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});

  const loadClients = useCallback(async () => {
    try {
      setLoading(true);
      const clientsData = await AgencyService.loadClients();
      setClients(clientsData);
    } catch (error) {
      debugLogger.error('useAgencyClients', 'Failed to load clients', error);
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const createClient = useCallback(async (clientData: Parameters<typeof AgencyService.createClient>[0]) => {
    try {
      await AgencyService.createClient(clientData);
      await loadClients(); // Refresh the list
    } catch (error) {
      debugLogger.error('useAgencyClients', 'Failed to create client', error);
      throw error;
    }
  }, [loadClients]);

  const updateClient = useCallback(async (clientId: string, updates: Partial<Client>) => {
    try {
      await AgencyService.updateClient(clientId, updates);
      await loadClients(); // Refresh the list
    } catch (error) {
      debugLogger.error('useAgencyClients', 'Failed to update client', error);
      throw error;
    }
  }, [loadClients]);

  const deleteClient = useCallback(async (clientId: string) => {
    try {
      await AgencyService.deleteClient(clientId);
      await loadClients(); // Refresh the list
    } catch (error) {
      debugLogger.error('useAgencyClients', 'Failed to delete client', error);
      throw error;
    }
  }, [loadClients]);

  const setDeletingState = useCallback((clientId: string, isDeleting: boolean) => {
    setDeleting(prev => ({ ...prev, [clientId]: isDeleting }));
  }, []);

  return {
    clients,
    loading,
    deleting,
    loadClients,
    createClient,
    updateClient,
    deleteClient,
    setDeleting: setDeletingState
  };
};
