import { debugLogger } from '@/lib/debug';
import { SimpleGHLService } from '@/services/ghl/simpleGHLService';
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export const GHLCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  // Debug logging
  debugLogger.info('GHLCallbackPage', 'Component loaded', {
    url: window.location.href,
    searchParams: Object.fromEntries(searchParams.entries())
  });

  useEffect(() => {
    const handleCallback = async () => {
      try {
        debugLogger.info('GHLCallbackPage', 'Starting OAuth callback processing');
        
        // Log full URL and all search parameters for debugging
        debugLogger.info('GHLCallbackPage', 'Full URL and parameters', {
          fullUrl: window.location.href,
          search: window.location.search,
          hash: window.location.hash,
          allSearchParams: Object.fromEntries(searchParams.entries())
        });
        
        const code = searchParams.get('code');
        
        // Check for authorization code in multiple possible locations
        let authCode = code;
        
        // Fallback: check if code is in hash instead of query params
        if (!authCode && window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          authCode = hashParams.get('code');
          debugLogger.info('GHLCallbackPage', 'Found code in hash', { authCode: authCode ? authCode.substring(0, 10) + '...' : 'none' });
        }
        
        // Fallback: check if code is in different parameter name
        if (!authCode) {
          authCode = searchParams.get('authorization_code') || searchParams.get('auth_code');
          debugLogger.info('GHLCallbackPage', 'Checked alternative code parameters', { authCode: authCode ? authCode.substring(0, 10) + '...' : 'none' });
        }
        const locationId = searchParams.get('locationId');
        const errorParam = searchParams.get('error');
        const state = searchParams.get('state');
        const success = searchParams.get('success');
        const locationName = searchParams.get('location_name');

        debugLogger.info('GHLCallbackPage', 'URL parameters', { 
          code: authCode ? authCode.substring(0, 10) + '...' : 'MISSING', 
          locationId, 
          errorParam, 
          state, 
          success, 
          locationName 
        });

        // Handle success redirect from API endpoint
        if (success === 'true' && locationId) {
          debugLogger.info('GHLCallbackPage', 'Processing success redirect from API');
          
          setStatus('success');
          
          // Send success message to parent window and close popup
          if (window.opener) {
            window.opener.postMessage({
              type: 'GHL_OAUTH_SUCCESS',
              success: true,
              locationId: locationId,
              locationName: locationName || 'GoHighLevel Location'
            }, window.location.origin);
            
            // Close the popup after a short delay to show success message
            setTimeout(() => {
              window.close();
            }, 1000);
          } else {
            // Fallback: redirect to agency panel
            navigate('/agency');
          }
          return;
        }

        debugLogger.info('GHLCallbackPage', 'Processing OAuth callback', {
          hasCode: !!code,
          locationId,
          hasError: !!errorParam,
          hasState: !!state
        });

        if (errorParam) {
          throw new Error(`OAuth error: ${errorParam}`);
        }

        if (!authCode) {
          // Enhanced error logging for debugging
          debugLogger.error('GHLCallbackPage', 'Authorization code missing', {
            fullUrl: window.location.href,
            searchParams: Object.fromEntries(searchParams.entries()),
            hasCode: !!authCode,
            hasError: !!errorParam,
            errorParam,
            allParams: Array.from(searchParams.keys()),
            hash: window.location.hash
          });
          throw new Error('Authorization code not found in callback. Please check the GoHighLevel OAuth app redirect URI configuration.');
        }

        // Note: In a production app, you should validate the state parameter
        // against the one you generated during authorization
        if (!state) {
          debugLogger.warn('GHLCallbackPage', 'No state parameter received (potential CSRF risk)');
        }

        // Exchange code for token directly
        debugLogger.info('GHLCallbackPage', 'Starting token exchange', { 
          code: authCode ? authCode.substring(0, 10) + '...' : 'MISSING', 
          locationId,
          fullUrl: window.location.href
        });
        
        debugLogger.info('GHLCallbackPage', 'OAuth Callback Debug - Step 1: Code received', { code: code?.substring(0, 10) + '...' });
        debugLogger.info('GHLCallbackPage', 'OAuth Callback Debug - Step 2: State received', { state: state?.substring(0, 10) + '...' });
        
        // Check session storage for state validation
        const expectedState = typeof window !== 'undefined'
          ? window.sessionStorage.getItem('oauth_state_goHighLevel')
          : null;
          
        debugLogger.info('GHLCallbackPage', 'OAuth Callback Debug - Step 3: Expected state', { 
          expectedState: expectedState ? expectedState.substring(0, 10) + '...' : 'MISSING' 
        });
        debugLogger.info('GHLCallbackPage', 'OAuth Callback Debug - Step 4: State validation', { 
          isValid: state === expectedState ? 'VALID' : 'INVALID' 
        });
        
        const clientId = import.meta.env.VITE_GHL_CLIENT_ID;
        const redirectUri = import.meta.env.VITE_GHL_REDIRECT_URI || 
          (window.location.hostname === 'localhost'
            ? `${window.location.origin}/oauth/callback`
            : 'https://reporting.tulenagency.com/oauth/callback');
        
        if (!clientId) {
          throw new Error('Missing OAuth credentials. Please set VITE_GHL_CLIENT_ID in .env.local');
        }
        
        debugLogger.info('GHLCallbackPage', 'OAuth Callback Debug - Step 5: About to make token exchange request');
        debugLogger.info('GHLCallbackPage', 'OAuth Callback Debug - Step 6: Client ID', { clientId: clientId ? clientId.substring(0, 10) + '...' : 'MISSING' });
        debugLogger.info('GHLCallbackPage', 'OAuth Callback Debug - Step 7: Redirect URI', { redirectUri });
        
        try {
          // Exchange code for token using standard OAuth
          const tokenData = await SimpleGHLService.exchangeCodeForToken(
            authCode,
            clientId,
            redirectUri,
            state
          );
          
          debugLogger.info('GHLCallbackPage', 'OAuth Callback Debug - Step 8: Token exchange SUCCESS!');
          debugLogger.info('GHLCallbackPage', 'OAuth Callback Debug - Step 9: Token data received', {
            locationId: tokenData.locationId,
            hasAccessToken: !!tokenData.access_token,
            hasRefreshToken: !!tokenData.refresh_token,
            expiresIn: tokenData.expires_in
          });
          
          // Save token to database
          debugLogger.info('GHLCallbackPage', 'OAuth Callback Debug - Step 10: About to save to database');
          const saveSuccess = await SimpleGHLService.saveLocationToken(
            tokenData.locationId,
            tokenData.access_token,
            tokenData.scope ? tokenData.scope.split(' ') : [],
            tokenData.refresh_token,
            tokenData.expires_in
          );
          
          debugLogger.info('GHLCallbackPage', 'OAuth Callback Debug - Step 11: Database save result', { saveSuccess });
          
          if (!saveSuccess) {
            throw new Error('Failed to save GoHighLevel token to database');
          }
          
          debugLogger.info('GHLCallbackPage', 'OAuth Callback Debug - Step 12: COMPLETE SUCCESS!');
          
          setStatus('success');
          
          // Send success message to parent window and close popup
          if (window.opener) {
            window.opener.postMessage({
              type: 'GHL_OAUTH_SUCCESS',
              success: true,
              locationId: tokenData.locationId,
              locationName: tokenData.locationName || 'GoHighLevel Location'
            }, window.location.origin);
          
          // Close the popup after a short delay to show success message
          setTimeout(() => {
            window.close();
          }, 1000);
        } else {
          // Fallback: redirect to agency panel
          navigate('/agency');
        }
        
      } catch (error) {
        // Determine if this is an OAuth error or database error
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        const isOAuthError = errorMessage.includes('OAuth') || errorMessage.includes('token exchange') || errorMessage.includes('422');
        const isDatabaseError = errorMessage.includes('database') || errorMessage.includes('upsert') || errorMessage.includes('supabase');
        
        debugLogger.error('GHLCallbackPage', 'OAuth Callback Debug - Operation FAILED', {
          errorType: isOAuthError ? 'OAUTH_ERROR' : isDatabaseError ? 'DATABASE_ERROR' : 'UNKNOWN_ERROR',
          errorMessage,
          errorStack: error instanceof Error ? error.stack : 'No stack trace',
          isOAuthError,
          isDatabaseError
        });
        
        debugLogger.error('GHLCallbackPage', 'Error details', error);
        debugLogger.error('GHLCallbackPage', 'Error stack', error instanceof Error ? error.stack : 'No stack trace');
        debugLogger.error('GHLCallbackPage', 'Failed to process OAuth callback', error);
        
        setError(errorMessage);
        setStatus('error');
        
        // Don't auto-close on error - let user see the error message
        debugLogger.info('GHLCallbackPage', 'Error displayed, window will not auto-close');
        
        // Notify parent window but don't close immediately
        if (window.opener) {
          window.opener.postMessage({ type: 'GHL_OAUTH_ERROR', success: false, error: errorMessage }, window.location.origin);
        }
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Connecting to Go High Level...
            </h2>
            <p className="text-gray-600">
              Please wait while we complete the connection.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <div className="rounded-full h-12 w-12 bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Connection Failed
            </h2>
            <p className="text-gray-600 mb-4">
              {error || 'An error occurred while connecting to Go High Level.'}
            </p>
            <div className="space-x-3">
              <button
                onClick={() => window.close()}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
              >
                Close Window
              </button>
              <button
                onClick={() => {
                  // Retry by reloading the page
                  window.location.reload();
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <div className="rounded-full h-12 w-12 bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Successfully Connected!
          </h2>
          <p className="text-gray-600 mb-4">
            Your Go High Level account has been connected successfully.
          </p>
          <p className="text-sm text-gray-500">
            This window will close automatically...
          </p>
        </div>
      </div>
    </div>
  );
};