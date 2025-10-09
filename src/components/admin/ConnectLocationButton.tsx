// Connect Location button component for GoHighLevel OAuth
// File: src/components/admin/ConnectLocationButton.tsx

'use client';

import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';
import React, { useState } from 'react';

interface ConnectLocationButtonProps {
  clientId?: string;
  locationId?: string;
  onConnected?: (locationId: string) => void;
}

export const ConnectLocationButton: React.FC<ConnectLocationButtonProps> = ({
  clientId,
  locationId,
  onConnected
}) => {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = () => {
    setIsConnecting(true);
    
    const authUrl = new URL('https://marketplace.leadconnectorhq.com/oauth/chooselocation');
    
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('redirect_uri', `${window.location.origin}/api/leadconnector/oath`);
    authUrl.searchParams.append('client_id', import.meta.env.VITE_GHL_CLIENT_ID);
    authUrl.searchParams.append('scope', 'contacts.readonly opportunities.readonly calendars.readonly funnels/funnel.readonly funnels/page.readonly');
    
    if (clientId) {
      // Check if this is a new client (clientId starts with 'new_')
      if (clientId.startsWith('new_')) {
        authUrl.searchParams.append('state', clientId); // Pass new client ID for context
      } else {
        authUrl.searchParams.append('state', clientId); // Pass existing client ID for context
      }
    } else {
      // For new client creation without a clientId yet, use a special state
      authUrl.searchParams.append('state', 'new_client');
    }
    
    console.log('🔍 Opening GHL OAuth in popup:', authUrl.toString());
    
    // Open OAuth in popup window instead of redirecting
    const popup = window.open(
      authUrl.toString(),
      'ghl-oauth',
      'width=600,height=700,scrollbars=yes,resizable=yes'
    );
    
    // Listen for popup completion
    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed);
        setIsConnecting(false);
        
        // Check if OAuth was successful by looking for success message in localStorage
        const oauthResult = localStorage.getItem('ghl-oauth-result');
        if (oauthResult) {
          try {
            const result = JSON.parse(oauthResult);
            if (result.success && result.locationId) {
              console.log('🔍 OAuth successful, updating form with locationId:', result.locationId);
              onConnected?.(result.locationId);
            }
          } catch (error) {
            console.error('Error parsing OAuth result:', error);
          }
          localStorage.removeItem('ghl-oauth-result');
        }
      }
    }, 1000);
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
      
      {locationId && (
        <div className="flex items-center gap-2 text-sm text-green-600 mt-2">
          <CheckCircle className="h-4 w-4" />
          Connected to location: {locationId}
        </div>
      )}
    </div>
  );
};

// Status component to show connection status
export const ConnectionStatus: React.FC<{ locationId?: string; isConnected: boolean }> = ({
  locationId,
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
      Connected to location: {locationId}
    </div>
  );
};
