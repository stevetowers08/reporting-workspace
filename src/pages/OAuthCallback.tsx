import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/LoadingStates';
import { IntegrationErrorBoundary } from '@/components/error/IntegrationErrorBoundary';
import { useErrorHandler } from '@/contexts/ErrorContext';
import { debugLogger } from '@/lib/debug';
import { OAuthService } from '@/services/auth/oauthService';
import { UserGoogleAdsService } from '@/services/auth/userGoogleAdsService';
import { IntegrationService } from '@/services/integration/IntegrationService';
import { AccountInfo, IntegrationPlatform, OAuthTokens, PlatformMetadata } from '@/types/integration';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const { handleAuthError, handleNetworkError } = useErrorHandler();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        console.log('🔍 OAuth Callback Debug - Starting...');
        console.log('Current URL:', window.location.href);
        console.log('Search params:', window.location.search);
        
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        console.log('🔍 OAuth Parameters:', {
          code: code ? code.substring(0, 20) + '...' : 'none',
          state: state ? state.substring(0, 20) + '...' : 'none',
          error,
          errorDescription
        });

        if (error) {
          throw new Error(`OAuth error: ${error} - ${errorDescription}`);
        }

        if (!code || !state) {
          throw new Error('Missing authorization code or state');
        }

        // Parse state to get platform and user info
        console.log('🔍 Parsing state...');
        let stateData;
        try {
          stateData = JSON.parse(atob(state));
          console.log('✅ State parsed successfully:', stateData);
        } catch (error) {
          console.error('❌ Failed to parse state:', error);
          throw new Error(`Invalid state format: ${error.message}`);
        }
        
        const platform = stateData.platform;
        const userId = stateData.userId;
        const integrationPlatform = stateData.integrationPlatform;
        
        console.log('🔍 State data:', {
          platform,
          userId,
          integrationPlatform,
          timestamp: stateData.timestamp,
          nonce: stateData.nonce
        });

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
        console.log('🔄 Starting token exchange...');
        debugLogger.debug('OAuthCallback', 'Exchanging code for tokens', { platform, codeLength: code.length, state });
        
        const tokens = await OAuthService.exchangeCodeForTokens(platform, code, state);
        
        console.log('✅ Token exchange successful!');
        console.log('Tokens received:', {
          hasAccessToken: !!tokens.accessToken,
          hasRefreshToken: !!tokens.refreshToken,
          tokenType: tokens.tokenType,
          expiresIn: tokens.expiresIn,
          scope: tokens.scope
        });
        
        debugLogger.debug('OAuthCallback', 'Token exchange successful', { 
          platform,
          hasAccessToken: !!tokens.accessToken,
          hasRefreshToken: !!tokens.refreshToken,
          tokenType: tokens.tokenType,
          expiresIn: tokens.expiresIn,
          allTokenKeys: Object.keys(tokens),
          fullTokens: tokens
        });
        
        // Debug: Check if tokens are stored properly (removed localStorage check)
        debugLogger.debug('OAuthCallback', 'Tokens stored using TokenManager');

        // Use the integration platform from state, or fallback to platform mapping
        const platformMap: Record<string, IntegrationPlatform> = {
          'facebook': 'facebookAds',
          'google': 'googleAds',
          'gohighlevel': 'goHighLevel'
        };

        const finalIntegrationPlatform = (integrationPlatform as IntegrationPlatform) || platformMap[platform] || platform as IntegrationPlatform;

        // Prepare OAuth tokens in the new format
        const oauthTokens: OAuthTokens = {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
          tokenType: tokens.tokenType || 'Bearer',
          scope: tokens.scope,
          expiresAt: tokens.expiresIn ? 
            new Date(Date.now() + (tokens.expiresIn * 1000)).toISOString() : 
            undefined
        };

        // Prepare account info
        const accountInfo: AccountInfo = {
          id: stateData.userId || 'unknown',
          name: `${platform} Account`,
          email: stateData.email
        };

        // Prepare platform-specific metadata
        let metadata: PlatformMetadata | undefined;
        if (finalIntegrationPlatform === 'googleAds') {
          metadata = {
            googleAds: {
              // Customer ID will be fetched programmatically after OAuth
              // Developer token is stored securely in environment variables
              developerToken: import.meta.env.VITE_GOOGLE_ADS_DEVELOPER_TOKEN || undefined,
              clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || undefined,
              clientSecret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET || undefined
            }
          };
        }

        // Save integration using the new service
        console.log('💾 Saving integration...');
        debugLogger.debug('OAuthCallback', 'Saving integration with new service', { 
          platform: finalIntegrationPlatform, 
          hasAccessToken: !!oauthTokens.accessToken,
          hasRefreshToken: !!oauthTokens.refreshToken,
          expiresAt: oauthTokens.expiresAt,
          hasMetadata: !!metadata
        });
        
        await IntegrationService.saveOAuthTokens(finalIntegrationPlatform, oauthTokens, accountInfo, metadata);
        console.log('✅ Integration saved successfully!');

        // For Google Ads, fetch customer ID programmatically after OAuth
        if (finalIntegrationPlatform === 'googleAds') {
          try {
            const { GoogleAdsService } = await import('@/services/api/googleAdsService');
            const customerId = await GoogleAdsService.fetchCustomerId(oauthTokens.accessToken);
            
            if (customerId) {
              // Update the integration with the fetched customer ID
              const updatedMetadata: PlatformMetadata = {
                googleAds: {
                  ...metadata?.googleAds,
                  customerId: customerId
                }
              };
              
              await IntegrationService.saveOAuthTokens(finalIntegrationPlatform, oauthTokens, accountInfo, updatedMetadata);
              debugLogger.info('OAuthCallback', 'Updated Google Ads integration with customer ID', { customerId });
            }
          } catch (error) {
            debugLogger.warn('OAuthCallback', 'Failed to fetch customer ID, will be fetched on first API call', error);
          }
        }

        setStatus('success');
        setMessage(`Successfully connected to ${platform}!`);

        // Redirect to admin panel after 2 seconds
        setTimeout(() => {
          navigate('/admin');
        }, 2000);

      } catch (error) {
        console.error('OAuth callback error:', error);
        debugLogger.error('OAuthCallback', 'OAuth callback failed', error);
        
        // Use error handler for better error management
        if (error instanceof Error) {
          if (error.message.includes('network') || error.message.includes('fetch')) {
            handleNetworkError(error, { context: 'OAuth callback' });
          } else if (error.message.includes('auth') || error.message.includes('token')) {
            handleAuthError(error, { context: 'OAuth callback' });
          } else {
            handleAuthError(error, { context: 'OAuth callback' });
          }
        }
        
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Authentication failed');
        
        // Add more detailed error information
        if (error instanceof Error) {
          console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
          });
        }
      }
    };

    handleOAuthCallback();
  }, [searchParams, navigate]);

  return (
    <IntegrationErrorBoundary>
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
    </IntegrationErrorBoundary>
  );
};

export default OAuthCallback;
