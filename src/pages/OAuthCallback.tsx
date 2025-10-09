import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { debugLogger } from '@/lib/debug';
import { GoogleSheetsOAuthService } from '@/services/auth/googleSheetsOAuthService';
import { OAuthService } from '@/services/auth/oauthService';
import { TokenManager } from '@/services/auth/TokenManager';

const OAuthCallback: React.FC = () => {
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
        const platform = searchParams.get('platform') || 'googleSheets';

        debugLogger.debug('🔍 OAuth Callback received:', {
          hasCode: !!code,
          hasState: !!state,
          hasError: !!error,
          platform
        });

        if (error) {
          throw new Error(`OAuth error: ${error}`);
        }

        if (!code) {
          throw new Error('No authorization code received');
        }

        if (platform === 'googleSheets') {
          // Handle Google Sheets OAuth (WORKING PATTERN)
          debugLogger.debug('🔍 Processing Google Sheets OAuth');
          await GoogleSheetsOAuthService.handleSheetsAuthCallback(code, state);
          
          // Verify the connection was successful
          const isConnected = await GoogleSheetsOAuthService.getSheetsAuthStatus();
          if (!isConnected) {
            throw new Error('Failed to verify Google Sheets connection');
          }
          
          debugLogger.debug('🔍 Database verification successful!');
          
          setStatus('success');
          setMessage('Successfully connected to Google Sheets!');
        } else if (platform === 'googleAds') {
          // Google Ads uses backend OAuth flow - tokens are already stored by backend
          debugLogger.debug('🔍 Google Ads backend OAuth - tokens already stored');
          navigate('/agency/integrations?googleAds=connected');
          return;
        } else if (platform === 'goHighLevel') {
          // Handle GoHighLevel OAuth
          debugLogger.debug('🔍 Processing GoHighLevel OAuth');
          
          const clientId = import.meta.env.VITE_GHL_CLIENT_ID;
          const clientSecret = import.meta.env.VITE_GHL_CLIENT_SECRET;
          
          if (!clientId || !clientSecret) {
            throw new Error('Missing GoHighLevel OAuth credentials');
          }
          
          const tokens = await OAuthService.exchangeCodeForTokens('goHighLevel', code, state);
          
          await TokenManager.storeOAuthTokens('goHighLevel', tokens, {
            id: 'ghl-user',
            name: 'GoHighLevel User'
          });

          setStatus('success');
          setMessage('Successfully connected to GoHighLevel!');
        } else {
          throw new Error(`Unsupported platform: ${platform}`);
        }

        // Redirect after successful connection
        globalThis.setTimeout(() => {
          navigate('/agency/integrations');
        }, 2000);

      } catch (error) {
        debugLogger.error('🔍 OAuth Callback Error:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'OAuth callback failed');
        
        // Redirect to integrations page after error
        globalThis.setTimeout(() => {
          navigate('/agency/integrations');
        }, 3000);
      }
    };

    handleOAuthCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Processing OAuth...</h2>
              <p className="text-gray-600">Please wait while we complete the authentication.</p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <div className="text-green-600 text-6xl mb-4">✅</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Success!</h2>
              <p className="text-gray-600">{message}</p>
              <p className="text-sm text-gray-500 mt-2">Redirecting to integrations...</p>
            </>
          )}
          
          {status === 'error' && (
            <>
              <div className="text-red-600 text-6xl mb-4">❌</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
              <p className="text-gray-600">{message}</p>
              <p className="text-sm text-gray-500 mt-2">Redirecting to integrations...</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OAuthCallback;