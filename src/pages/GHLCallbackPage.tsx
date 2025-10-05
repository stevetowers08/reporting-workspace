import { debugLogger } from '@/lib/debug';
import { GoHighLevelService } from '@/services/api/goHighLevelService';
import { DatabaseService } from '@/services/data/databaseService';
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export const GHLCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('GHL Callback - Starting OAuth callback processing');
        const code = searchParams.get('code');
        const locationId = searchParams.get('locationId');
        const errorParam = searchParams.get('error');
        const state = searchParams.get('state');

        console.log('GHL Callback - URL parameters:', { code, locationId, errorParam, state });

        debugLogger.info('GHLCallbackPage', 'Processing OAuth callback', {
          hasCode: !!code,
          locationId,
          hasError: !!errorParam,
          hasState: !!state
        });

        if (errorParam) {
          throw new Error(`OAuth error: ${errorParam}`);
        }

        if (!code) {
          throw new Error('Authorization code not found in callback');
        }

        // Note: In a production app, you should validate the state parameter
        // against the one you generated during authorization
        if (!state) {
          console.warn('GHL Callback - No state parameter received (potential CSRF risk)');
        }

        // Exchange code for token
        console.log('GHL Callback - Starting token exchange', { 
          code: code ? code.substring(0, 10) + '...' : 'MISSING', 
          locationId,
          fullUrl: window.location.href
        });
        const tokenData = await GoHighLevelService.exchangeCodeForToken(code, locationId || undefined);
        
        // Set credentials for future API calls
        GoHighLevelService.setCredentials(tokenData.accessToken, tokenData.locationId);

        // Save connection to database
        await DatabaseService.saveGHLConnection({
          accessToken: tokenData.accessToken,
          refreshToken: tokenData.refreshToken,
          locationId: tokenData.locationId,
          expiresIn: tokenData.expiresIn
        });

        debugLogger.info('GHLCallbackPage', 'Successfully connected to GHL', {
          locationId: tokenData.locationId
        });

        setStatus('success');
        
        // Close the popup window and redirect parent
        if (window.opener) {
          window.opener.postMessage({ type: 'GHL_CONNECTED', success: true }, '*');
          window.close();
        } else {
          // Fallback: redirect to integrations page
          window.setTimeout(() => {
            navigate('/integrations');
          }, 2000);
        }

      } catch (error) {
        console.error('GHL Callback - Error details:', error);
        debugLogger.error('GHLCallbackPage', 'Failed to process OAuth callback', error);
        setError(error instanceof Error ? error.message : 'Unknown error occurred');
        setStatus('error');
        
        // Close the popup window and notify parent
        if (window.opener) {
          window.opener.postMessage({ type: 'GHL_CONNECTED', success: false, error: error instanceof Error ? error.message : 'Unknown error' }, '*');
          window.close();
        } else {
          // Fallback: redirect to integrations page
          window.setTimeout(() => {
            navigate('/integrations');
          }, 3000);
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
            <button
              onClick={() => window.close()}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Close Window
            </button>
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