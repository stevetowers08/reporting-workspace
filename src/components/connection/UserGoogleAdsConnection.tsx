import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner, LoadingState } from "@/components/ui/LoadingStates";
import { debugLogger } from '@/lib/debug';
import { UserGoogleAdsService } from "@/services/auth/userGoogleAdsService";
import { AlertCircle, CheckCircle, ExternalLink, LogOut, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

interface GoogleAdsUserAccount {
  customerId: string;
  customerName: string;
  currency: string;
  timezone: string;
  managerAccount: boolean;
}

interface UserGoogleAdsConnectionProps {
  userId: string; // Your app's user ID
  onConnectionChange?: (connected: boolean) => void;
}

const UserGoogleAdsConnection = ({ userId, onConnectionChange }: UserGoogleAdsConnectionProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [accounts, setAccounts] = useState<GoogleAdsUserAccount[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkConnection();
  }, [userId]);

  const checkConnection = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Force fresh check by clearing any cached data
      const connected = await UserGoogleAdsService.isUserConnected(userId);
      setIsConnected(connected);
      
      if (connected) {
        await loadAccounts();
      }
      
      onConnectionChange?.(connected);
    } catch (error) {
      debugLogger.error('UserGoogleAdsConnection', 'Error checking connection', error);
      setError('Failed to check connection status');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAccounts = async () => {
    try {
      const userAccounts = await UserGoogleAdsService.getUserGoogleAdsAccounts(userId);
      setAccounts(userAccounts);
    } catch (error) {
      debugLogger.error('UserGoogleAdsConnection', 'Error loading accounts', error);
      setError('Failed to load Google Ads accounts');
    }
  };

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      
      const authUrl = await UserGoogleAdsService.generateUserAuthUrl(userId);
      window.location.href = authUrl;
    } catch (error) {
      debugLogger.error('UserGoogleAdsConnection', 'Error initiating connection', error);
      setError('Failed to initiate Google Ads connection');
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your Google Ads account? This will remove access to all your Google Ads data.')) {
      return;
    }

    try {
      setIsDisconnecting(true);
      setError(null);
      
      const success = await UserGoogleAdsService.disconnectUser(userId);
      
      if (success) {
        setIsConnected(false);
        setAccounts([]);
        onConnectionChange?.(false);
        alert('Google Ads account disconnected successfully!');
      } else {
        setError('Failed to disconnect Google Ads account');
      }
    } catch (error) {
      debugLogger.error('UserGoogleAdsConnection', 'Error disconnecting', error);
      setError('Failed to disconnect Google Ads account');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleRefreshAccounts = async () => {
    try {
      await loadAccounts();
    } catch (error) {
      console.error('Error refreshing accounts:', error);
      setError('Failed to refresh accounts');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <LoadingState message="Checking connection..." />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">G</span>
            </div>
            <div>
              <CardTitle className="text-lg">Google Ads Account</CardTitle>
              <p className="text-sm text-gray-500">
                {isConnected ? 'Connected to your Google Ads account' : 'Connect your Google Ads account'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isConnected && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshAccounts}
                className="text-blue-600 hover:text-blue-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {!isConnected ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ExternalLink className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Your Google Ads Account</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Connect your Google Ads account to access your campaigns, metrics, and performance data. 
              You'll be redirected to Google to authorize access.
            </p>
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isConnecting ? (
                <>
                  <LoadingSpinner size="xs" className="mr-2 border-white border-t-white" />
                  Connecting...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Connect Google Ads Account
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700 font-medium">
                Successfully connected to Google Ads
              </span>
            </div>

            {accounts.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Your Google Ads Accounts</h4>
                <div className="grid gap-3">
                  {accounts.map((account) => (
                    <div
                      key={account.customerId}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{account.customerName}</p>
                        <p className="text-sm text-gray-500">
                          ID: {account.customerId} • {account.currency} • {account.timezone}
                        </p>
                        {account.managerAccount && (
                          <span className="inline-block mt-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            Manager Account
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                {isDisconnecting ? (
                  <>
                    <LoadingSpinner size="xs" className="mr-2 border-red-600 border-t-red-600" />
                    Disconnecting...
                  </>
                ) : (
                  <>
                    <LogOut className="h-4 w-4 mr-2" />
                    Disconnect Account
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserGoogleAdsConnection;
