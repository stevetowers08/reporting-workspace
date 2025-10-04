import { debugLogger } from '@/lib/debug';
import { GoHighLevelService } from '@/services/api/goHighLevelService';
import { DatabaseService } from '@/services/data/databaseService';
import { supabase } from '@/lib/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

export interface GHLConnection {
  id: string;
  platform: string;
  connected: boolean;
  account_id: string;
  account_name?: string;
  config: {
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
    connectedAt: string;
  };
  last_sync: string;
}

export const useGHLIntegration = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const queryClient = useQueryClient();

  // Query for GHL connection status
  const { data: connection, isLoading, error } = useQuery({
    queryKey: ['ghl-connection'],
    queryFn: async () => {
      const connection = await DatabaseService.getGHLConnection();
      if (connection?.connected && connection.config?.accessToken) {
        // Set credentials for API calls
        GoHighLevelService.setCredentials(
          connection.config.accessToken,
          connection.account_id
        );
      }
      return connection;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutation to disconnect GHL
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      // Update database
      const { error } = await supabase
        .from('integrations')
        .update({
          connected: false,
          config: {},
          last_sync: new Date().toISOString()
        })
        .eq('platform', 'goHighLevel');

      if (error) throw error;

      // Disconnect service
      GoHighLevelService.disconnect();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ghl-connection'] });
      debugLogger.info('useGHLIntegration', 'Successfully disconnected from GHL');
    },
    onError: (error) => {
      debugLogger.error('useGHLIntegration', 'Failed to disconnect from GHL', error);
    }
  });

  // Get account info
  const { data: accountInfo, isLoading: accountLoading } = useQuery({
    queryKey: ['ghl-account-info'],
    queryFn: async () => {
      if (!connection?.connected) return null;
      return await GoHighLevelService.getAccountInfo();
    },
    enabled: !!connection?.connected,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Get contacts
  const { data: contacts, isLoading: contactsLoading } = useQuery({
    queryKey: ['ghl-contacts'],
    queryFn: async () => {
      if (!connection?.connected) return [];
      return await GoHighLevelService.getContacts();
    },
    enabled: !!connection?.connected,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get campaigns
  const { data: campaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ['ghl-campaigns'],
    queryFn: async () => {
      if (!connection?.connected) return [];
      return await GoHighLevelService.getCampaigns();
    },
    enabled: !!connection?.connected,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Connect to GHL
  const connect = async () => {
    try {
      setIsConnecting(true);
      debugLogger.info('useGHLIntegration', 'Initiating GHL connection');
      
      const authUrl = await GoHighLevelService.getAuthorizationUrl();
      
      // Open OAuth flow in new window/tab
      const authWindow = window.open(authUrl, 'ghl-oauth', 'width=600,height=700,scrollbars=yes,resizable=yes');
      
      if (!authWindow) {
        throw new Error('Failed to open OAuth window. Please allow popups for this site.');
      }
      
      // Monitor the window for completion
      const checkClosed = setInterval(() => {
        if (authWindow.closed) {
          clearInterval(checkClosed);
          setIsConnecting(false);
          // Refresh connection status after OAuth completes
          queryClient.invalidateQueries({ queryKey: ['ghl-connection'] });
        }
      }, 1000);
      
    } catch (error) {
      debugLogger.error('useGHLIntegration', 'Failed to initiate connection', error);
      setIsConnecting(false);
      throw error;
    }
  };

  // Disconnect from GHL
  const disconnect = () => {
    disconnectMutation.mutate();
  };

  // Refresh data
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['ghl-connection'] });
    queryClient.invalidateQueries({ queryKey: ['ghl-account-info'] });
    queryClient.invalidateQueries({ queryKey: ['ghl-contacts'] });
    queryClient.invalidateQueries({ queryKey: ['ghl-campaigns'] });
  };

  return {
    // Connection state
    connection,
    isConnected: connection?.connected || false,
    isLoading,
    error,
    
    // Account info
    accountInfo,
    accountName: accountInfo?.name,
    accountLoading,
    
    // Data
    contacts,
    contactsLoading,
    campaigns,
    campaignsLoading,
    
    // Actions
    connect,
    disconnect,
    refresh,
    isConnecting,
    isDisconnecting: disconnectMutation.isPending,
  };
};
