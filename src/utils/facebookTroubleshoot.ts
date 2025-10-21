// Facebook API Troubleshooting Utility
import { debugLogger } from '@/lib/debug';
import { FacebookAdsService } from '@/services/api/facebookAdsService';
import { FacebookTokenService } from '@/services/auth/facebookTokenService';

export class FacebookTroubleshoot {
  static async runFullDiagnostic(): Promise<{
    success: boolean;
    results: Record<string, any>;
    errors: string[];
  }> {
    const results: Record<string, any> = {};
    const errors: string[] = [];

    debugLogger.info('FacebookTroubleshoot', 'Starting full Facebook API diagnostic');

    // Test 1: Environment Variables
    try {
      const envCheck = {
        hasClientId: !!import.meta.env.VITE_FACEBOOK_CLIENT_ID,
        hasClientSecret: !!import.meta.env.VITE_FACEBOOK_CLIENT_SECRET,
        hasAccessToken: !!import.meta.env.VITE_FACEBOOK_ACCESS_TOKEN,
        clientId: import.meta.env.VITE_FACEBOOK_CLIENT_ID?.substring(0, 10) + '...'
      };
      results.environmentVariables = envCheck;
      debugLogger.info('FacebookTroubleshoot', 'Environment variables check', envCheck);
    } catch (error) {
      errors.push(`Environment check failed: ${error}`);
    }

    // Test 2: Database Tokens
    try {
      const tokens = await FacebookTokenService.getTokens();
      const tokenCheck = {
        hasTokens: !!tokens,
        hasAccessToken: !!tokens?.accessToken,
        hasRefreshToken: !!tokens?.refreshToken,
        tokenType: tokens?.tokenType,
        scope: tokens?.scope
      };
      results.storedTokens = tokenCheck;
      debugLogger.info('FacebookTroubleshoot', 'Database tokens check', tokenCheck);
    } catch (error) {
      errors.push(`Token check failed: ${error}`);
    }

    // Test 3: OAuth Configuration
    try {
      const { OAuthService } = await import('@/services/auth/oauthService');
      const authUrl = await OAuthService.generateAuthUrl('facebook');
      const tokens = await FacebookTokenService.getTokens();
      const oauthCheck = {
        authUrlGenerated: !!authUrl,
        authUrl: authUrl.substring(0, 50) + '...',
        hasStoredTokens: !!tokens,
        redirectUri: `${window.location.origin}/oauth/callback`
      };
      results.oauthConfiguration = oauthCheck;
      debugLogger.info('FacebookTroubleshoot', 'OAuth configuration check', oauthCheck);
    } catch (error) {
      errors.push(`OAuth config check failed: ${error}`);
    }

    // Test 4: Authentication
    try {
      const isAuthenticated = await FacebookAdsService.authenticate();
      results.authentication = { authenticated: isAuthenticated };
      debugLogger.info('FacebookTroubleshoot', 'Authentication check', { authenticated: isAuthenticated });
    } catch (error) {
      errors.push(`Authentication failed: ${error}`);
      results.authentication = { authenticated: false, error: (error as Error).message };
    }

    // Test 5: API Endpoints
    try {
      const token = await FacebookAdsService.getAccessToken();
      const response = await fetch(`https://graph.facebook.com/v22.0/me?access_token=${token}`);
      const userData = await response.json();
      
      if (response.ok) {
        results.apiEndpoints = { 
          success: true, 
          userData: { name: userData.name, id: userData.id } 
        };
        debugLogger.info('FacebookTroubleshoot', 'API endpoints check', results.apiEndpoints);
      } else {
        throw new Error(`API Error: ${userData.error?.message || response.statusText}`);
      }
    } catch (error) {
      errors.push(`API endpoints failed: ${error}`);
      results.apiEndpoints = { success: false, error: (error as Error).message };
    }

    // Test 6: Ad Accounts Access
    try {
      const accounts = await FacebookAdsService.getAdAccounts();
      results.adAccountsAccess = { 
        success: true, 
        accountCount: accounts.length,
        accounts: accounts.slice(0, 3).map(acc => ({ id: acc.id, name: acc.name }))
      };
      debugLogger.info('FacebookTroubleshoot', 'Ad accounts access check', results.adAccountsAccess);
    } catch (error) {
      errors.push(`Ad accounts access failed: ${error}`);
      results.adAccountsAccess = { success: false, error: (error as Error).message };
    }

    const success = errors.length === 0;
    debugLogger.info('FacebookTroubleshoot', 'Diagnostic complete', { success, errorCount: errors.length });

    return { success, results, errors };
  }

  static async testConnection(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      debugLogger.info('FacebookTroubleshoot', 'Testing Facebook connection');
      const result = await FacebookAdsService.testConnection();
      return result;
    } catch (error) {
      debugLogger.error('FacebookTroubleshoot', 'Connection test failed', error);
      return { success: false, error: (error as Error).message };
    }
  }

  static async getAccountMetrics(accountId?: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      debugLogger.info('FacebookTroubleshoot', 'Getting account metrics', { accountId });
      const metrics = await FacebookAdsService.getAccountMetrics(accountId);
      return { success: true, data: metrics };
    } catch (error) {
      debugLogger.error('FacebookTroubleshoot', 'Get account metrics failed', error);
      return { success: false, error: (error as Error).message };
    }
  }

  static async clearTokens(): Promise<void> {
    try {
      await FacebookTokenService.clearTokens();
      debugLogger.info('FacebookTroubleshoot', 'Cleared Facebook tokens from database');
    } catch (error) {
      debugLogger.error('FacebookTroubleshoot', 'Failed to clear tokens', error);
      throw error;
    }
  }

  static generateAuthUrl(): string {
    try {
      const { OAuthService } = require('@/services/auth/oauthService');
      return OAuthService.generateAuthUrl('facebook');
    } catch (error) {
      debugLogger.error('FacebookTroubleshoot', 'Failed to generate auth URL', error);
      return '';
    }
  }
}