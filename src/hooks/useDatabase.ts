import { queryKeys } from '@/lib/queryClient';
import type { Client } from '@/services/data/databaseService';
import { DatabaseService } from '@/services/data/databaseService';
import { IntegrationService } from '@/services/integration/IntegrationServiceV2';
import { IntegrationPlatform } from '@/types/integration';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Client hooks
export const useClients = () => {
  return useQuery({
    queryKey: queryKeys.clients.lists(),
    queryFn: () => DatabaseService.getAllClients(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useClient = (id: string) => {
  return useQuery({
    queryKey: queryKeys.clients.detail(id),
    queryFn: () => DatabaseService.getClientById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateClient = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: DatabaseService.createClient,
    onSuccess: (newClient) => {
      // Invalidate and refetch clients list
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.lists() });
      
      // Add the new client to the cache
      queryClient.setQueryData(queryKeys.clients.detail(newClient.id), newClient);
      
      // Dispatch custom event for other components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('clientAdded', { detail: newClient }));
      }
    },
  });
};

export const useUpdateClient = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Client> }) =>
      DatabaseService.updateClient(id, updates),
    onSuccess: (updatedClient) => {
      // Update the specific client in cache
      queryClient.setQueryData(queryKeys.clients.detail(updatedClient.id), updatedClient);
      
      // Invalidate clients list to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.lists() });
    },
  });
};

export const useDeleteClient = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: DatabaseService.deleteClient,
    onSuccess: (_, deletedId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: queryKeys.clients.detail(deletedId) });
      
      // Invalidate clients list
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.lists() });
    },
  });
};

// Integration hooks
export const useIntegrations = () => {
  return useQuery({
    queryKey: queryKeys.integrations.all,
    queryFn: () => IntegrationService.getAllIntegrations(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useIntegration = (platform: string) => {
  return useQuery({
    queryKey: queryKeys.integrations.platform(platform),
    queryFn: () => IntegrationService.getIntegration(platform as IntegrationPlatform),
    enabled: !!platform,
    staleTime: 10 * 60 * 1000,
  });
};

export const useSaveIntegration = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ platform, config }: { platform: string; config: any }) =>
      IntegrationService.saveIntegration(platform as IntegrationPlatform, config),
    onSuccess: (updatedIntegration) => {
      // Update the specific integration in cache
      queryClient.setQueryData(
        queryKeys.integrations.platform(updatedIntegration.platform),
        updatedIntegration
      );
      
      // Invalidate integrations list
      queryClient.invalidateQueries({ queryKey: queryKeys.integrations.all });
    },
  });
};

export const useIntegrationDisplay = () => {
  return useQuery({
    queryKey: queryKeys.integrations.display(),
    queryFn: () => IntegrationService.getIntegrationDisplay(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useIntegrationTokens = (platform: string) => {
  return useQuery({
    queryKey: queryKeys.integrations.tokens(platform),
    queryFn: () => IntegrationService.getTokens(platform as IntegrationPlatform),
    enabled: !!platform,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useRefreshTokens = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ platform, tokens }: { platform: string; tokens: any }) =>
      IntegrationService.refreshTokens(platform as IntegrationPlatform, tokens),
    onSuccess: (updatedIntegration, { platform }) => {
      // Update the specific integration in cache
      queryClient.setQueryData(
        queryKeys.integrations.platform(platform),
        updatedIntegration
      );
      
      // Invalidate tokens cache
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.integrations.tokens(platform) 
      });
      
      // Invalidate integrations list
      queryClient.invalidateQueries({ queryKey: queryKeys.integrations.all });
    },
  });
};

export const useDisconnectIntegration = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (platform: string) =>
      IntegrationService.disconnect(platform as IntegrationPlatform),
    onSuccess: (_, platform) => {
      // Remove from cache
      queryClient.removeQueries({ 
        queryKey: queryKeys.integrations.platform(platform) 
      });
      queryClient.removeQueries({ 
        queryKey: queryKeys.integrations.tokens(platform) 
      });
      
      // Invalidate integrations list
      queryClient.invalidateQueries({ queryKey: queryKeys.integrations.all });
    },
  });
};

export const useTestApiConnection = () => {
  return useQuery({
    queryKey: ['api-connection-test'],
    queryFn: () => IntegrationService.testConnection(),
    staleTime: 30 * 1000, // 30 seconds
    retry: 1,
  });
};

// Metrics hooks
export const useMetrics = (
  clientId: string,
  platform?: string,
  dateRange?: { start: string; end: string }
) => {
  return useQuery({
    queryKey: platform && dateRange 
      ? queryKeys.metrics.clientDateRange(clientId, platform, dateRange)
      : queryKeys.metrics.client(clientId),
    queryFn: () => DatabaseService.getMetrics(clientId, platform, dateRange),
    enabled: !!clientId,
    staleTime: 2 * 60 * 1000, // 2 minutes for metrics
  });
};

export const useSaveMetrics = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ clientId, platform, date, metrics }: {
      clientId: string;
      platform: string;
      date: string;
      metrics: Record<string, any>;
    }) => DatabaseService.saveMetrics(clientId, platform, date, metrics),
    onSuccess: (savedMetrics) => {
      // Invalidate related metrics queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.metrics.client(savedMetrics.client_id)
      });
    },
  });
};

// Health check hook
export const useHealthCheck = () => {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => DatabaseService.healthCheck(),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
};
