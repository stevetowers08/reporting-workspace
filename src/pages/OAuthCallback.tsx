import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DatabaseService } from '@/services/databaseService';
import { OAuthService } from '@/services/oauthService';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (error) {
          throw new Error(`OAuth error: ${error} - ${errorDescription}`);
        }

        if (!code || !state) {
          throw new Error('Missing authorization code or state');
        }

        // Parse state to get platform
        const stateData = JSON.parse(atob(state));
        const platform = stateData.platform;

        // Exchange code for tokens
        const tokens = await OAuthService.exchangeCodeForTokens(platform, code, state);

        // Map OAuth platform to integration platform
        const platformMap: Record<string, string> = {
          'facebook': 'facebookAds',
          'google': 'googleAds', // This will need to be more specific based on scopes
          'gohighlevel': 'goHighLevel'
        };

        const integrationPlatform = platformMap[platform] || platform;

        // Save integration to database
        await DatabaseService.saveIntegration(integrationPlatform, {
          connected: true,
          accountName: `${platform} Account`,
          lastSync: new Date().toISOString(),
          config: { tokens: { accessToken: tokens.accessToken } }
        });

        setStatus('success');
        setMessage(`Successfully connected to ${platform}!`);

        // Redirect to admin panel after 2 seconds
        setTimeout(() => {
          navigate('/admin');
        }, 2000);

      } catch (error) {
        console.error('OAuth callback error:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Authentication failed');
      }
    };

    handleOAuthCallback();
  }, [searchParams, navigate]);

  return (
    <div className="page-bg-light flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">OAuth Authentication</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          {status === 'loading' && (
            <div className="space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
              <p className="text-gray-600">Processing authentication...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <CheckCircle className="h-8 w-8 mx-auto text-green-600" />
              <p className="text-green-600 font-medium">{message}</p>
              <p className="text-sm text-gray-500">Redirecting to integrations...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <AlertCircle className="h-8 w-8 mx-auto text-red-600" />
              <p className="text-red-600 font-medium">Authentication Failed</p>
              <p className="text-sm text-gray-500">{message}</p>
              <button
                onClick={() => navigate('/admin')}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Return to Admin Panel
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OAuthCallback;
