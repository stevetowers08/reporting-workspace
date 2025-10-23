import { debugLogger } from '@/lib/debug';
import { supabase } from '@/lib/supabase';
import { SimpleGHLService } from '@/services/ghl/simpleGHLService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

export interface GHLConnection {
  id: string;
  platform: string;
  connected: boolean;
  account_id: string;
  account_name?: string;
  config: {
    tokens: {
      accessToken: string;
      refreshToken?: string;
      tokenType: string;
      scope: string;
    };
    accountInfo: {
      id: string;
      name: string;
    };
    locationId: string;
    lastSync: string;
    syncStatus: string;
    connectedAt: string;
  };
  last_sync?: string;
}

export const useGHLIntegration = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const queryClient = useQueryClient();

  // Query for GHL connection status
  const { data: connection, isLoading, error } = useQuery({
    queryKey: ['ghl-connection'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('platform', 'goHighLevel')
        .single();

      if (error) {
        debugLogger.error('useGHLIntegration', 'Error fetching GHL connection', error);
        return null;
      }

      return data as GHLConnection;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Connect to GHL
  const connect = async () => {
    try {
      debugLogger.info('useGHLIntegration', 'Starting connection process');
      setIsConnecting(true);
      
      // Get OAuth credentials from environment
      const clientId = import.meta.env.VITE_GHL_CLIENT_ID;
      const redirectUri = window.location.hostname === 'localhost' 
        ? `${window.location.origin}/oauth/ghl-callback`
        : 'https://reporting.tulenagency.com/oauth/ghl-callback';
      
      if (!clientId) {
        throw new Error('Missing OAuth credentials. Please set VITE_GHL_CLIENT_ID in environment variables.');
      }
      
      const authUrl = await SimpleGHLService.getAuthorizationUrl(clientId, redirectUri, [
        'contacts.read',
        'contacts.write',
        'opportunities.read', 
        'opportunities.write',
        'calendars.read',
        'calendars.write',
        'funnels/funnel.readonly',
        'funnels/page.readonly',
        'locations.readonly'
      ]);
      
      debugLogger.info('useGHLIntegration', 'Generated auth URL', { authUrl });
      
      // Open OAuth flow in new window/tab
      const authWindow = window.open(authUrl, 'ghl-oauth', 'width=600,height=700,scrollbars=yes,resizable=yes');
      
      if (!authWindow) {
        throw new Error('Failed to open OAuth window. Please allow popups for this site.');
      }
      
      // Listen for messages from the popup window
      const handleMessage = (event: globalThis.MessageEvent) => {
        if (event.origin !== window.location.origin) {return;}
        
        if (event.data.type === 'GHL_OAUTH_SUCCESS') {
          debugLogger.info('useGHLIntegration', 'OAuth success received', event.data);
          queryClient.invalidateQueries({ queryKey: ['ghl-connection'] });
          setIsConnecting(false);
          window.removeEventListener('message', handleMessage);
        } else if (event.data.type === 'GHL_OAUTH_ERROR') {
          debugLogger.error('useGHLIntegration', 'OAuth error received', event.data);
          setIsConnecting(false);
          window.removeEventListener('message', handleMessage);
        }
      };
      
      window.addEventListener('message', handleMessage);
      
      // Clean up listener after 5 minutes
      setTimeout(() => {
        window.removeEventListener('message', handleMessage);
        setIsConnecting(false);
      }, 5 * 60 * 1000);
      
    } catch (error) {
      debugLogger.error('useGHLIntegration', 'Connection failed', error);
      setIsConnecting(false);
      throw error;
    }
  };

  // Disconnect from GHL
  const disconnect = async () => {
    try {
      const { error } = await supabase
        .from('integrations')
        .update({ 
          connected: false,
          config: {},
          account_id: null,
          account_name: null
        })
        .eq('platform', 'goHighLevel');

      if (error) {
        throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['ghl-connection'] });
      debugLogger.info('useGHLIntegration', 'Disconnected from GHL');
    } catch (error) {
      debugLogger.error('useGHLIntegration', 'Disconnect failed', error);
      throw error;
    }
  };

  // Get account info (simplified - just return connection data)
  const { data: accountInfo } = useQuery({
    queryKey: ['ghl-account-info'],
    queryFn: async () => {
      if (!connection?.connected) {return null;}
      return {
        id: connection.account_id,
        name: connection.account_name || 'GoHighLevel Location',
        connected: connection.connected
      };
    },
    enabled: !!connection?.connected,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Get contacts (placeholder - would need API service)
  const { data: contacts, isLoading: contactsLoading } = useQuery({
    queryKey: ['ghl-contacts'],
    queryFn: async () => {
      if (!connection?.connected) {return [];}
      // TODO: Implement API call to get contacts
      debugLogger.info('useGHLIntegration', 'Contacts API not implemented yet');
      return [];
    },
    enabled: !!connection?.connected,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get campaigns (placeholder - would need API service)
  const { data: campaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ['ghl-campaigns'],
    queryFn: async () => {
      if (!connection?.connected) {return [];}
      // TODO: Implement API call to get campaigns
      debugLogger.info('useGHLIntegration', 'Campaigns API not implemented yet');
      return [];
    },
    enabled: !!connection?.connected,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    connection,
    isLoading,
    error,
    isConnecting,
    connect,
    disconnect,
    accountInfo,
    contacts,
    contactsLoading,
    campaigns,
    campaignsLoading,
  };
};