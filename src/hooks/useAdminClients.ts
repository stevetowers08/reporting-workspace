import { debugLogger } from '@/lib/debug';
import { AdminService, Client } from '@/services/admin/adminService';
import { useCallback, useState } from 'react';

export interface UseAdminClientsReturn {
  clients: Client[];
  loading: boolean;
  deleting: Record<string, boolean>;
  loadClients: () => Promise<void>;
  createClient: (clientData: Parameters<typeof AdminService.createClient>[0]) => Promise<void>;
  updateClient: (clientId: string, updates: Partial<Client>) => Promise<void>;
  deleteClient: (clientId: string) => Promise<void>;
  setDeleting: (clientId: string, isDeleting: boolean) => void;
}

export const useAdminClients = (): UseAdminClientsReturn => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});

  const loadClients = useCallback(async () => {
    try {
      setLoading(true);
      const clientsData = await AdminService.loadClients();
      setClients(clientsData);
    } catch (error) {
      debugLogger.error('useAdminClients', 'Failed to load clients', error);
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const createClient = useCallback(async (clientData: Parameters<typeof AdminService.createClient>[0]) => {
    try {
      await AdminService.createClient(clientData);
      await loadClients(); // Refresh the list
    } catch (error) {
      debugLogger.error('useAdminClients', 'Failed to create client', error);
      throw error;
    }
  }, [loadClients]);

  const updateClient = useCallback(async (clientId: string, updates: Partial<Client>) => {
    try {
      await AdminService.updateClient(clientId, updates);
      await loadClients(); // Refresh the list
    } catch (error) {
      debugLogger.error('useAdminClients', 'Failed to update client', error);
      throw error;
    }
  }, [loadClients]);

  const deleteClient = useCallback(async (clientId: string) => {
    try {
      await AdminService.deleteClient(clientId);
      await loadClients(); // Refresh the list
    } catch (error) {
      debugLogger.error('useAdminClients', 'Failed to delete client', error);
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
