// Simple GoHighLevel OAuth Service - Client Only with PKCE
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

export class SimpleGHLService {
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
   * Generate OAuth authorization URL with PKCE and state parameter
   * Updated to use proper GoHighLevel scopes
   */
  static async getAuthorizationUrl(clientId: string, redirectUri: string, scopes: string[] = []): Promise<string> {
    const baseUrl = 'https://marketplace.leadconnectorhq.com/oauth/chooselocation';
    
    // Use default scopes if none provided
    const finalScopes = scopes.length > 0 ? scopes : this.getDefaultScopes();
    
    // Generate PKCE code verifier and challenge
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);
    
    // Generate state parameter for CSRF protection
    const state = this.generateState();
    
    // Store code verifier and state for later validation
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('oauth_code_verifier_goHighLevel', codeVerifier);
      window.sessionStorage.setItem('oauth_state_goHighLevel', state);
    }
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: finalScopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state: state
    });

    debugLogger.info('SimpleGHLService', 'Generated authorization URL with PKCE', {
      baseUrl,
      redirectUri,
      scopes: finalScopes.join(' '),
      hasCodeChallenge: !!codeChallenge
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
      const { error } = await supabase
        .from('integrations')
        .upsert({
          platform: 'goHighLevel',
          account_id: locationId,
          connected: true,
          config: {
            tokens: {
              accessToken: accessToken,
              refreshToken: refreshToken,
              tokenType: 'Bearer',
              scope: scopes.join(' ')
            },
            accountInfo: {
              id: locationId,
              name: 'GoHighLevel Location'
            },
            locationId: locationId,
            lastSync: new Date().toISOString(),
            syncStatus: 'idle',
            connectedAt: new Date().toISOString(),
            expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : undefined
          }
        }, {
          onConflict: 'platform,account_id'
        });

      if (error) {
        debugLogger.error('SimpleGHLService', 'Failed to save token', error);
        return false;
      }

      debugLogger.info('SimpleGHLService', 'Token saved successfully', { locationId });
      return true;
    } catch (error) {
      debugLogger.error('SimpleGHLService', 'Error saving token', error);
      return false;
    }
  }

  /**
   * Exchange authorization code for access token using PKCE
   * Updated to match GoHighLevel OAuth 2.0 requirements
   */
  static async exchangeCodeForToken(
    code: string,
    clientId: string,
    redirectUri: string,
    state?: string
  ): Promise<GHLTokenData> {
    // Get PKCE code verifier and expected state
    const codeVerifier = typeof window !== 'undefined' 
      ? window.sessionStorage.getItem('oauth_code_verifier_goHighLevel')
      : null;
    
    const expectedState = typeof window !== 'undefined'
      ? window.sessionStorage.getItem('oauth_state_goHighLevel')
      : null;

    if (!codeVerifier) {
      throw new Error('Code verifier not found. Please try connecting again.');
    }

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
    if (!codeVerifier || codeVerifier.trim() === '') {
      throw new Error('code_verifier is required for PKCE');
    }

    // Debug: Log the exact request body being sent (for debugging 422 errors)
    const requestBody = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code: code,
      user_type: 'Location',
      redirect_uri: redirectUri,
      code_verifier: codeVerifier
    });
    
    debugLogger.info('SimpleGHLService', 'Exact request body being sent', {
      bodyString: requestBody.toString(),
      bodySize: requestBody.toString().length,
      hasClientId: requestBody.has('client_id'),
      hasClientSecret: requestBody.has('client_secret'),
      hasGrantType: requestBody.has('grant_type'),
      hasCode: requestBody.has('code'),
      hasUserType: requestBody.has('user_type'),
      hasRedirectUri: requestBody.has('redirect_uri'),
      hasCodeVerifier: requestBody.has('code_verifier')
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
          debugLogger.error('SimpleGHLService', 'Token exchange failed', {
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
              redirect_uri: redirectUri,
              code_verifier: codeVerifier ? '***' : 'MISSING'
            },
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Version': '2021-07-28'
            },
            endpoint: 'https://services.leadconnectorhq.com/oauth/token'
          });

          // Log the actual request body for debugging (masked)
          debugLogger.error('SimpleGHLService', 'Request body (masked)', {
            body: requestBody.toString().replace(/client_secret=[^&]+/, 'client_secret=***').replace(/code=[^&]+/, 'code=***').replace(/code_verifier=[^&]+/, 'code_verifier=***')
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

    debugLogger.info('SimpleGHLService', 'Token exchange successful', {
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

    debugLogger.info('SimpleGHLService', 'Token refresh successful', {
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

    debugLogger.info('SimpleGHLService', 'Location token created successfully', {
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
      debugLogger.error('SimpleGHLService', 'Error getting valid token', error);
      return null;
    }
  }
}
