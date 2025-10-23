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
   * Generate OAuth authorization URL with PKCE
   */
  static async getAuthorizationUrl(clientId: string, redirectUri: string, scopes: string[] = []): Promise<string> {
    const baseUrl = 'https://marketplace.leadconnectorhq.com/oauth/chooselocation';
    
    // Generate PKCE code verifier and challenge
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);
    
    // Store code verifier for later use
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('oauth_code_verifier_goHighLevel', codeVerifier);
    }
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
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
    scopes: string[] = []
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
            connectedAt: new Date().toISOString()
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
    redirectUri: string
  ): Promise<GHLTokenData> {
    // Get PKCE code verifier
    const codeVerifier = typeof window !== 'undefined' 
      ? window.sessionStorage.getItem('oauth_code_verifier_goHighLevel')
      : null;

    if (!codeVerifier) {
      throw new Error('Code verifier not found. Please try connecting again.');
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
}
