import { debugLogger } from '@/lib/debug';
import { RateLimitConfigs, checkRateLimit } from '@/lib/rateLimiting';
import { IntegrationConfigSchema, validateInput } from '@/lib/validation';
import { IntegrationApiService } from '@/services/api/IntegrationApiService';
import {
    AccountInfo,
    ApiKeyConfig,
    IntegrationConfig,
    IntegrationDisplay,
    IntegrationPlatform,
    OAuthTokens
} from '@/types/integration';

/**
 * IntegrationService - API-based integration management
 * 
 * This service uses the new Edge Functions API instead of direct database access.
 * It provides the same interface as the original IntegrationService but routes
 * all operations through the API layer for better security and performance.
 */
export class IntegrationService {
  /**
   * Get integration configuration for a platform
   */
  static async getIntegration(platform: IntegrationPlatform): Promise<IntegrationConfig | null> {
    try {
      debugLogger.info('IntegrationService', `Fetching integration for ${platform}`);
      return await IntegrationApiService.getIntegration(platform);
    } catch (error) {
      debugLogger.error('IntegrationService', `Error fetching integration ${platform}`, error);
      throw new Error(`Failed to fetch integration: ${(error as Error).message}`);
    }
  }

  /**
   * Get all integrations
   */
  static async getAllIntegrations(): Promise<IntegrationConfig[]> {
    try {
      debugLogger.info('IntegrationService', 'Fetching all integrations');
      return await IntegrationApiService.getAllIntegrations();
    } catch (error) {
      debugLogger.error('IntegrationService', 'Error fetching all integrations', error);
      throw new Error(`Failed to fetch all integrations: ${(error as Error).message}`);
    }
  }

  /**
   * Get integration display data for UI
   */
  static async getIntegrationDisplay(): Promise<IntegrationDisplay[]> {
    try {
      debugLogger.info('IntegrationService', 'Fetching integration display data');
      return await IntegrationApiService.getIntegrationDisplay();
    } catch (error) {
      debugLogger.error('IntegrationService', 'Error fetching integration display data', error);
      throw new Error(`Failed to fetch integration display data: ${(error as Error).message}`);
    }
  }

  /**
   * Save OAuth tokens for a platform
   */
  static async saveOAuthTokens(
    platform: IntegrationPlatform,
    tokens: OAuthTokens,
    accountInfo: AccountInfo,
    metadata?: Record<string, any>,
    settings?: Record<string, any>
  ): Promise<IntegrationConfig> {
    try {
      debugLogger.info('IntegrationService', `Saving OAuth tokens for ${platform}`);
      return await IntegrationApiService.saveOAuthTokens(platform, tokens, accountInfo, metadata, settings);
    } catch (error) {
      debugLogger.error('IntegrationService', `Error saving OAuth tokens for ${platform}`, error);
      throw new Error(`Failed to save OAuth tokens: ${(error as Error).message}`);
    }
  }

  /**
   * Save API key for a platform
   */
  static async saveApiKey(
    platform: IntegrationPlatform,
    apiKeyConfig: ApiKeyConfig,
    accountInfo: AccountInfo,
    metadata?: Record<string, any>,
    settings?: Record<string, any>
  ): Promise<IntegrationConfig> {
    try {
      debugLogger.info('IntegrationService', `Saving API key for ${platform}`);
      return await IntegrationApiService.saveApiKey(platform, apiKeyConfig, accountInfo, metadata, settings);
    } catch (error) {
      debugLogger.error('IntegrationService', `Error saving API key for ${platform}`, error);
      throw new Error(`Failed to save API key: ${(error as Error).message}`);
    }
  }

  /**
   * Refresh OAuth tokens
   */
  static async refreshTokens(
    platform: IntegrationPlatform,
    newTokens: OAuthTokens
  ): Promise<IntegrationConfig> {
    try {
      debugLogger.info('IntegrationService', `Refreshing tokens for ${platform}`);
      return await IntegrationApiService.refreshTokens(platform, newTokens);
    } catch (error) {
      debugLogger.error('IntegrationService', `Error refreshing tokens for ${platform}`, error);
      throw new Error(`Failed to refresh tokens: ${(error as Error).message}`);
    }
  }

  /**
   * Disconnect integration
   */
  static async disconnect(platform: IntegrationPlatform): Promise<void> {
    try {
      debugLogger.info('IntegrationService', `Disconnecting ${platform}`);
      await IntegrationApiService.disconnect(platform);
      debugLogger.info('IntegrationService', `${platform} disconnected successfully`);
    } catch (error) {
      debugLogger.error('IntegrationService', `Error disconnecting ${platform}`, error);
      throw new Error(`Failed to disconnect integration: ${(error as Error).message}`);
    }
  }

  /**
   * Save integration configuration
   */
  static async saveIntegration(platform: IntegrationPlatform, config: IntegrationConfig): Promise<IntegrationConfig> {
    try {
      // Rate limiting check
      const rateLimitResult = checkRateLimit(`integration:${platform}`, RateLimitConfigs.integration);
      if (!rateLimitResult.allowed) {
        throw new Error(`Rate limit exceeded for ${platform} integration. Try again in ${rateLimitResult.retryAfter} seconds.`);
      }

      // Validate input data
      const validatedConfig = validateInput(IntegrationConfigSchema, config);
      
      debugLogger.info('IntegrationService', `Saving integration config for ${platform}`);
      
      // Use the appropriate method based on what's in the config
      if (validatedConfig.tokens) {
        return await this.saveOAuthTokens(
          platform,
          validatedConfig.tokens,
          validatedConfig.accountInfo || { id: `${platform}-user`, name: `${platform} Account` },
          validatedConfig.metadata,
          validatedConfig.settings
        );
      } else if (config.apiKey) {
        return await this.saveApiKey(
          platform,
          config.apiKey,
          config.accountInfo || { id: `${platform}-user`, name: `${platform} Account` },
          config.metadata,
          config.settings
        );
      } else {
        throw new Error('Integration config must contain either tokens or apiKey');
      }
    } catch (error) {
      debugLogger.error('IntegrationService', `Error saving integration config for ${platform}`, error);
      throw new Error(`Failed to save integration config: ${(error as Error).message}`);
    }
  }

  /**
   * Get tokens for a platform
   */
  static async getTokens(platform: IntegrationPlatform): Promise<{
    tokens?: OAuthTokens;
    apiKey?: ApiKeyConfig;
    accountInfo?: AccountInfo;
    expiresAt?: string;
    needsRefresh?: boolean;
  } | null> {
    try {
      debugLogger.info('IntegrationService', `Getting tokens for ${platform}`);
      return await IntegrationApiService.getTokens(platform);
    } catch (error) {
      debugLogger.error('IntegrationService', `Error getting tokens for ${platform}`, error);
      throw new Error(`Failed to get tokens: ${(error as Error).message}`);
    }
  }

  /**
   * Check if platform is connected
   */
  static async isConnected(platform: IntegrationPlatform): Promise<boolean> {
    try {
      const tokens = await this.getTokens(platform);
      return !!(tokens?.tokens?.accessToken || tokens?.apiKey?.apiKey);
    } catch (error) {
      debugLogger.error('IntegrationService', `Error checking connection status for ${platform}`, error);
      return false;
    }
  }

  /**
   * Test API connection
   */
  static async testConnection(): Promise<boolean> {
    try {
      debugLogger.info('IntegrationService', 'Testing API connection');
      return await IntegrationApiService.testConnection();
    } catch (error) {
      debugLogger.error('IntegrationService', 'API connection test failed', error);
      return false;
    }
  }
}
