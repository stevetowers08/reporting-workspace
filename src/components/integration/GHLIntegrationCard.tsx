import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGHLIntegration } from '@/hooks/useGHLIntegration';
import { debugLogger } from '@/lib/debug';
import { AlertCircle, CheckCircle, Clock, ExternalLink } from 'lucide-react';
import React from 'react';

export const GHLIntegrationCard: React.FC = () => {
  const {
    isConnected,
    accountName,
    isLoading,
    connect,
    disconnect,
    isConnecting,
    isDisconnecting
  } = useGHLIntegration();

  const handleConnect = async () => {
    try {
      await connect();
    } catch (error) {
      debugLogger.error('GHLIntegrationCard', 'Failed to connect to GHL', error);
    }
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const getStatusIcon = () => {
    if (isConnected) {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    }
    return <Clock className="h-5 w-5 text-gray-400" />;
  };

  const getStatusText = () => {
    if (isConnected) {
      return 'Connected';
    }
    return 'Not Connected';
  };

  const getStatusColor = () => {
    if (isConnected) {
      return 'text-green-600';
    }
    return 'text-gray-500';
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">GHL</span>
            </div>
            <div>
              <CardTitle className="text-lg">Go High Level</CardTitle>
              <p className="text-sm text-gray-600">CRM & Marketing Automation</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className={`text-sm font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {isConnected ? (
          <div className="space-y-4">
            {accountName && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    Connected to: {accountName}
                  </span>
                </div>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('https://app.gohighlevel.com', '_blank')}
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Open GHL Dashboard
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
              >
                {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  Connect your Go High Level account to sync contacts, campaigns, and analytics data.
                </span>
              </div>
            </div>
            
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full flex items-center justify-center gap-2"
            >
              {isConnecting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Connecting...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4" />
                  Connect Go High Level
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
