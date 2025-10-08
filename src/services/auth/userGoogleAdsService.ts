import { debugLogger } from '@/lib/debug';
import { DatabaseService } from '../data/databaseService';

export interface UserGoogleAdsAuth {
  id?: string;
  userId: string; // Your app's user ID
  googleUserId: string; // Google's user ID
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: string;
  scope: string[];
  connectedAt: string;
  lastUsedAt?: string;
}

export interface GoogleAdsUserAccount {
  customerId: string;
  customerName: string;
  currency: string;
  timezone: string;
  managerAccount: boolean;
}

export class UserGoogleAdsService {
  private static readonly GOOGLE_ADS_SCOPE = 'https://www.googleapis.com/auth/adwords';

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
   * Generate OAuth URL for user to connect their Google Ads account
   */
  static async generateUserAuthUrl(userId: string, redirectUri?: string): Promise<string> {
    const state = btoa(JSON.stringify({
      userId,
      platform: 'google',
      timestamp: Date.now(),
      nonce: Math.random().toString(36).substring(7),
      scope: this.GOOGLE_ADS_SCOPE
    }));

    // Generate PKCE parameters
    const pkce = await this.generatePKCE();
    
    // Store code verifier for later use
    localStorage.setItem(`oauth_code_verifier_google`, pkce.codeVerifier);

    const params = new URLSearchParams({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
      redirect_uri: redirectUri || (window.location.hostname === 'localhost' ? `${window.location.origin}/oauth/callback` : 'https://tulenreporting.vercel.app/oauth/callback'),
      response_type: 'code',
      scope: this.GOOGLE_ADS_SCOPE,
      access_type: 'offline',
      prompt: 'consent', // Force consent screen to get refresh token
      state: state,
      code_challenge: pkce.codeChallenge,
      code_challenge_method: 'S256'
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens and save user authentication
   */
  static async handleUserAuthCallback(
    code: string,
    _state: string,
    userId: string
  ): Promise<UserGoogleAdsAuth> {
    try {
      // Get the code verifier from localStorage
      const codeVerifier = localStorage.getItem(`oauth_code_verifier_google`);
      if (!codeVerifier) {
        throw new Error('Code verifier not found. Please try connecting again.');
      }

      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
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
        throw new Error('Failed to exchange authorization code for tokens');
      }

      const tokens = await tokenResponse.json();

      // Get user info from Google
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`
        }
      });

      const userInfo = await userInfoResponse.json();

      // Save user authentication
      const userAuth: UserGoogleAdsAuth = {
        userId,
        googleUserId: userInfo.id,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: new Date(Date.now() + (tokens.expires_in * 1000)).toISOString(),
        scope: tokens.scope ? tokens.scope.split(' ') : [this.GOOGLE_ADS_SCOPE],
        connectedAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString()
      };

      await this.saveUserAuth(userAuth);
      
      // Clean up the code verifier
      localStorage.removeItem(`oauth_code_verifier_google`);
      
      return userAuth;
    } catch (error) {
      debugLogger.error('UserGoogleAdsService', 'Error handling user auth callback', error);
      throw error;
    }
  }

  /**
   * Get user's Google Ads authentication
   */
  static async getUserAuth(userId: string): Promise<UserGoogleAdsAuth | null> {
    try {
      return await DatabaseService.getUserGoogleAdsAuth(userId);
    } catch (error) {
      debugLogger.error('UserGoogleAdsService', 'Error getting user auth', error);
      return null;
    }
  }

  /**
   * Refresh user's access token
   */
  static async refreshUserToken(userId: string): Promise<UserGoogleAdsAuth | null> {
    try {
      const userAuth = await this.getUserAuth(userId);
      if (!userAuth?.refreshToken) {
        return null;
      }

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
          client_secret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '',
          refresh_token: userAuth.refreshToken,
          grant_type: 'refresh_token'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const tokens = await response.json();

      // Update user auth with new tokens
      const updatedAuth: UserGoogleAdsAuth = {
        ...userAuth,
        accessToken: tokens.access_token,
        tokenExpiresAt: new Date(Date.now() + (tokens.expires_in * 1000)).toISOString(),
        lastUsedAt: new Date().toISOString()
      };

      await this.updateUserAuth(updatedAuth);
      return updatedAuth;
    } catch (error) {
      debugLogger.error('UserGoogleAdsService', 'Error refreshing user token', error);
      return null;
    }
  }

  /**
   * Get user's Google Ads accounts
   */
  static async getUserGoogleAdsAccounts(userId: string): Promise<GoogleAdsUserAccount[]> {
    try {
      let userAuth = await this.getUserAuth(userId);
      
      if (!userAuth) {
        throw new Error('User not authenticated with Google Ads');
      }

      // Check if token needs refresh
      if (new Date(userAuth.tokenExpiresAt) <= new Date()) {
        userAuth = await this.refreshUserToken(userId);
        if (!userAuth) {
          throw new Error('Failed to refresh token');
        }
      }

      // Get developer token from environment
      const developerToken = import.meta.env.VITE_GOOGLE_ADS_DEVELOPER_TOKEN;
      if (!developerToken) {
        throw new Error('No Google Ads developer token configured');
      }

      // Get accessible customers
      const response = await fetch('https://googleads.googleapis.com/v14/customers:listAccessibleCustomers', {
        headers: {
          'Authorization': `Bearer ${userAuth.accessToken}`,
          'developer-token': developerToken,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Google Ads API error: ${response.statusText}`);
      }

      const data = await response.json();
      const customers = data.resourceNames || [];

      // Get detailed account information
      const accounts: GoogleAdsUserAccount[] = [];
      
      for (const customerResourceName of customers) {
        const customerId = customerResourceName.split('/').pop();
        if (!customerId) continue;

        try {
          const accountResponse = await fetch(`https://googleads.googleapis.com/v14/customers/${customerId}/googleAds:search`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${userAuth.accessToken}`,
              'developer-token': developerToken,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              query: `
                SELECT 
                  customer.id,
                  customer.descriptive_name,
                  customer.currency_code,
                  customer.time_zone,
                  customer.manager
                FROM customer
              `
            })
          });

          if (accountResponse.ok) {
            const accountData = await accountResponse.json();
            const customer = accountData.results?.[0]?.customer;

            if (customer) {
              accounts.push({
                customerId: customer.id,
                customerName: customer.descriptiveName || `Account ${customer.id}`,
                currency: customer.currencyCode || 'USD',
                timezone: customer.timeZone || 'UTC',
                managerAccount: customer.manager || false
              });
            }
          }
        } catch (error) {
          debugLogger.error('UserGoogleAdsService', `Error fetching account details for ${customerId}`, error);
        }
      }

      return accounts;
    } catch (error) {
      console.error('Error getting user Google Ads accounts:', error);
      throw error;
    }
  }

  /**
   * Disconnect user's Google Ads account
   */
  static async disconnectUser(userId: string): Promise<boolean> {
    try {
      const userAuth = await this.getUserAuth(userId);
      if (!userAuth) {
        return true; // Already disconnected
      }

      // Revoke tokens with Google
      try {
        await fetch('https://oauth2.googleapis.com/revoke', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            token: userAuth.refreshToken
          })
        });
      } catch (error) {
        console.warn('Failed to revoke tokens with Google:', error);
      }

      // Remove from database
      await DatabaseService.deleteUserGoogleAdsAuth(userId);
      return true;
    } catch (error) {
      console.error('Error disconnecting user:', error);
      return false;
    }
  }

  /**
   * Check if user is connected to Google Ads
   */
  static async isUserConnected(userId: string): Promise<boolean> {
    try {
      const userAuth = await this.getUserAuth(userId);
      return !!userAuth;
    } catch (error) {
      return false;
    }
  }

  // Database helper methods
  private static async saveUserAuth(userAuth: UserGoogleAdsAuth): Promise<void> {
    await DatabaseService.saveUserGoogleAdsAuth(userAuth);
  }

  private static async updateUserAuth(userAuth: UserGoogleAdsAuth): Promise<void> {
    await DatabaseService.updateUserGoogleAdsAuth(userAuth);
  }
}
