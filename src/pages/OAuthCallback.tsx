/* eslint-disable no-console, no-undef, no-unused-vars, @typescript-eslint/no-unused-vars */
import { IntegrationErrorBoundary } from '@/components/error/IntegrationErrorBoundary';
import { LoadingSpinner } from '@/components/ui/LoadingStates';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useErrorHandler } from '@/contexts/ErrorContext';
import { debugLogger } from '@/lib/debug';
import { TokenManager } from '@/services/auth/TokenManager';
import { OAuthService } from '@/services/auth/oauthService';
import { GoHighLevelApiService } from '@/services/ghl/goHighLevelApiService';
import { GoHighLevelAuthService } from '@/services/ghl/goHighLevelAuthService';
import { UnifiedIntegrationService } from '@/services/integration/IntegrationService';
import { OAuthTokens } from '@/types/integration';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const { handleAuthError, handleNetworkError } = useErrorHandler();

  // Debug: Log component mounting
  debugLogger.debug('OAuthCallback', 'Component mounted', {
    url: window.location.href,
    searchParams: window.location.search
  });

  useEffect(() => {
    debugLogger.debug('OAuthCallback', 'useEffect triggered - OAuth callback starting');
    const handleOAuthCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        debugLogger.debug('OAuthCallback', 'OAuth parameters', { 
          hasCode: !!code, 
          hasState: !!state, 
          hasError: !!error,
          code: code ? code.substring(0, 10) + '...' : 'MISSING',
          state: state ? state.substring(0, 20) + '...' : 'MISSING'
        });

        if (error) {
          throw new Error(`OAuth error: ${error}`);
        }

        if (!code || !state) {
          throw new Error('Missing authorization code or state parameter');
        }

        // Parse state to determine platform
        let stateData;
        try {
          stateData = JSON.parse(atob(state));
          debugLogger.debug('🔍 Parsed state data:', stateData);
        } catch {
          throw new Error('Invalid state parameter');
        }

        const platform = stateData.platform;
        debugLogger.debug('🔍 Detected platform:', platform);

        if (platform === 'googleSheets') {
          // Handle Google Sheets OAuth (WORKING PATTERN)
          debugLogger.debug('🔍 Processing Google Sheets OAuth');
          await GoogleSheetsOAuthService.handleSheetsAuthCallback(code, state);
          
          // Verify the tokens were actually saved to the database
          debugLogger.debug('🔍 Verifying database update...');
          const integration = await UnifiedIntegrationService.getIntegration('googleSheets');
          debugLogger.debug('🔍 Integration from database:', {
            exists: !!integration,
            connected: integration?.config?.connected,
            hasTokens: !!integration?.config?.tokens?.accessToken,
            config: integration?.config
          });
          
        if (!integration?.config?.connected || !integration?.config?.tokens?.accessToken) {
          debugLogger.error('OAuthCallback', 'Database verification failed', {
            integration,
            connected: integration?.config?.connected,
              hasTokens: !!integration?.config?.tokens?.accessToken
            });
            throw new Error('Failed to save Google Sheets tokens to database');
          }
          
          debugLogger.debug('🔍 Database verification successful!');
          
          setStatus('success');
          setMessage('Successfully connected to Google Sheets!');
        } else if (platform === 'googleAds') {
          // Handle Google Ads OAuth
          debugLogger.debug('🔍 Processing Google Ads OAuth');
          
          // Debug: Check localStorage before token exchange
          const codeVerifier = localStorage.getItem('oauth_code_verifier_googleAds');
          debugLogger.debug('🔍 Code verifier check:', {
            hasCodeVerifier: !!codeVerifier,
            codeVerifierLength: codeVerifier?.length || 0,
            availableKeys: Object.keys(localStorage).filter(key => key.includes('oauth')),
            allLocalStorageKeys: Object.keys(localStorage),
            codeVerifierValue: codeVerifier ? codeVerifier.substring(0, 20) + '...' : 'MISSING'
          });
          
          const result = await OAuthService.handleGoogleAdsCallback(code, state);
          debugLogger.debug('🔍 Google Ads auth completed:', { 
            hasAccessToken: !!result.tokens.accessToken,
            hasRefreshToken: !!result.tokens.refreshToken,
            googleUserId: result.userInfo.googleUserId,
            tokenType: result.tokens.tokenType,
            scope: result.tokens.scope,
            expiresIn: result.tokens.expiresIn
          });

          // Save tokens to integrations table
          const oauthTokens: OAuthTokens = {
            accessToken: result.tokens.accessToken,
            refreshToken: result.tokens.refreshToken,
            expiresIn: result.tokens.expiresIn,
            tokenType: result.tokens.tokenType,
            scope: result.tokens.scope
          };

          debugLogger.debug('🔍 About to save OAuth tokens:', {
            platform: 'googleAds',
            hasAccessToken: !!oauthTokens.accessToken,
            hasRefreshToken: !!oauthTokens.refreshToken,
            tokenType: oauthTokens.tokenType,
            scope: oauthTokens.scope,
            expiresIn: oauthTokens.expiresIn
          });

          // Account info and metadata are now handled by TokenManager

          try {
            // Get the actual Google Ads customer ID instead of using Google user ID
            debugLogger.debug('🔍 Getting actual Google Ads customer ID from API...');
            const { GoogleAdsAccountDiscovery } = await import('@/services/api/googleAdsAccountDiscovery');
            const actualCustomerId = await GoogleAdsAccountDiscovery.discoverAndStoreManagerAccount();
            
            if (!actualCustomerId) {
              throw new Error('Failed to get Google Ads customer ID from listAccessibleCustomers API');
            }
            
            debugLogger.info('🔍 Google Ads OAuth - Google User ID:', result.userInfo.googleUserId);
            debugLogger.info('🔍 Google Ads OAuth - Actual Customer ID:', actualCustomerId);
            debugLogger.info('🔍 Using 10-digit customer ID instead of 18-digit user ID');
            
            await TokenManager.storeOAuthTokens('googleAds', oauthTokens, {
              id: actualCustomerId, // Use ONLY the actual 10-digit customer ID
              name: result.userInfo.googleUserName || 'Google Ads User',
              email: result.userInfo.googleUserEmail
            });
            debugLogger.debug('🔍 Saved Google Ads tokens with correct customer ID to integrations table');
          } catch (tokenError) {
            // Comprehensive error handling to prevent [object Object] in UI
            const errorMessage = tokenError instanceof Error 
              ? tokenError.message 
              : typeof tokenError === 'string' 
                ? tokenError 
                : JSON.stringify(tokenError, null, 2);
            
            debugLogger.error('🔍 Token storage error:', {
              error: tokenError,
              errorMessage,
              errorStack: tokenError instanceof Error ? tokenError.stack : undefined,
              tokens: {
                hasAccessToken: !!oauthTokens.accessToken,
                hasRefreshToken: !!oauthTokens.refreshToken,
                tokenType: oauthTokens.tokenType,
                scope: oauthTokens.scope,
                expiresIn: oauthTokens.expiresIn
              }
            });
            
            // Throw a clean error with proper message
            throw new Error(`Token storage failed: ${errorMessage}`);
          }

          setStatus('success');
          setMessage('Successfully connected to Google Ads!');
        } else if (platform === 'goHighLevel') {
          // Handle GoHighLevel OAuth
          debugLogger.debug('🔍 Processing GoHighLevel OAuth');
          
          const clientId = import.meta.env.VITE_GHL_CLIENT_ID;
          const clientSecret = import.meta.env.VITE_GHL_CLIENT_SECRET;
          const redirectUri = `${window.location.origin}/oauth/callback`;
          
          if (!clientId || !clientSecret) {
            throw new Error('Missing GoHighLevel OAuth credentials');
          }
          
          // Exchange code for token
          const tokenData = await GoHighLevelAuthService.exchangeCodeForToken(code, clientId, clientSecret, redirectUri);
          
          // ✅ Save complete token data including refresh token
          const success = await GoHighLevelApiService.saveLocationToken(
            tokenData.locationId,
            tokenData.access_token,
            tokenData.refresh_token, // ✅ Include refresh token
            tokenData.scope.split(' '),
            tokenData.expires_in // ✅ Include expiration time
          );
          
          if (!success) {
            throw new Error('Failed to save GoHighLevel token to database');
          }
          
          setStatus('success');
          setMessage('Successfully connected to GoHighLevel!');
        } else {
          // Handle other platforms using OAuthService
          debugLogger.debug('🔍 Processing generic OAuth for platform:', platform);
          // const integrationPlatform = (stateData.integrationPlatform || platform) as IntegrationPlatform;
          // Use the original platform for OAuthService (not integrationPlatform) to match code verifier storage
          // OAuthService.exchangeCodeForTokens() already stores tokens via TokenManager
          await OAuthService.exchangeCodeForTokens(platform, code, state);
          setStatus('success');
          setMessage(`Successfully connected to ${platform}!`);
        }

        // Redirect to agency panel after 2 seconds
        setTimeout(() => {
          navigate('/agency');
        }, 2000);

      } catch (error) {
        debugLogger.error('OAuthCallback', 'OAuth callback failed', error);
        
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Authentication failed');
        
        // Add more detailed error information
        if (error instanceof Error) {
          debugLogger.error('OAuthCallback', 'Error details', {
            message: error.message,
            stack: error.stack,
            name: error.name
          });
        }
      }
    };

    handleOAuthCallback();
  }, [searchParams, navigate, handleAuthError, handleNetworkError]);

  return (
    <IntegrationErrorBoundary>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              {status === 'loading' && <LoadingSpinner size="sm" />}
              {status === 'success' && <CheckCircle className="h-5 w-5 text-green-600" />}
              {status === 'error' && <AlertCircle className="h-5 w-5 text-red-600" />}
              OAuth Callback
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">{message}</p>
            {status === 'loading' && (
              <p className="text-sm text-gray-500">Processing authentication...</p>
            )}
            {status === 'success' && (
              <p className="text-sm text-green-600">Redirecting to agency panel...</p>
            )}
            {status === 'error' && (
              <button
                onClick={() => navigate('/agency')}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Go to Agency Panel
              </button>
            )}
          </CardContent>
        </Card>
      </div>
    </IntegrationErrorBoundary>
  );
};

export default OAuthCallback;