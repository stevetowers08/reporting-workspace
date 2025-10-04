import { debugLogger } from '@/lib/debug';
import { GoogleAdsService } from '@/services/api/googleAdsService';
import { OAuthService } from '@/services/auth/oauthService';

export class GoogleAdsTroubleshoot {
  static async runFullDiagnostic(): Promise<{
    success: boolean;
    results: Array<{
      test: string;
      status: 'pass' | 'fail' | 'warning';
      message: string;
      details?: any;
    }>;
  }> {
    const results: Array<{
      test: string;
      status: 'pass' | 'fail' | 'warning';
      message: string;
      details?: any;
    }> = [];

    // Test 1: Environment Variables
    try {
      const developerToken = import.meta.env.VITE_GOOGLE_ADS_DEVELOPER_TOKEN;
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;

      if (!developerToken || developerToken === 'your_google_ads_developer_token') {
        results.push({
          test: 'Developer Token',
          status: 'fail',
          message: 'Google Ads Developer Token not configured',
          details: { developerToken: developerToken ? 'Set but placeholder value' : 'Not set' }
        });
      } else {
        results.push({
          test: 'Developer Token',
          status: 'pass',
          message: 'Google Ads Developer Token configured',
          details: { developerToken: developerToken.substring(0, 10) + '...' }
        });
      }

      if (!clientId || clientId === 'your_google_client_id') {
        results.push({
          test: 'Google Client ID',
          status: 'fail',
          message: 'Google Client ID not configured',
          details: { clientId: clientId ? 'Set but placeholder value' : 'Not set' }
        });
      } else {
        results.push({
          test: 'Google Client ID',
          status: 'pass',
          message: 'Google Client ID configured',
          details: { clientId: clientId.substring(0, 20) + '...' }
        });
      }

      if (!clientSecret || clientSecret === 'your_google_client_secret') {
        results.push({
          test: 'Google Client Secret',
          status: 'fail',
          message: 'Google Client Secret not configured',
          details: { clientSecret: clientSecret ? 'Set but placeholder value' : 'Not set' }
        });
      } else {
        results.push({
          test: 'Google Client Secret',
          status: 'pass',
          message: 'Google Client Secret configured',
          details: { clientSecret: clientSecret.substring(0, 10) + '...' }
        });
      }
    } catch (error) {
      results.push({
        test: 'Environment Variables',
        status: 'fail',
        message: 'Error checking environment variables',
        details: { error: error.message }
      });
    }

    // Test 2: OAuth Tokens
    try {
      const tokens = OAuthService.getStoredTokens('google');
      if (!tokens || !tokens.accessToken) {
        results.push({
          test: 'OAuth Tokens',
          status: 'fail',
          message: 'No Google OAuth tokens found',
          details: { 
            hasTokens: !!tokens,
            hasAccessToken: !!(tokens?.accessToken),
            localStorageKeys: Object.keys(localStorage).filter(key => key.includes('google'))
          }
        });
      } else {
        const isValid = OAuthService.isTokenValid('google');
        results.push({
          test: 'OAuth Tokens',
          status: isValid ? 'pass' : 'warning',
          message: isValid ? 'Valid Google OAuth tokens found' : 'Google OAuth tokens expired',
          details: { 
            hasAccessToken: true,
            isValid,
            tokenLength: tokens.accessToken.length
          }
        });
      }
    } catch (error) {
      results.push({
        test: 'OAuth Tokens',
        status: 'fail',
        message: 'Error checking OAuth tokens',
        details: { error: error.message }
      });
    }

    // Test 3: Google Ads API Connection
    try {
      const connectionTest = await GoogleAdsService.testConnection();
      if (connectionTest.success) {
        results.push({
          test: 'Google Ads API Connection',
          status: 'pass',
          message: 'Successfully connected to Google Ads API',
          details: { 
            accessibleCustomers: connectionTest.accountInfo?.accessibleCustomers?.length || 0,
            adAccounts: connectionTest.accountInfo?.adAccounts?.length || 0
          }
        });
      } else {
        results.push({
          test: 'Google Ads API Connection',
          status: 'fail',
          message: 'Failed to connect to Google Ads API',
          details: { error: connectionTest.error }
        });
      }
    } catch (error) {
      results.push({
        test: 'Google Ads API Connection',
        status: 'fail',
        message: 'Error testing Google Ads API connection',
        details: { error: error.message }
      });
    }

    // Test 4: Account Access
    try {
      const accounts = await GoogleAdsService.getAdAccounts();
      if (accounts.length > 0) {
        results.push({
          test: 'Account Access',
          status: 'pass',
          message: `Found ${accounts.length} Google Ads accounts`,
          details: { 
            accounts: accounts.map(account => ({
              id: account.id,
              name: account.name,
              status: account.status
            }))
          }
        });
      } else {
        results.push({
          test: 'Account Access',
          status: 'warning',
          message: 'No Google Ads accounts found',
          details: { accounts: [] }
        });
      }
    } catch (error) {
      results.push({
        test: 'Account Access',
        status: 'fail',
        message: 'Error fetching Google Ads accounts',
        details: { error: error.message }
      });
    }

    // Test 5: Local Storage Check
    try {
      const googleKeys = Object.keys(localStorage).filter(key => key.includes('google'));
      const oauthTokens = localStorage.getItem('oauth_tokens_google');
      
      results.push({
        test: 'Local Storage',
        status: googleKeys.length > 0 ? 'pass' : 'warning',
        message: `Found ${googleKeys.length} Google-related localStorage keys`,
        details: { 
          keys: googleKeys,
          hasOAuthTokens: !!oauthTokens,
          oauthTokensLength: oauthTokens ? oauthTokens.length : 0
        }
      });
    } catch (error) {
      results.push({
        test: 'Local Storage',
        status: 'fail',
        message: 'Error checking localStorage',
        details: { error: error.message }
      });
    }

    const hasFailures = results.some(r => r.status === 'fail');
    const hasWarnings = results.some(r => r.status === 'warning');

    return {
      success: !hasFailures,
      results
    };
  }

  static async testAccountFetching(): Promise<{
    success: boolean;
    accounts: any[];
    error?: string;
  }> {
    try {
      debugLogger.debug('GoogleAdsTroubleshoot', 'Testing account fetching...');
      const accounts = await GoogleAdsService.getAdAccounts();
      debugLogger.debug('GoogleAdsTroubleshoot', 'Account fetching result', { 
        count: accounts.length, 
        accounts: accounts.map(a => ({ id: a.id, name: a.name }))
      });
      
      return {
        success: true,
        accounts
      };
    } catch (error) {
      debugLogger.error('GoogleAdsTroubleshoot', 'Account fetching failed', error);
      return {
        success: false,
        accounts: [],
        error: error.message
      };
    }
  }

  static getEnvironmentStatus(): {
    developerToken: boolean;
    clientId: boolean;
    clientSecret: boolean;
    oauthTokens: boolean;
  } {
    const developerToken = import.meta.env.VITE_GOOGLE_ADS_DEVELOPER_TOKEN;
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;
    const tokens = OAuthService.getStoredTokens('google');

    return {
      developerToken: !!(developerToken && developerToken !== 'your_google_ads_developer_token'),
      clientId: !!(clientId && clientId !== 'your_google_client_id'),
      clientSecret: !!(clientSecret && clientSecret !== 'your_google_client_secret'),
      oauthTokens: !!(tokens && tokens.accessToken)
    };
  }
}
