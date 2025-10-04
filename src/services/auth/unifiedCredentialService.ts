import { supabase } from '@/lib/supabase';
import { debugLogger } from '@/lib/debug';

export interface CredentialConfig {
  // OAuth tokens
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  tokenType?: string;
  scope?: string[];
  
  // API credentials
  clientId?: string;
  clientSecret?: string;
  developerToken?: string;
  apiKey?: string;
  
  // Account info
  accountId?: string;
  accountName?: string;
  userId?: string;
  userEmail?: string;
  
  // Metadata
  lastUpdated?: string;
  lastUsed?: string;
  isActive?: boolean;
}

export interface PlatformCredentials {
  platform: string;
  connected: boolean;
  accountName?: string;
  accountId?: string;
  lastSync?: string;
  config: CredentialConfig;
  created_at?: string;
  updated_at?: string;
}

export class UnifiedCredentialService {
  /**
   * Get credentials for a specific platform
   */
  static async getCredentials(platform: string): Promise<CredentialConfig | null> {
    try {
      const { data, error } = await supabase
        .from('integrations')
        .select('config')
        .eq('platform', platform)
        .eq('connected', true)
        .single();

      if (error) {
        debugLogger.error('UnifiedCredentialService', `Error fetching ${platform} credentials`, error);
        return null;
      }

      return data?.config || null;
    } catch (error) {
      debugLogger.error('UnifiedCredentialService', `Error getting ${platform} credentials`, error);
      return null;
    }
  }

  /**
   * Store credentials for a platform
   */
  static async storeCredentials(
    platform: string, 
    config: CredentialConfig, 
    accountName?: string,
    accountId?: string
  ): Promise<boolean> {
    try {
      const credentialData: PlatformCredentials = {
        platform,
        connected: true,
        accountName,
        accountId,
        lastSync: new Date().toISOString(),
        config: {
          ...config,
          lastUpdated: new Date().toISOString(),
          lastUsed: new Date().toISOString(),
          isActive: true
        },
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('integrations')
        .upsert(credentialData, { onConflict: 'platform' });

      if (error) {
        debugLogger.error('UnifiedCredentialService', `Error storing ${platform} credentials`, error);
        return false;
      }

      debugLogger.info('UnifiedCredentialService', `${platform} credentials stored successfully`);
      return true;
    } catch (error) {
      debugLogger.error('UnifiedCredentialService', `Error storing ${platform} credentials`, error);
      return false;
    }
  }

  /**
   * Update credentials for a platform
   */
  static async updateCredentials(platform: string, updates: Partial<CredentialConfig>): Promise<boolean> {
    try {
      const { data: existing } = await supabase
        .from('integrations')
        .select('config')
        .eq('platform', platform)
        .single();

      if (!existing) {
        debugLogger.warn('UnifiedCredentialService', `No existing credentials found for ${platform}`);
        return false;
      }

      const updatedConfig = {
        ...existing.config,
        ...updates,
        lastUpdated: new Date().toISOString(),
        lastUsed: new Date().toISOString()
      };

      const { error } = await supabase
        .from('integrations')
        .update({ 
          config: updatedConfig,
          updated_at: new Date().toISOString()
        })
        .eq('platform', platform);

      if (error) {
        debugLogger.error('UnifiedCredentialService', `Error updating ${platform} credentials`, error);
        return false;
      }

      debugLogger.info('UnifiedCredentialService', `${platform} credentials updated successfully`);
      return true;
    } catch (error) {
      debugLogger.error('UnifiedCredentialService', `Error updating ${platform} credentials`, error);
      return false;
    }
  }

  /**
   * Get access token for a platform
   */
  static async getAccessToken(platform: string): Promise<string | null> {
    const credentials = await this.getCredentials(platform);
    return credentials?.accessToken || null;
  }

  /**
   * Check if credentials are valid (not expired)
   */
  static async areCredentialsValid(platform: string): Promise<boolean> {
    const credentials = await this.getCredentials(platform);
    if (!credentials?.accessToken) return false;

    // Check if token is expired
    if (credentials.tokenExpiresAt) {
      const expiresAt = new Date(credentials.tokenExpiresAt);
      const now = new Date();
      const buffer = 5 * 60 * 1000; // 5 minutes buffer
      return now < new Date(expiresAt.getTime() - buffer);
    }

    return true;
  }

  /**
   * Disconnect a platform (mark as disconnected)
   */
  static async disconnectPlatform(platform: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('integrations')
        .update({
          connected: false,
          config: {},
          updated_at: new Date().toISOString()
        })
        .eq('platform', platform);

      if (error) {
        debugLogger.error('UnifiedCredentialService', `Error disconnecting ${platform}`, error);
        return false;
      }

      debugLogger.info('UnifiedCredentialService', `${platform} disconnected successfully`);
      return true;
    } catch (error) {
      debugLogger.error('UnifiedCredentialService', `Error disconnecting ${platform}`, error);
      return false;
    }
  }

  /**
   * Get all connected platforms
   */
  static async getConnectedPlatforms(): Promise<PlatformCredentials[]> {
    try {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('connected', true)
        .order('updated_at', { ascending: false });

      if (error) {
        debugLogger.error('UnifiedCredentialService', 'Error fetching connected platforms', error);
        return [];
      }

      return data || [];
    } catch (error) {
      debugLogger.error('UnifiedCredentialService', 'Error getting connected platforms', error);
      return [];
    }
  }

  /**
   * Migrate existing credentials to unified format
   */
  static async migrateExistingCredentials(): Promise<void> {
    try {
      debugLogger.info('UnifiedCredentialService', 'Starting credential migration...');

      // Migrate Google Ads credentials from user_google_ads_auth table
      const { data: googleAuths } = await supabase
        .from('user_google_ads_auth')
        .select('*');

      if (googleAuths && googleAuths.length > 0) {
        for (const auth of googleAuths) {
          const config: CredentialConfig = {
            accessToken: auth.access_token,
            refreshToken: auth.refresh_token,
            tokenExpiresAt: auth.token_expires_at,
            scope: auth.scope,
            userId: auth.user_id,
            lastUpdated: auth.updated_at,
            lastUsed: auth.last_used_at,
            isActive: true
          };

          await this.storeCredentials('googleAds', config, `User ${auth.user_id}`, auth.google_user_id);
        }
        debugLogger.info('UnifiedCredentialService', `Migrated ${googleAuths.length} Google Ads credentials`);
      }

      // Migrate Google Ads configs
      const { data: googleConfigs } = await supabase
        .from('google_ads_configs')
        .select('*')
        .eq('is_active', true);

      if (googleConfigs && googleConfigs.length > 0) {
        for (const config of googleConfigs) {
          const credentialConfig: CredentialConfig = {
            clientId: config.client_id,
            clientSecret: config.client_secret,
            developerToken: config.developer_token,
            isActive: config.is_active,
            lastUpdated: config.updated_at
          };

          await this.updateCredentials('googleAds', credentialConfig);
        }
        debugLogger.info('UnifiedCredentialService', `Migrated ${googleConfigs.length} Google Ads configs`);
      }

      debugLogger.info('UnifiedCredentialService', 'Credential migration completed');
    } catch (error) {
      debugLogger.error('UnifiedCredentialService', 'Error during credential migration', error);
    }
  }

  /**
   * Clear all credentials (for testing)
   */
  static async clearAllCredentials(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('integrations')
        .update({
          connected: false,
          config: {},
          updated_at: new Date().toISOString()
        });

      if (error) {
        debugLogger.error('UnifiedCredentialService', 'Error clearing all credentials', error);
        return false;
      }

      debugLogger.info('UnifiedCredentialService', 'All credentials cleared');
      return true;
    } catch (error) {
      debugLogger.error('UnifiedCredentialService', 'Error clearing credentials', error);
      return false;
    }
  }
}
