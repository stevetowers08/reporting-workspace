import { debugLogger } from '@/lib/debug';
import { supabase } from '@/lib/supabase';
import {
    AccountInfo,
    ApiKeyConfig,
    IntegrationConfig,
    IntegrationDisplay,
    IntegrationPlatform,
    IntegrationRow,
    IntegrationStatus,
    OAuthTokens,
    PlatformMetadata
} from '@/types/integration';

export interface IntegrationService {
  getIntegration(platform: IntegrationPlatform): Promise<IntegrationRow | null>;
  saveIntegration(platform: IntegrationPlatform, config: IntegrationConfig): Promise<IntegrationRow>;
  deleteIntegration(platform: IntegrationPlatform): Promise<void>;
  getAllIntegrations(): Promise<IntegrationRow[]>;
  getIntegrationDisplay(): Promise<IntegrationDisplay[]>;
  isConnected(platform: IntegrationPlatform): Promise<boolean>;
  getToken(platform: IntegrationPlatform): Promise<string | null>;
  getAccountInfo(platform: IntegrationPlatform): Promise<AccountInfo | null>;
  saveOAuthTokens(platform: IntegrationPlatform, tokens: OAuthTokens, accountInfo?: AccountInfo, metadata?: PlatformMetadata): Promise<void>;
  saveApiKey(platform: IntegrationPlatform, apiKey: ApiKeyConfig, accountInfo?: AccountInfo): Promise<void>;
}

export class UnifiedIntegrationService {
  /**
   * Get a specific integration by platform
   */
  static async getIntegration(platform: IntegrationPlatform): Promise<IntegrationRow | null> {
    try {
      debugLogger.info('UnifiedIntegrationService', `Getting integration for ${platform}`);
      
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('platform', platform)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          debugLogger.info('UnifiedIntegrationService', `No integration found for ${platform}`);
          return null;
        }
        throw error;
      }
      
      debugLogger.info('UnifiedIntegrationService', `Found integration for ${platform}`);
      return data as IntegrationRow;
    } catch (error) {
      debugLogger.error('UnifiedIntegrationService', `Failed to get integration for ${platform}`, error);
      throw error;
    }
  }

  /**
   * Save or update an integration
   */
  static async saveIntegration(platform: IntegrationPlatform, config: IntegrationConfig): Promise<IntegrationRow> {
    try {
      debugLogger.info('UnifiedIntegrationService', `Saving integration for ${platform}`);
      
      const integrationData = {
        platform,
        connected: config.connected,
        account_name: config.accountInfo?.name,
        account_id: config.accountInfo?.id,
        last_sync: config.lastSync,
        config,
        updated_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('integrations')
        .upsert(integrationData, { onConflict: 'platform' })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      debugLogger.info('UnifiedIntegrationService', `Saved integration for ${platform}`);
      return data as IntegrationRow;
    } catch (error) {
      debugLogger.error('UnifiedIntegrationService', `Failed to save integration for ${platform}`, error);
      throw error;
    }
  }

  /**
   * Delete an integration
   */
  static async deleteIntegration(platform: IntegrationPlatform): Promise<void> {
    try {
      debugLogger.info('UnifiedIntegrationService', `Deleting integration for ${platform}`);
      
      const { error } = await supabase
        .from('integrations')
        .delete()
        .eq('platform', platform);
      
      if (error) {
        throw error;
      }
      
      debugLogger.info('UnifiedIntegrationService', `Deleted integration for ${platform}`);
    } catch (error) {
      debugLogger.error('UnifiedIntegrationService', `Failed to delete integration for ${platform}`, error);
      throw error;
    }
  }

  /**
   * Get all integrations
   */
  static async getAllIntegrations(): Promise<IntegrationRow[]> {
    try {
      debugLogger.info('UnifiedIntegrationService', 'Getting all integrations');
      
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .order('platform');
      
      if (error) {
        throw error;
      }
      
      debugLogger.info('UnifiedIntegrationService', `Found ${data.length} integrations`);
      return data as IntegrationRow[];
    } catch (error) {
      debugLogger.error('UnifiedIntegrationService', 'Failed to get all integrations', error);
      throw error;
    }
  }

  /**
   * Get integration display data for UI
   */
  static async getIntegrationDisplay(): Promise<IntegrationDisplay[]> {
    try {
      debugLogger.info('UnifiedIntegrationService', 'Getting integration display data');
      
      const integrations = await this.getAllIntegrations();
      
      // Define platform configurations (admin-level only)
      const platformConfigs = [
        { key: 'facebook', name: 'Facebook Ads', platform: 'facebookAds' as IntegrationPlatform },
        { key: 'google', name: 'Google Ads', platform: 'googleAds' as IntegrationPlatform },
        { key: 'googlesheets', name: 'Google Sheets', platform: 'googleSheets' as IntegrationPlatform },
        { key: 'google-ai', name: 'Google AI Studio', platform: 'google-ai' as IntegrationPlatform }
      ];
      
      const displayData: IntegrationDisplay[] = platformConfigs.map(config => {
        const integration = integrations.find(i => i.platform === config.platform);
        
        if (!integration) {
          return {
            id: config.key,
            name: config.name,
            platform: config.platform,
            status: 'not connected',
            lastSync: 'Never',
            clientsUsing: 0
          };
        }
        
        const status = this.determineStatus(integration);
        const lastSync = this.formatLastSync(integration.config.lastSync);
        
        return {
          id: config.key,
          name: config.name,
          platform: config.platform,
          status,
          lastSync,
          clientsUsing: 0, // TODO: Calculate actual client usage
          accountName: integration.config.accountInfo?.name,
          accountId: integration.config.accountInfo?.id,
          errorMessage: integration.config.lastError
        };
      });
      
      debugLogger.info('UnifiedIntegrationService', `Generated display data for ${displayData.length} platforms`);
      return displayData;
    } catch (error) {
      debugLogger.error('UnifiedIntegrationService', 'Failed to get integration display data', error);
      throw error;
    }
  }

  /**
   * Check if an integration is connected
   */
  static async isConnected(platform: IntegrationPlatform): Promise<boolean> {
    try {
      const integration = await this.getIntegration(platform);
      
      if (!integration) {
        return false;
      }
      
      // Check if we have valid tokens or API key
      const hasValidTokens = this.hasValidTokens(integration.config);
      const hasValidApiKey = this.hasValidApiKey(integration.config);
      
      // For API key platforms (like Google AI Studio), check if API key exists
      if (platform === 'google-ai') {
        return hasValidApiKey;
      }
      
      // Google Sheets has its own separate OAuth tokens and integration
      
      // For OAuth platforms, check if we have valid tokens (ignore connected flag for now)
      // Each platform (Google Sheets, Google Ads, etc.) has independent authentication
      return hasValidTokens || hasValidApiKey;
    } catch (error) {
      debugLogger.error('UnifiedIntegrationService', `Failed to check connection status for ${platform}`, error);
      return false;
    }
  }

  /**
   * Get access token for a platform
   */
  static async getToken(platform: IntegrationPlatform): Promise<string | null> {
    try {
      const integration = await this.getIntegration(platform);
      
      if (!integration) {
        return null;
      }
      
      // Check OAuth tokens first
      if (integration.config.tokens?.accessToken) {
        return integration.config.tokens.accessToken;
      }
      
      // Check for bearer token in apiKey field (GoHighLevel OAuth)
      if (integration.config.apiKey?.keyType === 'bearer' && integration.config.apiKey.apiKey) {
        return integration.config.apiKey.apiKey;
      }
      
      // Check for regular API key
      if (integration.config.apiKey?.apiKey) {
        return integration.config.apiKey.apiKey;
      }
      
      return null;
    } catch (error) {
      debugLogger.error('UnifiedIntegrationService', `Failed to get token for ${platform}`, error);
      return null;
    }
  }

  /**
   * Get account information for a platform
   */
  static async getAccountInfo(platform: IntegrationPlatform): Promise<AccountInfo | null> {
    try {
      const integration = await this.getIntegration(platform);
      
      if (!integration) {
        return null;
      }
      
      return integration.config.accountInfo || null;
    } catch (error) {
      debugLogger.error('UnifiedIntegrationService', `Failed to get account info for ${platform}`, error);
      return null;
    }
  }

  /**
   * Save OAuth tokens for a platform
   */
  static async saveOAuthTokens(
    platform: IntegrationPlatform, 
    tokens: OAuthTokens, 
    accountInfo?: AccountInfo,
    metadata?: PlatformMetadata
  ): Promise<void> {
    try {
      debugLogger.info('UnifiedIntegrationService', `Saving OAuth tokens for ${platform}`);
      
      const config: IntegrationConfig = {
        connected: true,
        tokens,
        accountInfo,
        metadata,
        lastSync: new Date().toISOString(),
        syncStatus: 'idle',
        connectedAt: new Date().toISOString()
      };
      
      await this.saveIntegration(platform, config);
      debugLogger.info('UnifiedIntegrationService', `Saved OAuth tokens for ${platform}`);
    } catch (error) {
      debugLogger.error('UnifiedIntegrationService', `Failed to save OAuth tokens for ${platform}`, error);
      throw error;
    }
  }

  /**
   * Save API key for a platform
   */
  static async saveApiKey(
    platform: IntegrationPlatform, 
    apiKey: ApiKeyConfig, 
    accountInfo?: AccountInfo
  ): Promise<void> {
    try {
      debugLogger.info('UnifiedIntegrationService', `Saving API key for ${platform}`);
      
      const config: IntegrationConfig = {
        connected: true,
        apiKey,
        accountInfo,
        lastSync: new Date().toISOString(),
        syncStatus: 'idle',
        connectedAt: new Date().toISOString()
      };
      
      await this.saveIntegration(platform, config);
      debugLogger.info('UnifiedIntegrationService', `Saved API key for ${platform}`);
    } catch (error) {
      debugLogger.error('UnifiedIntegrationService', `Failed to save API key for ${platform}`, error);
      throw error;
    }
  }

  /**
   * Disconnect an integration
   */
  static async disconnect(platform: IntegrationPlatform): Promise<void> {
    try {
      debugLogger.info('UnifiedIntegrationService', `Disconnecting ${platform}`);
      
      // Get existing integration to preserve some data
      const existingIntegration = await this.getIntegration(platform);
      
      const config: IntegrationConfig = {
        connected: false,
        lastSync: undefined,
        syncStatus: 'idle',
        lastError: undefined,
        // Preserve metadata for Google Sheets (spreadsheet selection)
        metadata: existingIntegration?.config.metadata,
        // Clear tokens and API keys
        tokens: undefined,
        apiKey: undefined
      };
      
      await this.saveIntegration(platform, config);
      debugLogger.info('UnifiedIntegrationService', `Disconnected ${platform}`);
    } catch (error) {
      debugLogger.error('UnifiedIntegrationService', `Failed to disconnect ${platform}`, error);
      throw error;
    }
  }

  // Private helper methods

  /**
   * Determine the status of an integration
   */
  private static determineStatus(integration: IntegrationRow): IntegrationStatus {
    if (!integration.config.connected) {
      return 'not connected';
    }
    
    if (integration.config.lastError) {
      return 'error';
    }
    
    // Check if tokens are expired
    if (integration.config.tokens?.expiresAt) {
      const expiresAt = new Date(integration.config.tokens.expiresAt);
      if (expiresAt < new Date()) {
        return 'expired';
      }
    }
    
    return 'connected';
  }

  /**
   * Format last sync time for display
   */
  private static formatLastSync(lastSync?: string): string {
    if (!lastSync) {
      return 'Never';
    }
    
    const syncDate = new Date(lastSync);
    const now = new Date();
    const diffMs = now.getTime() - syncDate.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins} minutes ago`;
    } else if (diffMins < 1440) {
      const hours = Math.floor(diffMins / 60);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffMins / 1440);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  }

  /**
   * Check if integration has valid OAuth tokens
   */
  private static hasValidTokens(config: IntegrationConfig): boolean {
    // Check for access token in different possible locations
    const accessToken = config.tokens?.accessToken || 
                       (config.tokens as any)?.access_token ||
                       (config as any)?.accessToken ||
                       // Check for bearer token in apiKey field (GoHighLevel OAuth)
                       (config.apiKey?.keyType === 'bearer' ? config.apiKey.apiKey : null);
    
    if (!accessToken) {
      return false;
    }
    
    // Check if token is expired
    const expiresAt = config.tokens?.tokenExpiresAt || 
                     config.tokens?.expiresAt ||
                     (config.tokens as any)?.expires_at ||
                     (config as any)?.expiresAt ||
                     // Check expiresAt in root config (GoHighLevel OAuth)
                     (config as any)?.expiresAt;
    
    if (expiresAt) {
      const expiresAtDate = new Date(expiresAt);
      if (expiresAtDate < new Date()) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Check if integration has valid API key
   */
  private static hasValidApiKey(config: IntegrationConfig): boolean {
    return !!(config.apiKey?.apiKey);
  }
}

// Export the service as the default implementation
export const IntegrationService = UnifiedIntegrationService;
