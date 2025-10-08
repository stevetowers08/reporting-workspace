import { IntegrationErrorBoundary } from '@/components/error/IntegrationErrorBoundary';
import { LoadingSpinner } from '@/components/ui/LoadingStates';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useErrorHandler } from '@/contexts/ErrorContext';
import { debugLogger } from '@/lib/debug';
import { GoogleSheetsOAuthService } from '@/services/auth/googleSheetsOAuthService';
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

  // Debug: Log component mounting
  console.log('🔍 OAuthCallback component mounted - v6 - FIXED');
  console.log('🔍 Current URL:', window.location.href);
  console.log('🔍 Search params:', window.location.search);

  useEffect(() => {
    console.log('🔍 useEffect triggered - OAuth callback starting');
    const handleOAuthCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        console.log('🔍 OAuth parameters:', { 
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
          console.log('🔍 Parsed state data:', stateData);
        } catch (e) {
          throw new Error('Invalid state parameter');
        }

        const platform = stateData.platform;
        console.log('🔍 Detected platform:', platform);

        if (platform === 'googleSheets') {
          // Handle Google Sheets OAuth (WORKING PATTERN)
          console.log('🔍 Processing Google Sheets OAuth');
          await GoogleSheetsOAuthService.handleSheetsAuthCallback(code, state);
          
          // Verify the tokens were actually saved to the database
          const integration = await IntegrationService.getIntegration('googleSheets');
          if (!integration?.config?.connected || !integration?.config?.tokens?.accessToken) {
            throw new Error('Failed to save Google Sheets tokens to database');
          }
          
          setStatus('success');
          setMessage('Successfully connected to Google Sheets!');
        } else if (platform === 'google' && stateData.scope?.includes('adwords')) {
          // Handle Google Ads OAuth (USER-SPECIFIC)
          console.log('🔍 Processing Google Ads OAuth (user-specific)');
          const userId = stateData.userId || 'default-user';
          
          const userAuth = await UserGoogleAdsService.handleUserAuthCallback(code, state, userId);
          console.log('🔍 User auth completed:', { 
            hasAccessToken: !!userAuth.accessToken,
            hasRefreshToken: !!userAuth.refreshToken,
            googleUserId: userAuth.googleUserId
          });

          // Save tokens to integrations table so the app sees the connection
          const oauthTokens: OAuthTokens = {
            accessToken: userAuth.accessToken,
            refreshToken: userAuth.refreshToken,
            tokenExpiresAt: userAuth.tokenExpiresAt,
            tokenType: 'Bearer',
            scope: Array.isArray(userAuth.scope) ? userAuth.scope.join(' ') : userAuth.scope
          };

          const accountInfo: AccountInfo = {
            accountId: userAuth.googleUserId,
            accountName: userAuth.googleUserEmail || 'Google Ads User',
            accountEmail: userAuth.googleUserEmail,
            accountType: 'personal'
          };

          const metadata: PlatformMetadata = {
            googleUserId: userAuth.googleUserId,
            googleUserEmail: userAuth.googleUserEmail,
            googleUserName: userAuth.googleUserName
          };

          await IntegrationService.saveOAuthTokens('googleAds', oauthTokens, accountInfo, metadata);
          console.log('🔍 Saved Google Ads tokens to integrations table');

          setStatus('success');
          setMessage('Successfully connected to Google Ads!');
        } else {
          // Handle other platforms using OAuthService
          console.log('🔍 Processing generic OAuth for platform:', platform);
          const integrationPlatform = (stateData.integrationPlatform || platform) as IntegrationPlatform;
          // Use the original platform for OAuthService (not integrationPlatform) to match code verifier storage
          // OAuthService.exchangeCodeForTokens() already stores tokens via TokenManager
          await OAuthService.exchangeCodeForTokens(platform, code, state);
          setStatus('success');
          setMessage(`Successfully connected to ${platform}!`);
        }

        // Redirect to admin panel after 2 seconds
        setTimeout(() => {
          navigate('/admin');
        }, 2000);

      } catch (error) {
        console.error('🔍 OAuth callback error:', error);
        debugLogger.error('OAuthCallback', 'OAuth callback failed', error);
        
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Authentication failed');
        
        // Add more detailed error information
        if (error instanceof Error) {
          console.error('🔍 Error details:', {
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
              <p className="text-sm text-green-600">Redirecting to admin panel...</p>
            )}
            {status === 'error' && (
              <button
                onClick={() => navigate('/admin')}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Go to Admin Panel
              </button>
            )}
          </CardContent>
        </Card>
      </div>
    </IntegrationErrorBoundary>
  );
};

export default OAuthCallback;