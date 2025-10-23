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
   * Generate OAuth authorization URL with PKCE and state parameter
   */
  static async getAuthorizationUrl(clientId: string, redirectUri: string, scopes: string[] = []): Promise<string> {
    const baseUrl = 'https://marketplace.leadconnectorhq.com/oauth/chooselocation';
    
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
      scope: scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state: state
    });

    debugLogger.info('SimpleGHLService', 'Generated authorization URL with PKCE', {
      baseUrl,
      redirectUri,
      scopes: scopes.join(' '),
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

    const response = await fetch('https://services.leadconnectorhq.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        redirect_uri: redirectUri,
        user_type: 'Location',
        code_verifier: codeVerifier
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || errorData.message || `Token exchange failed: ${response.statusText}`;
      throw new Error(errorMessage);
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
      hasRefreshToken: !!tokenData.refresh_token
    });

    return tokenData;
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshAccessToken(refreshToken: string, clientId: string): Promise<GHLTokenData> {
    const response = await fetch('https://services.leadconnectorhq.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId
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
      hasRefreshToken: !!tokenData.refresh_token
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
