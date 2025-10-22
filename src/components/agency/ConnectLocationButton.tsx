// Connect Location button component for GoHighLevel OAuth
// File: src/components/agency/ConnectLocationButton.tsx

'use client';

import { Button } from '@/components/ui/button';
import { debugLogger } from '@/lib/debug';
import { GoHighLevelService } from '@/services/ghl/goHighLevelService';
import { AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';
import React, { useState } from 'react';

interface ConnectLocationButtonProps {
  clientId?: string;
  onConnected?: () => void;
}

export const ConnectLocationButton: React.FC<ConnectLocationButtonProps> = ({
  clientId,
  onConnected
}) => {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    
    try {
      // Get OAuth credentials from environment
      const clientId_env = import.meta.env.VITE_GHL_CLIENT_ID;
      const redirectUri = (import.meta.env.VITE_GHL_REDIRECT_URI || 
          (window.location.hostname === 'localhost' 
              ? `${window.location.origin}/oauth/ghl-callback`
              : 'https://reporting.tulenagency.com/oauth/ghl-callback')).trim();
      
      if (!clientId_env) {
        throw new Error('Missing OAuth credentials. Please set VITE_GHL_CLIENT_ID in environment variables.');
      }
      
      // Use GoHighLevelService to generate proper OAuth URL with required scopes
      const scopes = [
        'contacts.readonly',
        'opportunities.readonly', 
        'calendars.readonly',
        'funnels/funnel.readonly',
        'funnels/page.readonly',
        'locations.readonly'
      ];
      const authUrl = await GoHighLevelService.getAuthorizationUrl(clientId_env, redirectUri, scopes);
      
      debugLogger.info('ConnectLocationButton', 'Opening OAuth popup', { authUrl, clientId });
      
      // Open OAuth flow in popup window (centered)
      const width = 600;
      const height = 700;
      const left = (window.innerWidth - width) / 2;
      const top = (window.innerHeight - height) / 2;
      
      const popup = window.open(
        authUrl,
        'ghl-oauth',
        `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes,status=yes,toolbar=no,menubar=no,location=no`
      );
      
      if (!popup) {
        throw new Error('Failed to open OAuth popup. Please allow popups for this site.');
      }
      
      // Listen for messages from the popup window
      const handleMessage = (event: globalThis.MessageEvent) => {
        if (event.origin !== window.location.origin) {
          return; // Ignore messages from other origins
        }
        
        if (event.data?.type === 'GHL_OAUTH_SUCCESS') {
          debugLogger.info('ConnectLocationButton', 'OAuth popup success', event.data);
          popup.close();
          window.removeEventListener('message', handleMessage);
          setIsConnecting(false);
          
          // Call onConnected callback if provided
          if (onConnected) {
            onConnected();
          }
        } else if (event.data?.type === 'GHL_OAUTH_ERROR') {
          debugLogger.error('ConnectLocationButton', 'OAuth popup error', event.data);
          popup.close();
          window.removeEventListener('message', handleMessage);
          setIsConnecting(false);
          window.alert('Failed to connect to GoHighLevel: ' + (event.data.error || 'Unknown error'));
        }
      };
      
      // Monitor popup URL as fallback (in case postMessage fails)
      const monitorPopup = setInterval(() => {
        if (popup.closed) {
          clearInterval(monitorPopup);
          window.removeEventListener('message', handleMessage);
          setIsConnecting(false);
          debugLogger.info('ConnectLocationButton', 'OAuth popup closed by user');
          return;
        }
        
        try {
          // Check if popup has redirected to our callback URL
          const currentUrl = popup.location.href;
          if (currentUrl.includes('/leadconnector/oath') && currentUrl.includes('success=true')) {
            clearInterval(monitorPopup);
            window.removeEventListener('message', handleMessage);
            setIsConnecting(false);
            
            // Call onConnected callback if provided
            if (onConnected) {
              onConnected();
            }
            
            popup.close();
            debugLogger.info('ConnectLocationButton', 'OAuth success detected via URL monitoring');
          }
        } catch (_error) {
          // Cross-origin error is expected, ignore
        }
      }, 1000);
      
      window.addEventListener('message', handleMessage);
      
    } catch (error) {
      debugLogger.error('ConnectLocationButton', 'Failed to generate OAuth URL:', error);
      setIsConnecting(false);
      window.alert('Failed to start OAuth flow: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  return (
    <div className="text-center">
      <Button 
        onClick={handleConnect}
        disabled={isConnecting}
        variant="outline"
        size="sm"
        className="w-full"
      >
        {isConnecting ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2" />
            Connecting...
          </>
        ) : (
          <>
            <ExternalLink className="h-4 w-4 mr-2" />
            Connect GoHighLevel
          </>
        )}
      </Button>
    </div>
  );
};

// Status component to show connection status
export const ConnectionStatus: React.FC<{ locationId?: string; isConnected: boolean }> = ({
  locationId: _locationId,
  isConnected
}) => {
  if (!isConnected) {
    return (
      <div className="flex items-center gap-2 text-sm text-amber-600">
        <AlertCircle className="h-4 w-4" />
        Not connected to GoHighLevel
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-green-600">
      <CheckCircle className="h-4 w-4" />
      Connected to location: {_locationId}
    </div>
  );
};
