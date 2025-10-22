import { debugLogger } from '@/lib/debug';
import { supabase } from '@/lib/supabase';
import { DatabaseService } from '@/services/data/databaseService';
import { GoHighLevelService } from '@/services/ghl/goHighLevelService';
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
        // Decode token to determine if it's agency-level
        try {
          const tokenPayload = JSON.parse(atob(connection.config.accessToken.split('.')[1]));
          const isAgencyToken = tokenPayload.authClass === 'Company';
          
          if (isAgencyToken) {
            // Agency-level token - don't set locationId yet, will be set per client
            GoHighLevelService.setCredentials(connection.config.accessToken);
            debugLogger.info('useGHLIntegration', 'Set agency-level credentials');
          } else {
            // Location-level token - use account_id as locationId
            GoHighLevelService.setCredentials(
              connection.config.accessToken,
              connection.account_id
            );
            debugLogger.info('useGHLIntegration', 'Set location-level credentials', { 
              locationId: connection.account_id 
            });
          }
        } catch (tokenError) {
          debugLogger.error('useGHLIntegration', 'Failed to decode token', tokenError);
          // Fallback to location-level behavior
          GoHighLevelService.setCredentials(
            connection.config.accessToken,
            connection.account_id
          );
        }
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

      if (error) {throw error;}

      // Disconnect service
      // GoHighLevelService.disconnect(); // Method doesn't exist - commented out
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
      if (!connection?.connected) {return null;}
      return await GoHighLevelService.getAccountInfo();
    },
    enabled: !!connection?.connected,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Get contacts
  const { data: contacts, isLoading: contactsLoading } = useQuery({
    queryKey: ['ghl-contacts'],
    queryFn: async () => {
      if (!connection?.connected) {return [];}
      return await GoHighLevelService.getContacts();
    },
    enabled: !!connection?.connected,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get campaigns
  const { data: campaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ['ghl-campaigns'],
    queryFn: async () => {
      if (!connection?.connected) {return [];}
      return await GoHighLevelService.getCampaigns();
    },
    enabled: !!connection?.connected,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Connect to GHL
  const connect = async () => {
    try {
      debugLogger.info('useGHLIntegration', 'Starting connection process');
      setIsConnecting(true);
      debugLogger.info('useGHLIntegration', 'Initiating GHL connection');
      
      // Get OAuth credentials from environment
      const clientId = import.meta.env.VITE_GHL_CLIENT_ID;
      const redirectUri = import.meta.env.VITE_GHL_REDIRECT_URI || 
          (window.location.hostname === 'localhost' 
              ? `${window.location.origin}/oauth/callback`
              : 'https://reporting.tulenagency.com/oauth/callback');
      
      debugLogger.info('useGHLIntegration', 'OAuth configuration', {
        clientId: clientId ? clientId.substring(0, 10) + '...' : 'MISSING',
        redirectUri,
        hostname: window.location.hostname,
        origin: window.location.origin,
        envRedirectUri: import.meta.env.VITE_GHL_REDIRECT_URI
      });
      
      if (!clientId) {
        throw new Error('Missing OAuth credentials. Please set VITE_GHL_CLIENT_ID in environment variables.');
      }
      
      const authUrl = GoHighLevelService.getAuthorizationUrl(clientId, redirectUri);
      debugLogger.info('useGHLIntegration', 'Generated auth URL', { authUrl });
      
      // Open OAuth flow in new window/tab
      const authWindow = window.open(authUrl, 'ghl-oauth', 'width=600,height=700,scrollbars=yes,resizable=yes');
      debugLogger.info('useGHLIntegration', 'Opened window', { hasWindow: !!authWindow });
      
      if (!authWindow) {
        throw new Error('Failed to open OAuth window. Please allow popups for this site.');
      }
      
      // Listen for messages from the popup window
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'GHL_CONNECTED') {
          setIsConnecting(false);
          if (event.data.success) {
            debugLogger.info('useGHLIntegration', 'GHL connection successful');
            // Refresh connection status
            queryClient.invalidateQueries({ queryKey: ['ghl-connection'] });
          } else {
            debugLogger.error('useGHLIntegration', 'GHL connection failed', event.data.error);
          }
          window.removeEventListener('message', handleMessage);
        }
      };

      window.addEventListener('message', handleMessage);

      // Fallback: Monitor the window for completion
      const checkClosed = setInterval(() => {
        if (authWindow.closed) {
          clearInterval(checkClosed);
          setIsConnecting(false);
          window.removeEventListener('message', handleMessage);
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
