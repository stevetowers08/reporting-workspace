import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/LoadingStates";
import { debugLogger } from '@/lib/debug';
import { OAuthService } from "@/services/auth/oauthService";
import { UnifiedIntegrationService } from "@/services/integration/IntegrationService";
import { AlertCircle, CheckCircle, ExternalLink, LogOut, RefreshCw } from "lucide-react";
import { useEffect, useState, useCallback } from "react";

interface GoogleAdsConnectionProps {
  onConnectionChange?: (connected: boolean) => void;
}

const GoogleAdsConnection = ({ onConnectionChange }: GoogleAdsConnectionProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const checkConnection = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Check if Google Ads is connected via integrations table
      const integrations = await UnifiedIntegrationService.getIntegrations();
      const googleAdsIntegration = integrations.find(integration => integration.platform === 'googleAds');
      
      setIsConnected(!!googleAdsIntegration);
      onConnectionChange?.(!!googleAdsIntegration);
    } catch (error) {
      debugLogger.error('GoogleAdsConnection', 'Error checking connection', error);
      setError('Failed to check connection status');
    } finally {
      setIsLoading(false);
    }
  }, [onConnectionChange]);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      
      const authUrl = await OAuthService.generateAuthUrl('googleAds');
      window.location.href = authUrl;
    } catch (error) {
      debugLogger.error('GoogleAdsConnection', 'Error initiating connection', error);
      setError('Failed to initiate Google Ads connection');
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsDisconnecting(true);
      setError(null);
      
      await UnifiedIntegrationService.disconnectIntegration('googleAds');
      setIsConnected(false);
      onConnectionChange?.(false);
    } catch (error) {
      debugLogger.error('GoogleAdsConnection', 'Error disconnecting', error);
      setError('Failed to disconnect Google Ads');
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Google Ads Connection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ExternalLink className="h-5 w-5" />
          Google Ads Connection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-800">{error}</span>
          </div>
        )}

        {isConnected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-800">Google Ads is connected</span>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                variant="outline"
                className="flex items-center gap-2"
              >
                {isDisconnecting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
                {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
              </Button>
              
              <Button
                onClick={checkConnection}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh Status
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Connect your Google Ads account to access campaign data and analytics.
            </p>
            
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="flex items-center gap-2"
            >
              {isConnecting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              {isConnecting ? 'Connecting...' : 'Connect Google Ads'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GoogleAdsConnection;
