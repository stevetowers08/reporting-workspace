// GoHighLevel OAuth Service - Handles OAuth 2.0 flow and token management
import { debugLogger } from '@/lib/debug';
import { supabase } from '@/lib/supabase';

export interface GHLTokenData {
  access_token: string;
  refresh_token?: string;
  locationId: string;
  locationName?: string;
  scope?: string;
  expires_in?: number;
  userType?: string;
  companyId?: string;
}

export interface GHLLocationTokenRequest {
  companyId: string;
  locationId: string;
}

export interface GHLLocationTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  locationId: string;
  companyId: string;
}

export class GHLOAuthService {
  /**
   * Generate PKCE code verifier and challenge
   */
  private static generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, Array.from(array)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  private static async generateCodeChallenge(codeVerifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(digest))))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Generate state parameter for CSRF protection
   */
  private static generateState(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, Array.from(array)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Validate state parameter to prevent CSRF attacks
   */
  private static validateState(receivedState: string, expectedState: string): boolean {
    if (!receivedState || !expectedState) {
      return false;
    }
    return receivedState === expectedState;
  }

  /**
   * Get default scopes for GoHighLevel OAuth
   * Based on GoHighLevel OAuth 2.0 documentation requirements
   */
  static getDefaultScopes(): string[] {
    return [
      'contacts.readonly',
      'opportunities.readonly',
      'calendars.readonly',
      'calendars/events.readonly',
      'funnels/funnel.readonly',
      'funnels/page.readonly',
      'funnels/pagecount.readonly',
      'funnels/redirect.readonly',
      'locations.readonly',
      'oauth.readonly'
    ];
  }

  /**
   * Generate OAuth authorization URL with state parameter (no PKCE)
   * Updated to use standard GoHighLevel OAuth flow
   */
  static async getAuthorizationUrl(clientId: string, redirectUri: string, scopes: string[] = [], targetClientId?: string): Promise<string> {
    const baseUrl = 'https://marketplace.leadconnectorhq.com/oauth/chooselocation';
    
    // Use default scopes if none provided
    const finalScopes = scopes.length > 0 ? scopes : this.getDefaultScopes();
    
    // Generate state parameter for CSRF protection
    const state = this.generateState();
    
    // Store state for later validation along with targetClientId
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('oauth_state_goHighLevel', state);
      if (targetClientId) {
        window.sessionStorage.setItem(`ghl_oauth_client_id_${state}`, targetClientId);
      }
    }
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: finalScopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state: state
    });

    debugLogger.info('GHLOAuthService', 'Generated authorization URL', {
      baseUrl,
      redirectUri,
      scopes: finalScopes.join(' '),
      state: state.substring(0, 10) + '...',
      targetClientId: targetClientId || 'none'
    });

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Save location token to database
   */
  static async saveLocationToken(
    locationId: string,
    accessToken: string,
    scopes: string[] = [],
    refreshToken?: string,
    expiresIn?: number
  ): Promise<boolean> {
    try {
      debugLogger.info('GHLOAuthService', 'Starting database save operation', {
        locationId,
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        expiresIn,
        scopesCount: scopes.length
      });

      // Test basic database connection first
      debugLogger.info('GHLOAuthService', 'Testing database connection...');
      const { data: testData, error: testError } = await supabase
        .from('integrations')
        .select('count')
        .limit(1);
      
      if (testError) {
        debugLogger.error('GHLOAuthService', 'Database connection test failed', testError);
        throw new Error(`Database connection failed: ${testError.message}`);
      }
      
      debugLogger.info('GHLOAuthService', 'Database connection test passed', { testData });

      // Check for existing GoHighLevel integrations
      debugLogger.info('GHLOAuthService', 'Checking for existing GoHighLevel integrations...');
      const { data: existingData, error: existingError } = await supabase
        .from('integrations')
        .select('*')
        .eq('platform', 'goHighLevel');
      
      if (existingError) {
        debugLogger.error('GHLOAuthService', 'Failed to check existing integrations', existingError);
      } else {
        debugLogger.info('GHLOAuthService', 'Existing GoHighLevel integrations found', {
          count: existingData?.length || 0,
          existing: existingData?.map(item => ({
            id: item.id,
            account_id: item.account_id,
            connected: item.connected,
            hasConfig: !!item.config
          }))
        });
      }

      // Extract and store the sourceId (full client_id) from the token for refresh
      let oauthClientId: string | undefined;
      try {
        const tokenParts = accessToken.split('.');
        if (tokenParts.length === 3) {
          // Browser-compatible base64 decoding
          const base64Url = tokenParts[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(
            atob(base64)
              .split('')
              .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          );
          const payload = JSON.parse(jsonPayload);
          // Use sourceId (full client_id) if available, otherwise fall back to oauthMeta.client (base)
          oauthClientId = payload.sourceId || payload.oauthMeta?.client;
        }
      } catch {
        // If we can't parse, continue without oauthClientId
      }

      // Calculate expiresAt timestamp
      const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : undefined;

      // Prepare the data for upsert
      const upsertData = {
        platform: 'goHighLevel',
        account_id: locationId,
        account_name: 'GoHighLevel Location',
        connected: true,
        config: {
          tokens: {
            accessToken: accessToken,
            refreshToken: refreshToken,
            tokenType: 'Bearer',
            scope: scopes.join(' '),
            oauthClientId, // Store the sourceId (full client_id) that issued this token
            expiresAt, // Store in tokens for consistency with goHighLevelApiService
            expiresIn // Also store expiresIn for reference
          },
          accountInfo: {
            id: locationId,
            name: 'GoHighLevel Location'
          },
          locationId: locationId,
          lastSync: new Date().toISOString(),
          syncStatus: 'idle',
          connectedAt: new Date().toISOString(),
          expiresAt // Also store at config level for backward compatibility
        }
      };

      debugLogger.info('GHLOAuthService', 'About to upsert integration data', {
        platform: upsertData.platform,
        account_id: upsertData.account_id,
        account_name: upsertData.account_name,
        connected: upsertData.connected,
        configSize: JSON.stringify(upsertData.config).length
      });

      // Perform the upsert operation
      const { data: upsertResult, error: upsertError } = await supabase
        .from('integrations')
        .upsert(upsertData, {
          onConflict: 'platform,account_id'
        })
        .select();

      if (upsertError) {
        debugLogger.error('GHLOAuthService', 'Database upsert failed', {
          error: upsertError,
          errorMessage: upsertError.message,
          errorCode: upsertError.code,
          errorDetails: upsertError.details,
          errorHint: upsertError.hint,
          upsertData: {
            platform: upsertData.platform,
            account_id: upsertData.account_id,
            account_name: upsertData.account_name,
            connected: upsertData.connected
          }
        });
        throw new Error(`Database upsert failed: ${upsertError.message}`);
      }

      debugLogger.info('GHLOAuthService', 'Database upsert successful', {
        result: upsertResult,
        locationId
      });

      return true;
    } catch (error) {
      debugLogger.error('GHLOAuthService', 'Database save operation failed', {
        error: error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : 'No stack trace',
        locationId
      });
      return false;
    }
  }

  /**
   * Exchange authorization code for access token using standard OAuth
   * Updated to match GoHighLevel OAuth 2.0 requirements (no PKCE)
   */
  static async exchangeCodeForToken(
    code: string,
    clientId: string,
    redirectUri: string,
    state?: string
  ): Promise<GHLTokenData> {
    // Get expected state for validation
    const expectedState = typeof window !== 'undefined'
      ? window.sessionStorage.getItem('oauth_state_goHighLevel')
      : null;

    // Validate state parameter if provided
    if (state && expectedState && !this.validateState(state, expectedState)) {
      throw new Error('Invalid state parameter - potential CSRF attack detected.');
    }

    // Get client secret from environment
    const clientSecret = import.meta.env.VITE_GHL_CLIENT_SECRET;
    if (!clientSecret) {
      throw new Error('GoHighLevel client secret not configured');
    }

    // Validate all required parameters before making request
    if (!clientId || clientId.trim() === '') {
      throw new Error('client_id is required and cannot be empty');
    }
    if (!clientSecret || clientSecret.trim() === '') {
      throw new Error('client_secret is required and cannot be empty');
    }
    if (!code || code.trim() === '') {
      throw new Error('authorization code is required and cannot be empty');
    }
    if (!redirectUri || redirectUri.trim() === '') {
      throw new Error('redirect_uri is required and cannot be empty');
    }

    // Debug: Log the exact request body being sent (for debugging 422 errors)
    const requestBody = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code: code,
      user_type: 'Location',
      redirect_uri: redirectUri
    });
    
    debugLogger.info('GHLOAuthService', 'Token Exchange Request Details', {
      url: 'https://services.leadconnectorhq.com/oauth/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Version': '2021-07-28'
      },
      body: {
        client_id: clientId ? clientId.substring(0, 10) + '...' : 'MISSING',
        client_secret: clientSecret ? '***' : 'MISSING',
        grant_type: 'authorization_code',
        code: code ? code.substring(0, 10) + '...' : 'MISSING',
        user_type: 'Location',
        redirect_uri: redirectUri
      }
    });
    
    debugLogger.info('GHLOAuthService', 'Exact request body being sent', {
      bodyString: requestBody.toString(),
      bodySize: requestBody.toString().length,
      hasClientId: requestBody.has('client_id'),
      hasClientSecret: requestBody.has('client_secret'),
      hasGrantType: requestBody.has('grant_type'),
      hasCode: requestBody.has('code'),
      hasUserType: requestBody.has('user_type'),
      hasRedirectUri: requestBody.has('redirect_uri')
    });

    // Use form-encoded format as per GoHighLevel OAuth 2.0 specification
    const response = await fetch('https://services.leadconnectorhq.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Version': '2021-07-28', // Required by GoHighLevel API
      },
      body: requestBody
    });

        if (!response.ok) {
          let errorData = {};
          let errorText = '';

          try {
            errorText = await response.text();
            errorData = JSON.parse(errorText);
          } catch (_e) {
            // Response is not JSON, use text as error message
            errorData = { error: errorText || response.statusText };
          }

          const errorMessage = errorData.error || errorData.message || `Token exchange failed: ${response.statusText}`;

          // Enhanced error logging for 422 debugging
          debugLogger.error('GHLOAuthService', 'Token exchange failed', {
            status: response.status,
            statusText: response.statusText,
            errorData,
            errorText,
            requestParams: {
              client_id: clientId,
              client_secret: clientSecret ? '***' : 'MISSING',
              grant_type: 'authorization_code',
              code: code ? '***' : 'MISSING',
              user_type: 'Location',
              redirect_uri: redirectUri
            },
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Version': '2021-07-28'
            },
            endpoint: 'https://services.leadconnectorhq.com/oauth/token'
          });

          // Log the actual request body for debugging (masked)
          debugLogger.error('GHLOAuthService', 'Request body (masked)', {
            body: requestBody.toString().replace(/client_secret=[^&]+/, 'client_secret=***').replace(/code=[^&]+/, 'code=***')
          });

          throw new Error(`GoHighLevel OAuth Error (${response.status}): ${errorMessage}`);
        }

    const tokenData = await response.json();
    
    if (!tokenData.access_token) {
      throw new Error('No access token received from GoHighLevel');
    }

    if (!tokenData.locationId) {
      throw new Error('No location ID received from GoHighLevel');
    }

    debugLogger.info('GHLOAuthService', 'Token exchange successful', {
      locationId: tokenData.locationId,
      hasRefreshToken: !!tokenData.refresh_token,
      expiresIn: tokenData.expires_in
    });

    return tokenData;
  }

  /**
   * Refresh access token using refresh token
   * Updated to match GoHighLevel OAuth 2.0 requirements
   */
  static async refreshAccessToken(refreshToken: string, clientId: string): Promise<GHLTokenData> {
    // Get client secret from environment
    const clientSecret = import.meta.env.VITE_GHL_CLIENT_SECRET;
    if (!clientSecret) {
      throw new Error('GoHighLevel client secret not configured');
    }

    // Use form-encoded format as per GoHighLevel documentation for refresh
    const response = await fetch('https://services.leadconnectorhq.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Version': '2021-07-28', // Required by GoHighLevel API
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId, // Official GoHighLevel docs specify client_id
        client_secret: clientSecret,
        user_type: 'Location'
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || errorData.message || `Token refresh failed: ${response.statusText}`;
      throw new Error(errorMessage);
    }

    const tokenData = await response.json();
    
    if (!tokenData.access_token) {
      throw new Error('No access token received from GoHighLevel refresh');
    }

    debugLogger.info('GHLOAuthService', 'Token refresh successful', {
      hasRefreshToken: !!tokenData.refresh_token,
      expiresIn: tokenData.expires_in
    });

    return tokenData;
  }

  /**
   * Create location-level access token from agency-level token
   * Based on GoHighLevel OAuth 2.0 documentation
   */
  static async createLocationToken(
    agencyAccessToken: string,
    companyId: string,
    locationId: string
  ): Promise<GHLLocationTokenResponse> {
    const response = await fetch('https://services.leadconnectorhq.com/oauth/locationToken', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${agencyAccessToken}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        companyId: companyId,
        locationId: locationId
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || errorData.message || `Location token creation failed: ${response.statusText}`;
      throw new Error(errorMessage);
    }

    const tokenData = await response.json();
    
    if (!tokenData.access_token) {
      throw new Error('No access token received from GoHighLevel location token endpoint');
    }

    debugLogger.info('GHLOAuthService', 'Location token created successfully', {
      locationId: tokenData.locationId,
      companyId: tokenData.companyId,
      expiresIn: tokenData.expires_in
    });

    return tokenData;
  }

  /**
   * Check if token needs refresh and refresh if necessary
   */
  static async getValidToken(locationId: string): Promise<string | null> {
    try {
      const { data: integration } = await supabase
        .from('integrations')
        .select('config')
        .eq('platform', 'goHighLevel')
        .eq('account_id', locationId)
        .single();

      if (!integration?.config?.tokens) {
        return null;
      }

      const tokens = integration.config.tokens;
      const expiresAt = integration.config.expiresAt;
      
      // Check if token is expired or expires soon (5 minute buffer)
      if (expiresAt) {
        const expiryTime = new Date(expiresAt);
        const now = new Date();
        const bufferTime = 5 * 60 * 1000; // 5 minutes
        
        if (expiryTime.getTime() - now.getTime() < bufferTime) {
          // Token expires soon, try to refresh
          if (tokens.refreshToken) {
            const clientId = import.meta.env.VITE_GHL_CLIENT_ID;
            if (clientId) {
              const refreshedToken = await this.refreshAccessToken(tokens.refreshToken, clientId);
              
              // Update database with new token
              await this.saveLocationToken(locationId, refreshedToken.access_token);
              
              return refreshedToken.access_token;
            }
          }
        }
      }

      return tokens.accessToken;
    } catch (error) {
      debugLogger.error('GHLOAuthService', 'Error getting valid token', error);
      return null;
    }
  }
}
