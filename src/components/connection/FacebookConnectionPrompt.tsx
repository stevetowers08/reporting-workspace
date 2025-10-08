import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { debugLogger } from '@/lib/debug';
import { AlertCircle, CheckCircle, Facebook } from "lucide-react";
import { useState } from "react";

interface FacebookConnectionPromptProps {
  onConnectionSuccess?: () => void;
}

export const FacebookConnectionPrompt: React.FC<FacebookConnectionPromptProps> = ({ 
  onConnectionSuccess 
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleConnectFacebook = async () => {
    try {
      setIsConnecting(true);
      setConnectionStatus('idle');
      setErrorMessage('');

      // Test existing connection instead of OAuth flow
      const { FacebookAdsService } = await import('@/services/api/facebookAdsService');
      const result = await FacebookAdsService.testConnection();

      if (result.success) {
        setConnectionStatus('success');
        onConnectionSuccess?.();
      } else {
        setConnectionStatus('error');
        setErrorMessage(result.error || 'Facebook connection failed');
      }
    } catch (error) {
      debugLogger.error('FacebookConnectionPrompt', 'Error testing Facebook connection', error);
      setConnectionStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to connect to Facebook');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setIsConnecting(true);
      setConnectionStatus('idle');
      setErrorMessage('');

      // Import FacebookAdsService dynamically to avoid circular dependencies
      const { FacebookAdsService } = await import('@/services/api/facebookAdsService');
      const result = await FacebookAdsService.testConnection();

      if (result.success) {
        setConnectionStatus('success');
        onConnectionSuccess?.();
      } else {
        setConnectionStatus('error');
        setErrorMessage(result.error || 'Connection test failed');
      }
    } catch (error) {
      debugLogger.error('FacebookConnectionPrompt', 'Error testing Facebook connection', error);
      setConnectionStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Connection test failed');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Card className="bg-white border border-slate-200 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
            <span className="text-white font-bold text-sm">f</span>
          </div>
          Connect Facebook Ads
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Connect your Facebook Ads account to view campaign performance, demographics, and platform breakdown data.
          </p>

          {connectionStatus === 'error' && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-700">{errorMessage}</span>
            </div>
          )}

          {connectionStatus === 'success' && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700">Facebook Ads connected successfully!</span>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleConnectFacebook}
              disabled={isConnecting}
              className="flex items-center gap-2"
            >
              <Facebook className="h-4 w-4" />
              {isConnecting ? 'Connecting...' : 'Connect Facebook'}
            </Button>

            <Button
              onClick={handleTestConnection}
              disabled={isConnecting}
              variant="outline"
              className="flex items-center gap-2"
            >
              {isConnecting ? 'Testing...' : 'Test Connection'}
            </Button>
          </div>

          <div className="text-xs text-slate-500">
            <p><strong>Required permissions:</strong></p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>ads_read - Read ad performance data</li>
              <li>ads_management - Access campaign details</li>
              <li>business_management - Access business account info</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
