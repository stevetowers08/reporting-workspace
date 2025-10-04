import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/LoadingStates';
import { debugLogger } from '@/lib/debug';
import { OAuthService } from '@/services/auth/oauthService';
import { UserGoogleAdsService } from '@/services/auth/userGoogleAdsService';
import { DatabaseService } from '@/services/data/databaseService';
import { AlertCircle, CheckCircle } from 'lucide-react';
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

        // Parse state to get platform and user info
        const stateData = JSON.parse(atob(state));
        const platform = stateData.platform;
        const userId = stateData.userId;
        const integrationPlatform = stateData.integrationPlatform;

        // Check if this is a user-specific Google Ads authentication
        if (platform === 'google' && userId && stateData.scope?.includes('adwords')) {
          // Handle user-specific Google Ads authentication
          await UserGoogleAdsService.handleUserAuthCallback(code, state, userId);
          
          setStatus('success');
          setMessage('Successfully connected your Google Ads account!');
          setTimeout(() => {
            navigate('/admin'); // Redirect to admin panel
          }, 2000);
          return;
        }
        
        // Debug: Log which path we're taking
        debugLogger.debug('OAuthCallback', 'OAuth path decision', {
          platform,
          userId,
          hasUserId: !!userId,
          scope: stateData.scope,
          hasAdwordsScope: stateData.scope?.includes('adwords'),
          takingUserSpecificPath: platform === 'google' && userId && stateData.scope?.includes('adwords')
        });

        // Exchange code for tokens (existing logic for other platforms)
        debugLogger.debug('OAuthCallback', 'Exchanging code for tokens', { platform, codeLength: code.length, state });
        const tokens = await OAuthService.exchangeCodeForTokens(platform, code, state);
        debugLogger.debug('OAuthCallback', 'Token exchange successful', { 
          platform,
          hasAccessToken: !!tokens.accessToken,
          hasRefreshToken: !!tokens.refreshToken,
          tokenType: tokens.tokenType,
          expiresIn: tokens.expiresIn,
          allTokenKeys: Object.keys(tokens),
          fullTokens: tokens
        });
        
        // Debug: Check if tokens are stored properly
        const storedTokens = localStorage.getItem(`oauth_tokens_${platform}`);
        debugLogger.debug('OAuthCallback', 'Tokens stored in localStorage', { hasStoredTokens: !!storedTokens });

        // Use the integration platform from state, or fallback to platform mapping
        const platformMap: Record<string, string> = {
          'facebook': 'facebookAds',
          'google': 'googleAds',
          'gohighlevel': 'goHighLevel'
        };

        const finalIntegrationPlatform = integrationPlatform || platformMap[platform] || platform;

        // Save integration to database
        debugLogger.debug('OAuthCallback', 'Saving integration', { 
          platform: finalIntegrationPlatform, 
          connected: true, 
          hasAccessToken: !!tokens.accessToken,
          tokenKeys: Object.keys(tokens),
          fullTokens: tokens
        });
        
        // Handle different token field names for different platforms
        const accessToken = tokens.accessToken || tokens.access_token || tokens.accessToken;
        
        await DatabaseService.saveIntegration(finalIntegrationPlatform, {
          connected: true,
          accountName: `${platform} Account`,
          lastSync: new Date().toISOString(),
          config: { 
            tokens: { 
              accessToken: accessToken,
              refreshToken: tokens.refreshToken || tokens.refresh_token,
              expiresIn: tokens.expiresIn || tokens.expires_in,
              tokenType: tokens.tokenType || tokens.token_type,
              scope: tokens.scope
            } 
          }
        });
        console.log('Integration saved successfully');

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
              <LoadingSpinner size="md" className="mx-auto text-blue-600" />
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
