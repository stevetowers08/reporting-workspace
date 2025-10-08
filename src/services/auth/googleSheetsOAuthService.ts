/* eslint-disable no-undef, no-unused-vars, @typescript-eslint/no-unused-vars */
import { debugLogger } from '@/lib/debug';
import { TokenManager } from '@/services/auth/TokenManager';
import { UnifiedIntegrationService } from '@/services/integration/IntegrationService';
import { OAuthTokens } from '@/types/integration';

export interface GoogleSheetsAuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: string;
  scope: string[];
  connectedAt: string;
  lastUsedAt: string;
}

export class GoogleSheetsOAuthService {
  private static readonly GOOGLE_SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile';
  private static readonly GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
  private static readonly GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

  /**
   * Generate PKCE code verifier and challenge
   */
  private static async generatePKCE(): Promise<{ codeVerifier: string; codeChallenge: string }> {
    // Generate verifier (43-128 chars, unreserved)
    const verifier = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
      .slice(0, 128);

    // Generate challenge (S256)
    const challenge = await this.generateChallenge(verifier);
    
    return { codeVerifier: verifier, codeChallenge: challenge };
  }

  /**
   * Generate code challenge from verifier using SHA-256
   */
  private static async generateChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Generate random string for PKCE
   */
  private static generateRandomString(length: number): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return result;
  }

  /**
   * Generate OAuth URL for Google Sheets authentication
   */
  static async generateSheetsAuthUrl(redirectUri?: string): Promise<string> {
    const state = btoa(JSON.stringify({
      platform: 'googleSheets',
      timestamp: Date.now(),
      nonce: Math.random().toString(36).substring(7)
    }));

    // Generate PKCE parameters
    const pkce = await this.generatePKCE();
    
    // Store code verifier for later use
    localStorage.setItem(`oauth_code_verifier_googleSheets`, pkce.codeVerifier);

    const params = new URLSearchParams({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
      redirect_uri: redirectUri || (window.location.hostname === 'localhost' ? `${window.location.origin}/oauth/callback` : 'https://tulenreporting.vercel.app/oauth/callback'),
      response_type: 'code',
      scope: this.GOOGLE_SHEETS_SCOPE,
      access_type: 'offline',
      prompt: 'consent', // Force consent screen to get refresh token
      state: state,
      code_challenge: pkce.codeChallenge,
      code_challenge_method: 'S256'
    });

    return `${this.GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for Google Sheets tokens
   */
  static async handleSheetsAuthCallback(
    code: string,
    _state: string
  ): Promise<GoogleSheetsAuthTokens> {
    try {
      debugLogger.info('GoogleSheetsOAuthService', 'Handling Google Sheets auth callback');

      // Get the code verifier from localStorage
      const codeVerifier = localStorage.getItem(`oauth_code_verifier_googleSheets`);
      if (!codeVerifier) {
        throw new Error('Code verifier not found. Please try connecting again.');
      }

      // Exchange code for tokens
      const tokenResponse = await fetch(this.GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
          client_secret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '',
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: window.location.hostname === 'localhost' ? `${window.location.origin}/oauth/callback` : 'https://tulenreporting.vercel.app/oauth/callback',
          code_verifier: codeVerifier
        })
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        debugLogger.error('GoogleSheetsOAuthService', 'Token exchange failed', { status: tokenResponse.status, error: errorText });
        throw new Error('Failed to exchange authorization code for tokens');
      }

      const tokens = await tokenResponse.json();
      debugLogger.info('GoogleSheetsOAuthService', 'Successfully exchanged code for tokens');

      // Get user info from Google
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`
        }
      });

      if (!userInfoResponse.ok) {
        const errorText = await userInfoResponse.text();
        debugLogger.error('GoogleSheetsOAuthService', 'Failed to get user info from Google', { 
          status: userInfoResponse.status, 
          error: errorText 
        });
        throw new Error(`Failed to get user info from Google: ${userInfoResponse.status} ${errorText}`);
      }

      const userInfo = await userInfoResponse.json();
      debugLogger.info('GoogleSheetsOAuthService', 'Retrieved user info', { email: userInfo.email });

      // Create tokens object
      const sheetsTokens: GoogleSheetsAuthTokens = {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: new Date(Date.now() + (tokens.expires_in * 1000)).toISOString(),
        scope: tokens.scope ? tokens.scope.split(' ') : [this.GOOGLE_SHEETS_SCOPE],
        connectedAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString()
      };

      // Save tokens to integration service
      const oauthTokens: OAuthTokens = {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in, // Keep as number (seconds)
        tokenType: 'Bearer',
        scope: Array.isArray(sheetsTokens.scope) ? sheetsTokens.scope.join(' ') : sheetsTokens.scope
      };

      await TokenManager.storeOAuthTokens('googleSheets', oauthTokens, {
        id: userInfo.id,
        name: userInfo.email,
        email: userInfo.email
      });

      // Clean up the code verifier
      localStorage.removeItem(`oauth_code_verifier_googleSheets`);

      debugLogger.info('GoogleSheetsOAuthService', 'Successfully saved Google Sheets tokens');
      return sheetsTokens;
    } catch (error) {
      debugLogger.error('GoogleSheetsOAuthService', 'Error handling Google Sheets auth callback', error);
      throw error;
    }
  }

  /**
   * Get Google Sheets authentication status
   */
  static async getSheetsAuthStatus(): Promise<boolean> {
    try {
      return await TokenManager.isConnected('googleSheets');
    } catch (error) {
      debugLogger.error('GoogleSheetsOAuthService', 'Error getting Google Sheets auth status', error);
      return false;
    }
  }

  /**
   * Get Google Sheets access token
   */
  static async getSheetsAccessToken(): Promise<string | null> {
    try {
      const integration = await UnifiedIntegrationService.getIntegration('googleSheets');
      if (!integration?.config?.tokens?.accessToken) {
        return null;
      }

      // Check if token is expired and refresh if needed
      const expiresIn = integration.config.tokens.expiresIn;
      if (expiresIn && expiresIn <= Date.now()) {
        debugLogger.info('GoogleSheetsOAuthService', 'Google Sheets token expired, refreshing...');
        await this.refreshSheetsToken();
        
        // Get the refreshed integration
        const refreshedIntegration = await UnifiedIntegrationService.getIntegration('googleSheets');
        return refreshedIntegration?.config?.tokens?.accessToken || null;
      }

      return integration.config.tokens.accessToken;
    } catch (error) {
      debugLogger.error('GoogleSheetsOAuthService', 'Error getting Google Sheets access token', error);
      return null;
    }
  }

  /**
   * Refresh Google Sheets access token
   */
  static async refreshSheetsToken(): Promise<void> {
    try {
      const integration = await UnifiedIntegrationService.getIntegration('googleSheets');
      if (!integration?.config?.tokens?.refreshToken) {
        throw new Error('No refresh token available for Google Sheets');
      }

      debugLogger.info('GoogleSheetsOAuthService', 'Refreshing Google Sheets token');

      const tokenResponse = await fetch(this.GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
          client_secret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '',
          refresh_token: integration.config.tokens.refreshToken,
          grant_type: 'refresh_token'
        })
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to refresh Google Sheets token');
      }

      const tokens = await tokenResponse.json();

      // Update tokens using TokenManager
      const updatedTokens: OAuthTokens = {
        ...integration.config.tokens,
        accessToken: tokens.access_token,
        expiresIn: tokens.expires_in // Keep as seconds, not timestamp
      };

      await TokenManager.storeOAuthTokens(
        'googleSheets',
        updatedTokens,
        integration.config.accountInfo
      );

      debugLogger.info('GoogleSheetsOAuthService', 'Successfully refreshed Google Sheets token');
    } catch (error) {
      debugLogger.error('GoogleSheetsOAuthService', 'Error refreshing Google Sheets token', error);
      throw error;
    }
  }

  /**
   * Disconnect Google Sheets integration
   */
  static async disconnectSheets(): Promise<void> {
    try {
      debugLogger.info('GoogleSheetsOAuthService', 'Disconnecting Google Sheets');
      await UnifiedIntegrationService.deleteIntegration('googleSheets');
      debugLogger.info('GoogleSheetsOAuthService', 'Successfully disconnected Google Sheets');
    } catch (error) {
      debugLogger.error('GoogleSheetsOAuthService', 'Error disconnecting Google Sheets', error);
      throw error;
    }
  }
}
