import { GoogleAdsManagerModal } from '@/components/modals/GoogleAdsManagerModal';
import { debugLogger } from '@/lib/debug';
import { TokenManager } from '@/services/auth/TokenManager';
import { GoogleSheetsOAuthService } from '@/services/auth/googleSheetsOAuthService';
import { OAuthService } from '@/services/auth/oauthService';
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const OAuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [_platform, setPlatform] = useState<string>('');

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        
        // Parse state to get platform information
        let detectedPlatform = 'googleSheets'; // default fallback
        if (state) {
          try {
            const stateData = JSON.parse(atob(state));
            detectedPlatform = stateData.platform || 'googleSheets';
            debugLogger.debug('🔍 Parsed state data:', stateData);
          } catch (error) {
            debugLogger.warn('🔍 Failed to parse state, using default platform', error);
          }
        }
        
        // Fallback to URL parameter if state parsing fails
        const urlPlatform = searchParams.get('platform');
        if (urlPlatform && detectedPlatform === 'googleSheets') {
          detectedPlatform = urlPlatform;
        }

        debugLogger.debug('🔍 OAuth Callback received:', {
          hasCode: !!code,
          hasState: !!state,
          hasError: !!error,
          platform: detectedPlatform,
          allParams: Object.fromEntries(searchParams.entries()),
          fullUrl: window.location.href
        });

        if (error) {
          throw new Error(`OAuth error: ${error}`);
        }

        if (!code) {
          // For GoHighLevel, check if this is a success redirect from backend API
          if (detectedPlatform === 'goHighLevel') {
            const success = searchParams.get('success');
            const locationId = searchParams.get('location');
            const locationName = searchParams.get('location_name');
            
            if (success === 'true' && locationId) {
              debugLogger.debug('🔍 GoHighLevel success redirect from backend API');
              
              // Send success message to parent window if this is a popup
              if (window.opener && !window.opener.closed) {
                window.opener.postMessage({
                  type: 'GHL_OAUTH_SUCCESS',
                  success: true,
                  locationId: locationId,
                  locationName: locationName || 'GoHighLevel Location',
                  timestamp: Date.now()
                }, window.location.origin);
                
                // Close the popup after a short delay
                setTimeout(() => {
                  window.close();
                }, 1000);
              }
              
              setStatus('success');
              setMessage('Successfully connected to GoHighLevel!');
              return;
            }
          }
          
          throw new Error('No authorization code received');
        }

        if (detectedPlatform === 'googleSheets') {
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
        } else if (detectedPlatform === 'googleAds') {
          // Handle Google Ads OAuth with PKCE (frontend flow)
          debugLogger.debug('🔍 Processing Google Ads OAuth with PKCE');
          
          const tokens = await OAuthService.exchangeCodeForTokens('googleAds', code, state);
          
          await TokenManager.storeOAuthTokens('googleAds', tokens, {
            id: 'google-ads-user',
            name: 'Google Ads User'
          });

          // Show manager account ID input modal
          setPlatform('googleAds');
          setShowManagerModal(true);
          setStatus('success');
          setMessage('Successfully connected to Google Ads! Please configure your manager account ID.');
        } else if (detectedPlatform === 'goHighLevel') {
          // Handle GoHighLevel OAuth - redirect to backend API for token exchange
          debugLogger.debug('🔍 Processing GoHighLevel OAuth - redirecting to backend API');
          
          // Check what parameters GoHighLevel actually sent
          const locationId = searchParams.get('location_id') || searchParams.get('locationId') || searchParams.get('location');
          const clientId = searchParams.get('client_id') || searchParams.get('clientId');
          
          debugLogger.debug('🔍 GoHighLevel parameters:', {
            code: !!code,
            locationId,
            clientId,
            state,
            allParams: Object.fromEntries(searchParams.entries())
          });
          
          // For GoHighLevel, we need to redirect to the backend API endpoint
          // The backend will handle the token exchange and redirect back with success parameters
          const backendUrl = `${window.location.origin}/api/leadconnector/oath?` +
            `code=${encodeURIComponent(code)}&` +
            `state=${encodeURIComponent(state || '')}&` +
            `location_id=${encodeURIComponent(locationId || '')}&` +
            `client_id=${encodeURIComponent(clientId || '')}`;
          
          debugLogger.debug('🔍 Redirecting to backend API:', backendUrl);
          
          // Redirect to backend API
          window.location.href = backendUrl;
          return; // Don't continue with normal processing
        } else {
          throw new Error(`Unsupported platform: ${detectedPlatform}`);
        }

        // Redirect after successful connection (only if not showing manager modal)
        if (!showManagerModal) {
          globalThis.setTimeout(() => {
            navigate('/agency/integrations');
          }, 2000);
        }

      } catch (error) {
        debugLogger.error('🔍 OAuth Callback Error:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'OAuth callback failed');
        
        // If this is a popup window, send error message to parent with enhanced security
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({
            type: 'GHL_OAUTH_ERROR',
            success: false,
            error: error instanceof Error ? error.message : 'OAuth callback failed',
            timestamp: Date.now()
          }, window.location.origin);
          
          // Close the popup after a short delay
          setTimeout(() => {
            window.close();
          }, 2000);
        } else {
          // Redirect to integrations page after error
          globalThis.setTimeout(() => {
            navigate('/agency/integrations');
          }, 3000);
        }
      }
    };

    handleOAuthCallback();
  }, [searchParams, navigate, showManagerModal]);

  const handleManagerModalSuccess = () => {
    setShowManagerModal(false);
    // Redirect after manager account is configured
    globalThis.setTimeout(() => {
      navigate('/agency/integrations');
    }, 1000);
  };

  const handleManagerModalClose = () => {
    setShowManagerModal(false);
    // Still redirect even if user cancels
    globalThis.setTimeout(() => {
      navigate('/agency/integrations');
    }, 1000);
  };

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
      
      {/* Google Ads Manager Account Modal */}
      <GoogleAdsManagerModal
        isOpen={showManagerModal}
        onClose={handleManagerModalClose}
        onSuccess={handleManagerModalSuccess}
      />
    </div>
  );
};

export default OAuthCallback;