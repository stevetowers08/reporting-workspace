// Connect Location button component for GoHighLevel OAuth
// File: src/components/agency/ConnectLocationButton.tsx

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
    authUrl.searchParams.append('redirect_uri', `${window.location.origin}/oauth/callback`);
    authUrl.searchParams.append('client_id', import.meta.env.VITE_GHL_CLIENT_ID);
    authUrl.searchParams.append('scope', 'contacts.readonly opportunities.readonly calendars.readonly funnels/funnel.readonly funnels/page.readonly');
    
    if (clientId) {
      // Check if this is a new client (clientId starts with 'new_')
      if (clientId.startsWith('new_')) {
        const state = btoa(JSON.stringify({ platform: 'goHighLevel', clientId }));
        authUrl.searchParams.append('state', state);
      } else {
        const state = btoa(JSON.stringify({ platform: 'goHighLevel', clientId }));
        authUrl.searchParams.append('state', state);
      }
    } else {
      // For new client creation without a clientId yet, use a special state
      const state = btoa(JSON.stringify({ platform: 'goHighLevel', clientId: 'new_client' }));
      authUrl.searchParams.append('state', state);
    }
    
    // Redirecting to GHL OAuth
    
    // Redirect to GHL OAuth (popup won't work with server-side callback)
    window.location.href = authUrl.toString();
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
