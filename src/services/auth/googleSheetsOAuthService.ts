import { debugLogger } from '@/lib/debug';
import { IntegrationService } from '@/services/integration/IntegrationService';
import { AccountInfo, OAuthTokens } from '@/types/integration';

export interface GoogleSheetsAuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: string;
  scope: string[];
  connectedAt: string;
  lastUsedAt: string;
}

export class GoogleSheetsOAuthService {
  private static readonly GOOGLE_SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';
  private static readonly GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
  private static readonly GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

  /**
   * Generate OAuth URL for Google Sheets authentication
   */
  static generateSheetsAuthUrl(redirectUri?: string): string {
    const state = btoa(JSON.stringify({
      platform: 'googleSheets',
      timestamp: Date.now(),
      nonce: Math.random().toString(36).substring(7)
    }));

    const params = new URLSearchParams({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
      redirect_uri: redirectUri || (window.location.hostname === 'localhost' ? 'http://localhost:8080/oauth/callback' : 'https://tulenreporting.vercel.app/oauth/callback'),
      response_type: 'code',
      scope: this.GOOGLE_SHEETS_SCOPE,
      access_type: 'offline',
      prompt: 'consent', // Force consent screen to get refresh token
      state: state
    });

    return `${this.GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for Google Sheets tokens
   */
  static async handleSheetsAuthCallback(
    code: string,
    state: string
  ): Promise<GoogleSheetsAuthTokens> {
    try {
      debugLogger.info('GoogleSheetsOAuthService', 'Handling Google Sheets auth callback');

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
          redirect_uri: window.location.hostname === 'localhost' ? 'http://localhost:8080/oauth/callback' : 'https://tulenreporting.vercel.app/oauth/callback'
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
        throw new Error('Failed to get user info from Google');
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
        tokenExpiresAt: sheetsTokens.tokenExpiresAt,
        tokenType: 'Bearer',
        scope: sheetsTokens.scope
      };

      const accountInfo: AccountInfo = {
        accountId: userInfo.id,
        accountName: userInfo.email,
        accountEmail: userInfo.email,
        accountType: 'personal'
      };

      await IntegrationService.saveOAuthTokens(
        'googleSheets',
        oauthTokens,
        accountInfo,
        {
          googleUserId: userInfo.id,
          googleUserEmail: userInfo.email,
          googleUserName: userInfo.name
        }
      );

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
      return await IntegrationService.isConnected('googleSheets');
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
      const integration = await IntegrationService.getIntegration('googleSheets');
      if (!integration?.tokens?.accessToken) {
        return null;
      }

      // Check if token is expired and refresh if needed
      const tokenExpiresAt = new Date(integration.tokens.tokenExpiresAt);
      if (tokenExpiresAt <= new Date()) {
        debugLogger.info('GoogleSheetsOAuthService', 'Google Sheets token expired, refreshing...');
        await this.refreshSheetsToken();
        
        // Get the refreshed integration
        const refreshedIntegration = await IntegrationService.getIntegration('googleSheets');
        return refreshedIntegration?.tokens?.accessToken || null;
      }

      return integration.tokens.accessToken;
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
      const integration = await IntegrationService.getIntegration('googleSheets');
      if (!integration?.tokens?.refreshToken) {
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
          refresh_token: integration.tokens.refreshToken,
          grant_type: 'refresh_token'
        })
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to refresh Google Sheets token');
      }

      const tokens = await tokenResponse.json();

      // Update tokens in integration service
      const updatedTokens: OAuthTokens = {
        ...integration.tokens,
        accessToken: tokens.access_token,
        tokenExpiresAt: new Date(Date.now() + (tokens.expires_in * 1000)).toISOString()
      };

      await IntegrationService.saveOAuthTokens(
        'googleSheets',
        updatedTokens,
        integration.accountInfo,
        integration.metadata
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
      await IntegrationService.deleteIntegration('googleSheets');
      debugLogger.info('GoogleSheetsOAuthService', 'Successfully disconnected Google Sheets');
    } catch (error) {
      debugLogger.error('GoogleSheetsOAuthService', 'Error disconnecting Google Sheets', error);
      throw error;
    }
  }
}
