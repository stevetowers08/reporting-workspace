// Connect Location button component for GoHighLevel OAuth
// File: src/components/agency/ConnectLocationButton.tsx

'use client';

import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';
import { OAuthService } from '@/services/auth/oauthService';
import React, { useState } from 'react';
import { debugLogger } from '@/lib/debugLogger';

interface ConnectLocationButtonProps {
  clientId?: string;
}

export const ConnectLocationButton: React.FC<ConnectLocationButtonProps> = ({
  clientId
}) => {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    
    try {
      // Use OAuthService to generate proper OAuth URL with state validation
      const authUrl = await OAuthService.generateAuthUrl('goHighLevel', {}, clientId);
      
      // Redirect to GHL OAuth
      window.location.href = authUrl;
    } catch (error) {
      debugLogger.error('ConnectLocationButton', 'Failed to generate OAuth URL:', error);
      setIsConnecting(false);
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
