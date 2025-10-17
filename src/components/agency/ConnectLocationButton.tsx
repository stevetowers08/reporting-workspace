// Connect Location button component for GoHighLevel OAuth
// File: src/components/agency/ConnectLocationButton.tsx

'use client';

import { Button } from '@/components/ui/button';
import { debugLogger } from '@/lib/debug';
import { supabase } from '@/lib/supabase';
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
      // Generate OAuth URL directly to ensure it points to external GHL
      // Get OAuth credentials from database instead of environment variables
      const { data: credentials } = await supabase
        .from('oauth_credentials')
        .select('client_id, redirect_uri')
        .eq('platform', 'goHighLevel')
        .eq('is_active', true)
        .single();
      
      if (!credentials) {
        throw new Error('GoHighLevel OAuth credentials not found in database');
      }
      
      const ghlClientId = credentials.client_id;
      const redirectUri = credentials.redirect_uri;
      
      if (!ghlClientId) {
        throw new Error('Missing GHL client ID in database credentials');
      }
      
      // Generate state parameter
      const state = btoa(JSON.stringify({
        platform: 'goHighLevel',
        timestamp: Date.now(),
        nonce: Math.random().toString(36).substring(2, 15),
        integrationPlatform: clientId || 'new_client'
      }));
      
      // Build OAuth URL directly with GoHighLevel-specific parameters
      const authUrl = `https://marketplace.leadconnectorhq.com/oauth/chooselocation?` +
        `client_id=${ghlClientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=contacts.readonly%20opportunities.readonly%20calendars.readonly%20funnels/funnel.readonly%20funnels/page.readonly%20locations.readonly&` +
        `state=${encodeURIComponent(state)}&` +
        `loginWindowOpenMode=self`; // Critical: keeps login in popup instead of redirecting to main window
      
      debugLogger.info('ConnectLocationButton', 'Opening OAuth popup', { authUrl, clientId });
      debugLogger.info('ConnectLocationButton', 'OAuth URL being opened:', authUrl);
      
      // Ensure we're opening the external GHL OAuth URL
      if (!authUrl.includes('marketplace.leadconnectorhq.com')) {
        throw new Error('Invalid OAuth URL - not pointing to GoHighLevel');
      }
      
      // Open OAuth flow in popup window (centered with better sizing)
      const width = 800;  // Increased width for better UX
      const height = 800; // Increased height for better UX
      const left = (window.innerWidth - width) / 2;
      const top = (window.innerHeight - height) / 2;
      
      // First open a blank popup to avoid routing issues
      const popup = window.open(
        'about:blank',
        'ghl-oauth',
        `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes,status=yes,toolbar=no,menubar=no,location=no`
      );
      
      if (!popup) {
        throw new Error('Failed to open OAuth popup. Please allow popups for this site.');
      }
      
      // Navigate to the OAuth URL after popup is created
      popup.location.href = authUrl;
      
      debugLogger.info('ConnectLocationButton', 'Popup opened and navigating to:', authUrl);
      
      // Add timeout to prevent hanging popup (5 minutes)
      const timeoutId = setTimeout(() => {
        if (!popup.closed) {
          debugLogger.warn('ConnectLocationButton', 'OAuth popup timeout - closing popup');
          popup.close();
          clearInterval(monitorPopup);
          window.removeEventListener('message', handleMessage);
          setIsConnecting(false);
          window.alert('OAuth connection timed out. Please try again.');
        }
      }, 5 * 60 * 1000); // 5 minutes
      
      // Listen for messages from the popup window
      const handleMessage = (event: globalThis.MessageEvent) => {
        // Enhanced security: validate origin and message structure
        if (event.origin !== window.location.origin) {
          debugLogger.warn('ConnectLocationButton', 'Ignoring message from different origin', event.origin);
          return;
        }
        
        // Validate message structure
        if (!event.data || typeof event.data !== 'object') {
          debugLogger.warn('ConnectLocationButton', 'Invalid message data structure', event.data);
          return;
        }
        
        if (event.data?.type === 'GHL_OAUTH_SUCCESS') {
          debugLogger.info('ConnectLocationButton', 'OAuth popup success', event.data);
          clearTimeout(timeoutId);
          popup.close();
          window.removeEventListener('message', handleMessage);
          setIsConnecting(false);
          
          // Call onConnected callback if provided
          if (onConnected) {
            onConnected();
          }
        } else if (event.data?.type === 'GHL_OAUTH_ERROR') {
          debugLogger.error('ConnectLocationButton', 'OAuth popup error', event.data);
          clearTimeout(timeoutId);
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
          debugLogger.info('ConnectLocationButton', 'Monitoring popup URL:', currentUrl);
          
          if ((currentUrl.includes('/oauth/callback') || currentUrl.includes('/api/leadconnector/oath')) && currentUrl.includes('success=true')) {
            clearInterval(monitorPopup);
            clearTimeout(timeoutId);
            window.removeEventListener('message', handleMessage);
            setIsConnecting(false);
            
            // Call onConnected callback if provided
            if (onConnected) {
              onConnected();
            }
            
            popup.close();
            debugLogger.info('ConnectLocationButton', 'OAuth success detected via URL monitoring');
          } else if ((currentUrl.includes('/oauth/callback') || currentUrl.includes('/api/leadconnector/oath')) && currentUrl.includes('error=')) {
            clearInterval(monitorPopup);
            clearTimeout(timeoutId);
            window.removeEventListener('message', handleMessage);
            setIsConnecting(false);
            popup.close();
            window.alert('OAuth failed: ' + new URLSearchParams(currentUrl.split('?')[1]).get('error'));
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
        className="w-full !text-sm !font-normal"
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
