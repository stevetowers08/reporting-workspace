import { debugLogger } from '@/lib/debug';
import { supabase } from '@/lib/supabase';
import {
    ApiKeyConfig,
    IntegrationConfig,
    IntegrationPlatform,
    OAuthTokens
} from '@/types/integration';

/**
 * TokenManager - Database-only token management service
 * 
 * This service eliminates localStorage dependencies and provides:
 * - Secure token storage in database
 * - Automatic token refresh
 * - Multi-device synchronization
 * - Audit trails
 * - Backup/recovery capabilities
 */
export class TokenManager {
  private static readonly TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry

  /**
   * Store OAuth tokens for a platform
   */
  static async storeOAuthTokens(
    platform: IntegrationPlatform,
    tokens: OAuthTokens,
    accountInfo?: {
      id: string;
      name: string;
      email?: string;
    }
  ): Promise<void> {
    try {
      debugLogger.info('TokenManager', `Storing OAuth tokens for ${platform}`);

      // Calculate expiration time
      // Google OAuth refresh responses often don't include expires_in, default to 1 hour
      const expiresInSeconds = tokens.expiresIn || 3600; // Default to 1 hour for Google
      const expiresAt = new Date(Date.now() + (expiresInSeconds * 1000)).toISOString();

      const config: IntegrationConfig = {
        connected: true,
        tokens: {
          ...tokens,
          expiresAt
        },
        accountInfo,
        lastSync: new Date().toISOString(),
        syncStatus: 'idle',
        connectedAt: new Date().toISOString()
      };

      const { error } = await supabase
        .from('integrations')
        .upsert({
          platform,
          connected: true,
          account_name: accountInfo?.name,
          account_id: accountInfo?.id,
          last_sync: config.lastSync,
          config,
          updated_at: new Date().toISOString()
        }, { onConflict: 'platform' });

      if (error) {
        throw error;
      }

      debugLogger.info('TokenManager', `OAuth tokens stored successfully for ${platform}`);
    } catch (error) {
      debugLogger.error('TokenManager', `Failed to store OAuth tokens for ${platform}`, error);
      throw new Error(`Failed to store tokens for ${platform}: ${error}`);
    }
  }

  /**
   * Store API key for a platform
   */
  static async storeApiKey(
    platform: IntegrationPlatform,
    apiKey: ApiKeyConfig,
    accountInfo?: {
      id: string;
      name: string;
      email?: string;
    }
  ): Promise<void> {
    try {
      debugLogger.info('TokenManager', `Storing API key for ${platform}`);

      const config: IntegrationConfig = {
        connected: true,
        apiKey,
        accountInfo,
        lastSync: new Date().toISOString(),
        syncStatus: 'idle',
        connectedAt: new Date().toISOString()
      };

      const { error } = await supabase
        .from('integrations')
        .upsert({
          platform,
          connected: true,
          account_name: accountInfo?.name,
          account_id: accountInfo?.id,
          last_sync: config.lastSync,
          config,
          updated_at: new Date().toISOString()
        }, { onConflict: 'platform' });

      if (error) {
        throw error;
      }

      debugLogger.info('TokenManager', `API key stored successfully for ${platform}`);
    } catch (error) {
      debugLogger.error('TokenManager', `Failed to store API key for ${platform}`, error);
      throw new Error(`Failed to store API key for ${platform}: ${error}`);
    }
  }

  /**
   * Get access token for a platform
   */
  static async getAccessToken(platform: IntegrationPlatform, skipRefresh = false): Promise<string | null> {
    try {
      debugLogger.info('TokenManager', `Getting access token for ${platform}`);
      console.log(`TokenManager: Getting access token for ${platform}`);

      const { data, error } = await supabase
        .from('integrations')
        .select('config')
        .eq('platform', platform)
        .eq('connected', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          debugLogger.info('TokenManager', `No integration found for ${platform}`);
          console.log(`TokenManager: No integration found for ${platform}`);
          return null;
        }
        throw error;
      }

      const config = data.config as IntegrationConfig;

      // Check OAuth tokens first (handle both camelCase and snake_case)
      const accessToken = config.tokens?.accessToken || (config.tokens as any)?.access_token;
      if (accessToken) {
        console.log(`TokenManager: Found access token for ${platform}`);
        debugLogger.info('TokenManager', `Found access token for ${platform}`);
        // Check if token is expired or needs refresh
        const expiresAt = config.tokens?.expiresAt || (config.tokens as any)?.expires_at;
        if (expiresAt) {
          const expiresAtDate = new Date(expiresAt);
          const now = new Date();
          const timeUntilExpiry = expiresAtDate.getTime() - now.getTime();
          
          if (timeUntilExpiry < this.TOKEN_REFRESH_THRESHOLD && !skipRefresh) {
            debugLogger.info('TokenManager', `Token needs refresh for ${platform}, attempting automatic refresh`);
            
            // Attempt token refresh for all platforms
            debugLogger.info('TokenManager', `Attempting token refresh for ${platform}`);
            
            // Attempt automatic refresh
            const refreshToken = config.tokens?.refreshToken || (config.tokens as any)?.refresh_token;
            if (refreshToken) {
              try {
                await this.refreshTokens(platform);
                // Return the refreshed token by calling getAccessToken again with skipRefresh=true to prevent infinite loop
                return await this.getAccessToken(platform, true);
              } catch (refreshError) {
                debugLogger.error('TokenManager', `Automatic token refresh failed for ${platform}`, refreshError);
                // Return null instead of continuing with expired token
                return null;
              }
            } else {
              debugLogger.warn('TokenManager', `No refresh token available for ${platform}`);
              return null;
            }
          }
        }
        return accessToken;
      }

      // Check direct accessToken in config (for Facebook Ads)
      if ((config as any)?.accessToken) {
        console.log(`TokenManager: Found direct access token for ${platform}`);
        debugLogger.info('TokenManager', `Found direct access token for ${platform}`);
        return (config as any).accessToken;
      }

      // Check API key (for GoHighLevel)
      if (config.apiKey?.apiKey) {
        console.log(`TokenManager: Found API key for ${platform}`);
        debugLogger.info('TokenManager', `Found API key for ${platform}`);
        return config.apiKey.apiKey;
      }

      debugLogger.info('TokenManager', `No valid token found for ${platform}`);
      console.log(`TokenManager: No valid token found for ${platform}`);
      return null;
    } catch (error) {
      debugLogger.error('TokenManager', `Failed to get access token for ${platform}`, error);
      return null;
    }
  }

  /**
   * Get refresh token for a platform
   */
  static async getRefreshToken(platform: IntegrationPlatform): Promise<string | null> {
    try {
      debugLogger.info('TokenManager', `Getting refresh token for ${platform}`);

      const { data, error } = await supabase
        .from('integrations')
        .select('config')
        .eq('platform', platform)
        .eq('connected', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      const config = data.config as IntegrationConfig;
      return config.tokens?.refreshToken || (config.tokens as any)?.refresh_token || null;
    } catch (error) {
      debugLogger.error('TokenManager', `Failed to get refresh token for ${platform}`, error);
      return null;
    }
  }

  /**
   * Check if token needs refresh
   */
  static async needsTokenRefresh(platform: IntegrationPlatform): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('integrations')
        .select('config')
        .eq('platform', platform)
        .eq('connected', true)
        .single();

      if (error || !data) {
        return false;
      }

      const config = data.config as IntegrationConfig;
      
      if (!config.tokens?.expiresAt) {
        return false;
      }

      const expiresAt = new Date(config.tokens.expiresAt);
      const now = new Date();
      const timeUntilExpiry = expiresAt.getTime() - now.getTime();

      return timeUntilExpiry < this.TOKEN_REFRESH_THRESHOLD;
    } catch (error) {
      debugLogger.error('TokenManager', `Failed to check token refresh status for ${platform}`, error);
      return false;
    }
  }

  /**
   * Refresh OAuth tokens using OAuth service
   */
  static async refreshTokens(platform: IntegrationPlatform): Promise<void> {
    try {
      debugLogger.info('TokenManager', `Refreshing tokens for ${platform}`);

      // Import OAuth service to handle refresh
      const { OAuthService } = await import('@/services/auth/oauthService');
      
      // Use OAuth service to refresh tokens
      const refreshedTokens = await OAuthService.refreshAccessToken(platform);
      
      debugLogger.info('TokenManager', `Tokens refreshed successfully for ${platform}`);
    } catch (error) {
      debugLogger.error('TokenManager', `Failed to refresh tokens for ${platform}`, error);
      throw new Error(`Failed to refresh tokens for ${platform}: ${error}`);
    }
  }

  /**
   * Remove tokens for a platform
   */
  static async removeTokens(platform: IntegrationPlatform): Promise<void> {
    try {
      debugLogger.info('TokenManager', `Removing tokens for ${platform}`);

      const { data: existingData, error: fetchError } = await supabase
        .from('integrations')
        .select('config')
        .eq('platform', platform)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          debugLogger.info('TokenManager', `No integration found to remove for ${platform}`);
          return;
        }
        throw fetchError;
      }

      const existingConfig = existingData.config as IntegrationConfig;
      
      const updatedConfig: IntegrationConfig = {
        ...existingConfig,
        connected: false,
        tokens: undefined,
        apiKey: undefined,
        lastSync: undefined,
        syncStatus: 'idle',
        lastError: undefined
      };

      const { error } = await supabase
        .from('integrations')
        .update({
          connected: false,
          config: updatedConfig,
          last_sync: null,
          updated_at: new Date().toISOString()
        })
        .eq('platform', platform);

      if (error) {
        throw error;
      }

      debugLogger.info('TokenManager', `Tokens removed successfully for ${platform}`);
    } catch (error) {
      debugLogger.error('TokenManager', `Failed to remove tokens for ${platform}`, error);
      throw new Error(`Failed to remove tokens for ${platform}: ${error}`);
    }
  }

  /**
   * Check if platform is connected
   */
  static async isConnected(platform: IntegrationPlatform): Promise<boolean> {
    try {
      console.log(`🔍 TokenManager: isConnected(${platform}) called`);
      const token = await this.getAccessToken(platform);
      const isConnected = !!token;
      console.log(`🔍 TokenManager: isConnected(${platform}) = ${isConnected}`);
      return isConnected;
    } catch (error) {
      console.log(`🔍 TokenManager: isConnected(${platform}) error:`, error);
      debugLogger.error('TokenManager', `Failed to check connection status for ${platform}`, error);
      return false;
    }
  }

  /**
   * Get all connected platforms
   */
  static async getConnectedPlatforms(): Promise<IntegrationPlatform[]> {
    try {
      debugLogger.info('TokenManager', 'Getting all connected platforms');

      const { data, error } = await supabase
        .from('integrations')
        .select('platform, config')
        .eq('connected', true);

      if (error) {
        throw error;
      }

      const connectedPlatforms: IntegrationPlatform[] = [];

      for (const integration of data) {
        const config = integration.config as IntegrationConfig;
        
        // Check if we have valid tokens or API key
        const hasValidTokens = config.tokens?.accessToken && 
          (!config.tokens.expiresAt || new Date(config.tokens.expiresAt) > new Date());
        const hasValidApiKey = !!config.apiKey?.apiKey;

        if (hasValidTokens || hasValidApiKey) {
          connectedPlatforms.push(integration.platform as IntegrationPlatform);
        }
      }

      debugLogger.info('TokenManager', `Found ${connectedPlatforms.length} connected platforms`);
      return connectedPlatforms;
    } catch (error) {
      debugLogger.error('TokenManager', 'Failed to get connected platforms', error);
      return [];
    }
  }

  /**
   * Get token expiration info
   */
  static async getTokenExpirationInfo(platform: IntegrationPlatform): Promise<{
    expiresAt: Date | null;
    isExpired: boolean;
    timeUntilExpiry: number | null;
  }> {
    try {
      const { data, error } = await supabase
        .from('integrations')
        .select('config')
        .eq('platform', platform)
        .eq('connected', true)
        .single();

      if (error || !data) {
        return {
          expiresAt: null,
          isExpired: false,
          timeUntilExpiry: null
        };
      }

      const config = data.config as IntegrationConfig;
      
      if (!config.tokens?.expiresAt) {
        return {
          expiresAt: null,
          isExpired: false,
          timeUntilExpiry: null
        };
      }

      const expiresAt = new Date(config.tokens.expiresAt);
      const now = new Date();
      const timeUntilExpiry = expiresAt.getTime() - now.getTime();
      const isExpired = timeUntilExpiry <= 0;

      return {
        expiresAt,
        isExpired,
        timeUntilExpiry: isExpired ? 0 : timeUntilExpiry
      };
    } catch (error) {
      debugLogger.error('TokenManager', `Failed to get token expiration info for ${platform}`, error);
      return {
        expiresAt: null,
        isExpired: false,
        timeUntilExpiry: null
      };
    }
  }

  /**
   * Clean up expired tokens
   */
  static async cleanupExpiredTokens(): Promise<void> {
    try {
      debugLogger.info('TokenManager', 'Cleaning up expired tokens');

      const { data, error } = await supabase
        .from('integrations')
        .select('platform, config')
        .eq('connected', true);

      if (error) {
        throw error;
      }

      const now = new Date();
      const expiredPlatforms: IntegrationPlatform[] = [];

      for (const integration of data) {
        const config = integration.config as IntegrationConfig;
        
        if (config.tokens?.expiresAt) {
          const expiresAt = new Date(config.tokens.expiresAt);
          if (expiresAt < now) {
            expiredPlatforms.push(integration.platform as IntegrationPlatform);
          }
        }
      }

      // Mark expired platforms as disconnected
      for (const platform of expiredPlatforms) {
        await this.removeTokens(platform);
        debugLogger.info('TokenManager', `Marked ${platform} as disconnected due to expired tokens`);
      }

      debugLogger.info('TokenManager', `Cleaned up ${expiredPlatforms.length} expired tokens`);
    } catch (error) {
      debugLogger.error('TokenManager', 'Failed to cleanup expired tokens', error);
    }
  }
}
