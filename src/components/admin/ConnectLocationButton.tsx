// Connect Location button component for GoHighLevel OAuth
// File: src/components/admin/ConnectLocationButton.tsx

'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    
    const authUrl = new URL('https://marketplace.gohighlevel.com/oauth/chooselocation');
    
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
    
    console.log('🔍 Redirecting to GHL OAuth:', authUrl.toString());
    
    // Redirect to GHL OAuth
    window.location.href = authUrl.toString();
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ExternalLink className="h-5 w-5" />
          Connect GoHighLevel Location
        </CardTitle>
        <CardDescription>
          Connect a GoHighLevel location to access contacts, opportunities, and funnel data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-2">Required Scopes:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>contacts.readonly</li>
              <li>opportunities.readonly</li>
              <li>calendars.readonly</li>
              <li>funnels/funnel.readonly</li>
              <li>funnels/page.readonly</li>
            </ul>
          </div>
          
          <Button 
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full"
          >
            {isConnecting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Connecting...
              </>
            ) : (
              <>
                <ExternalLink className="h-4 w-4 mr-2" />
                Connect Location
              </>
            )}
          </Button>
          
          {locationId && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              Connected to location: {locationId}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
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
