import { debugLogger } from '@/lib/debug';
import { FacebookAdsService } from '@/services/api/facebookAdsService';
import { FacebookTokenService } from '@/services/auth/facebookTokenService';
import React, { useEffect, useState } from 'react';

interface TokenInfo {
  hasBusinessManagement: boolean;
  scopes: string[];
}

const FacebookDebugPanel: React.FC = () => {
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkTokenScopes = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const info = await FacebookAdsService.validateTokenScopes();
      setTokenInfo(info);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const testBusinessEndpoint = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Test authentication first
      const isValid = await FacebookAdsService.authenticate();
      if (!isValid) {
        throw new Error('Authentication failed');
      }

      // Get stored tokens from database
      const tokens = await FacebookTokenService.getTokens();
      if (!tokens) {
        throw new Error('No stored tokens found');
      }
      
      const token = tokens.accessToken;
      
      if (!token) {
        throw new Error('No access token found');
      }

      const response = await fetch(
        `https://graph.facebook.com/v22.0/me/businesses?fields=id,name&access_token=${token}`
      );
      
      if (response.ok) {
        const data = await response.json();
        debugLogger.debug('FacebookDebugPanel', 'Business endpoint success', data);
        setError(null);
      } else {
        const errorData = await response.json();
        debugLogger.error('FacebookDebugPanel', 'Business endpoint error', errorData);
        setError(`HTTP ${response.status}: ${errorData.error?.message || response.statusText}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkTokenScopes();
  }, []);

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">Facebook API Debug Panel</h3>
      
      <div className="space-y-4">
        <div>
          <h4 className="font-medium mb-2">Token Scope Validation</h4>
          {loading ? (
            <p className="text-gray-500">Checking...</p>
          ) : tokenInfo ? (
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-medium">Business Management:</span>{' '}
                <span className={tokenInfo.hasBusinessManagement ? 'text-green-600' : 'text-red-600'}>
                  {tokenInfo.hasBusinessManagement ? 'Available' : 'Not Available'}
                </span>
              </p>
              <p className="text-sm">
                <span className="font-medium">Scopes:</span>{' '}
                <span className="text-gray-600">{tokenInfo.scopes.join(', ')}</span>
              </p>
            </div>
          ) : (
            <p className="text-gray-500">No token info available</p>
          )}
        </div>

        <div>
          <h4 className="font-medium mb-2">API Endpoint Tests</h4>
          <div className="space-y-2">
            <button
              onClick={testBusinessEndpoint}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              Test /me/businesses Endpoint
            </button>
            <button
              onClick={checkTokenScopes}
              disabled={loading}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 ml-2"
            >
              Recheck Token Scopes
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded">
            <h5 className="font-medium text-red-800 mb-1">Error:</h5>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <div className="mt-6 p-4 bg-gray-50 rounded">
          <h5 className="font-medium mb-2">Common Solutions:</h5>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• Ensure your Facebook app has <code>business_management</code> permission</li>
            <li>• Check if the user granted all required permissions during OAuth</li>
            <li>• Verify the access token hasn't expired</li>
            <li>• For production apps, business_management requires Facebook app review</li>
            <li>• Try re-authenticating to get fresh permissions</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default FacebookDebugPanel;
