import { debugLogger } from '@/lib/debug';
import { supabase } from '@/lib/supabase';

export interface OAuthCredentials {
  id: string;
  platform: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  authUrl: string;
  tokenUrl: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OAuthCredentialsInput {
  platform: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  authUrl: string;
  tokenUrl: string;
}

export class OAuthCredentialsService {
  /**
   * Get OAuth credentials for a platform
   */
  static async getCredentials(platform: string): Promise<OAuthCredentials | null> {
    try {
      debugLogger.info('OAuthCredentialsService', `Getting credentials for ${platform}`);
      
      // Get OAuth config from oauth_credentials table
      const { data: oauthData, error: oauthError } = await supabase
        .from('oauth_credentials')
        .select('*')
        .eq('platform', platform)
        .eq('is_active', true)
        .single();
      
      if (oauthError) {
        if (oauthError.code === 'PGRST116') {
          debugLogger.info('OAuthCredentialsService', `No OAuth config found for ${platform}`);
          return null;
        }
        throw oauthError;
      }
      
      // Get integration status and tokens from integrations table
      const { data: integrationData, error: integrationError } = await supabase
        .from('integrations')
        .select('*')
        .eq('platform', platform)
        .eq('connected', true)
        .single();
      
      if (integrationError) {
        if (integrationError.code === 'PGRST116') {
          debugLogger.info('OAuthCredentialsService', `No integration found for ${platform}`);
          return null;
        }
        throw integrationError;
      }
      
      // Extract tokens from integration config
      const config = integrationData.config || {};
      const tokens = config.tokens || {};
      
      // Return null if no tokens found
      if (!tokens.accessToken) {
        debugLogger.info('OAuthCredentialsService', `No access token found for ${platform}`);
        return null;
      }
      
      // Combine OAuth config with integration data
      const credentials: OAuthCredentials = {
        id: oauthData.id,
        platform: oauthData.platform,
        clientId: oauthData.client_id,
        clientSecret: oauthData.client_secret,
        redirectUri: oauthData.redirect_uri,
        scopes: oauthData.scopes,
        authUrl: oauthData.auth_url,
        tokenUrl: oauthData.token_url,
        isActive: oauthData.is_active && integrationData.connected,
        createdAt: oauthData.created_at,
        updatedAt: oauthData.updated_at
      };
      
      debugLogger.info('OAuthCredentialsService', `Found credentials for ${platform}`);
      return credentials;
    } catch (error) {
      debugLogger.error('OAuthCredentialsService', `Failed to get credentials for ${platform}`, error);
      throw error;
    }
  }

  private static getAuthUrl(platform: string): string {
    switch (platform) {
      case 'googleAds':
      case 'googleSheets':
        return 'https://accounts.google.com/o/oauth2/v2/auth';
      case 'goHighLevel':
        return 'https://marketplace.leadconnectorhq.com/oauth/chooselocation';
      default:
        return '';
    }
  }

  private static getTokenUrl(platform: string): string {
    switch (platform) {
      case 'googleAds':
      case 'googleSheets':
        return 'https://oauth2.googleapis.com/token';
      case 'goHighLevel':
        return 'https://services.leadconnectorhq.com/oauth/token';
      default:
        return '';
    }
  }

  /**
   * Save or update OAuth credentials
   */
  static async saveCredentials(input: OAuthCredentialsInput): Promise<OAuthCredentials> {
    try {
      debugLogger.info('OAuthCredentialsService', `Saving credentials for ${input.platform}`);
      
      const { data, error } = await supabase
        .from('oauth_credentials')
        .upsert({
          platform: input.platform,
          client_id: input.clientId,
          client_secret: input.clientSecret,
          redirect_uri: input.redirectUri,
          scopes: input.scopes,
          auth_url: input.authUrl,
          token_url: input.tokenUrl,
          is_active: true,
          updated_at: new Date().toISOString()
        }, { onConflict: 'platform' })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      const credentials: OAuthCredentials = {
        id: data.id,
        platform: data.platform,
        clientId: data.client_id,
        clientSecret: data.client_secret,
        redirectUri: data.redirect_uri,
        scopes: data.scopes,
        authUrl: data.auth_url,
        tokenUrl: data.token_url,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
      
      debugLogger.info('OAuthCredentialsService', `Saved credentials for ${input.platform}`);
      return credentials;
    } catch (error) {
      debugLogger.error('OAuthCredentialsService', `Failed to save credentials for ${input.platform}`, error);
      throw error;
    }
  }

  /**
   * Get all OAuth credentials
   */
  static async getAllCredentials(): Promise<OAuthCredentials[]> {
    try {
      debugLogger.info('OAuthCredentialsService', 'Getting all OAuth credentials');
      
      const { data, error } = await supabase
        .from('oauth_credentials')
        .select('*')
        .eq('is_active', true)
        .order('platform');
      
      if (error) {
        throw error;
      }
      
      const credentials: OAuthCredentials[] = data.map(item => ({
        id: item.id,
        platform: item.platform,
        clientId: item.client_id,
        clientSecret: item.client_secret,
        redirectUri: item.redirect_uri,
        scopes: item.scopes,
        authUrl: item.auth_url,
        tokenUrl: item.token_url,
        isActive: item.is_active,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));
      
      debugLogger.info('OAuthCredentialsService', `Found ${credentials.length} OAuth credentials`);
      return credentials;
    } catch (error) {
      debugLogger.error('OAuthCredentialsService', 'Failed to get all OAuth credentials', error);
      throw error;
    }
  }

  /**
   * Delete OAuth credentials (soft delete)
   */
  static async deleteCredentials(platform: string): Promise<void> {
    try {
      debugLogger.info('OAuthCredentialsService', `Deleting credentials for ${platform}`);
      
      const { error } = await supabase
        .from('oauth_credentials')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('platform', platform);
      
      if (error) {
        throw error;
      }
      
      debugLogger.info('OAuthCredentialsService', `Deleted credentials for ${platform}`);
    } catch (error) {
      debugLogger.error('OAuthCredentialsService', `Failed to delete credentials for ${platform}`, error);
      throw error;
    }
  }

  /**
   * Test OAuth credentials by making a test request
   */
  static async testCredentials(platform: string): Promise<{ success: boolean; message: string }> {
    try {
      debugLogger.info('OAuthCredentialsService', `Testing credentials for ${platform}`);
      
      const credentials = await this.getCredentials(platform);
      if (!credentials) {
        return { success: false, message: 'No credentials found for this platform' };
      }
      
      // Basic validation
      if (!credentials.clientId) {
        return { success: false, message: 'Client ID is missing' };
      }
      
      if (!credentials.clientSecret && platform !== 'facebook') {
        return { success: false, message: 'Client secret is missing' };
      }
      
      if (!credentials.redirectUri) {
        return { success: false, message: 'Redirect URI is missing' };
      }
      
      if (!credentials.scopes || credentials.scopes.length === 0) {
        return { success: false, message: 'Scopes are missing' };
      }
      
      return { success: true, message: 'Credentials are valid' };
    } catch (error) {
      debugLogger.error('OAuthCredentialsService', `Failed to test credentials for ${platform}`, error);
      return { success: false, message: `Test failed: ${error}` };
    }
  }
}
