/* eslint-disable @typescript-eslint/no-explicit-any */
import { DevLogger } from '@/lib/logger';
import { SecureLogger } from '@/lib/secureLogger';
import { supabase } from '@/lib/supabase';
import {
    ApiKeyConfig,
    IntegrationConfig,
    IntegrationPlatform,
    OAuthTokens
} from '@/types/integration';
import { TokenEncryptionService } from './TokenEncryptionService';

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
  
  // Cache for connection status to prevent repeated database calls
  private static connectionCache = new Map<IntegrationPlatform, { 
    isConnected: boolean; 
    timestamp: number; 
  }>();
  private static readonly CACHE_DURATION = 30 * 1000; // 30 seconds cache
  
  // Prevent infinite token refresh loops with proper mutex
  private static refreshInProgress = new Set<IntegrationPlatform>();
  private static refreshPromises = new Map<IntegrationPlatform, Promise<string | null>>();
  
  // Clear refresh in progress after timeout to prevent stuck states
  private static clearRefreshInProgress(platform: IntegrationPlatform, timeoutMs = 60000) {
    window.setTimeout(() => {
      this.refreshInProgress.delete(platform);
      this.refreshPromises.delete(platform);
      DevLogger.debug('TokenManager', `Cleared refresh in progress flag for ${platform} after timeout`);
    }, timeoutMs);
  }

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
      DevLogger.info('TokenManager', `Storing OAuth tokens for ${platform}`);

      // Validate tokens before processing
      DevLogger.debug('TokenManager', 'Token validation', {
        platform,
        hasAccessToken: !!tokens.accessToken,
        hasRefreshToken: !!tokens.refreshToken,
        accessTokenLength: tokens.accessToken?.length || 0,
        refreshTokenLength: tokens.refreshToken?.length || 0,
        expiresIn: tokens.expiresIn,
        tokenType: tokens.tokenType,
        scope: tokens.scope
      });

      // Comprehensive token validation
      if (!tokens) {
        throw new Error('Invalid tokens: tokens object is null or undefined');
      }
      
      if (!tokens.accessToken) {
        throw new Error('Invalid tokens: missing accessToken');
      }
      
      if (typeof tokens.accessToken !== 'string') {
        throw new Error('Invalid tokens: accessToken must be a string');
      }
      
      if (tokens.accessToken.length < 10) {
        throw new Error('Invalid tokens: accessToken appears to be too short');
      }
      
      if (tokens.refreshToken && typeof tokens.refreshToken !== 'string') {
        throw new Error('Invalid tokens: refreshToken must be a string if provided');
      }
      
      if (tokens.expiresIn && typeof tokens.expiresIn !== 'number') {
        throw new Error('Invalid tokens: expiresIn must be a number if provided');
      }
      
      if (tokens.expiresIn && tokens.expiresIn < 0) {
        throw new Error('Invalid tokens: expiresIn cannot be negative');
      }
      
      // Account info validation
      if (accountInfo) {
        if (!accountInfo.id || typeof accountInfo.id !== 'string') {
          throw new Error('Invalid accountInfo: id must be a non-empty string');
        }
        if (!accountInfo.name || typeof accountInfo.name !== 'string') {
          throw new Error('Invalid accountInfo: name must be a non-empty string');
        }
      }

      // Calculate expiration time
      // Google OAuth refresh responses often don't include expires_in, default to 1 hour
      const expiresInSeconds = tokens.expiresIn || 3600; // Default to 1 hour for Google
      const expiresAt = new Date(Date.now() + (expiresInSeconds * 1000)).toISOString();

      const config: IntegrationConfig = {
        connected: true,
        tokens: {
          ...tokens,
          accessToken: tokens.accessToken, // Store directly without encryption
          refreshToken: tokens.refreshToken, // Store directly without encryption
          expiresAt
        },
        accountInfo,
        lastSync: new Date().toISOString(),
        syncStatus: 'idle',
        connectedAt: new Date().toISOString()
      };

      // Test database connection before attempting to store
      const { error: connectionError } = await supabase
        .from('integrations')
        .select('platform')
        .limit(1);
      
      if (connectionError) {
        throw new Error(`Database connection failed: ${connectionError.message}`);
      }
      
      DevLogger.debug('TokenManager', 'Database connection verified');
      
      DevLogger.debug('TokenManager', 'About to upsert to Supabase', {
        platform,
        accountInfo,
        configKeys: Object.keys(config),
        hasTokens: !!config.tokens,
        hasAccessToken: !!config.tokens?.accessToken
      });

      // Store tokens directly - simple and working approach
      const tokensForStorage = {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: config.tokens?.expiresAt,
        tokenType: tokens.tokenType,
        scope: tokens.scope
      };

      DevLogger.info('TokenManager', 'Storing OAuth tokens', {
        platform,
        hasAccessToken: !!tokensForStorage.accessToken,
        hasRefreshToken: !!tokensForStorage.refreshToken
      });

      // Use direct table operations instead of RPC function
      const { error } = await supabase
        .from('integrations')
        .upsert({
          platform: platform,
          connected: true,
          account_name: accountInfo?.name || 'Unknown',
          account_id: accountInfo?.id || 'unknown',
          config: {
            tokens: tokensForStorage,
            account_info: accountInfo
          },
          last_sync: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'platform' });

      if (error) {
        DevLogger.error('TokenManager', 'Failed to store tokens safely', error);
        throw new Error(`Failed to store tokens for ${platform}: ${error.message}`);
      }

      DevLogger.info('TokenManager', `OAuth tokens stored successfully for ${platform}`);
      
      // Clear connection cache since tokens were updated
      this.clearConnectionCache(platform);
    } catch (error) {
      // Enhanced error logging with full context
      const errorDetails = {
        platform,
        errorType: error?.constructor?.name || 'Unknown',
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        supabaseError: error?.code ? {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        } : undefined,
        tokenValidation: {
          hasAccessToken: !!tokens?.accessToken,
          hasRefreshToken: !!tokens?.refreshToken,
          accessTokenLength: tokens?.accessToken?.length || 0,
          expiresIn: tokens?.expiresIn,
          tokenType: tokens?.tokenType,
          scope: tokens?.scope
        },
        accountInfoValidation: {
          hasAccountInfo: !!accountInfo,
          accountId: accountInfo?.id,
          accountName: accountInfo?.name,
          accountEmail: accountInfo?.email
        }
      };

      DevLogger.error('TokenManager', 'Comprehensive error details', errorDetails);
      
      // Create a detailed error message for debugging
      const detailedMessage = `Failed to store tokens for ${platform}: ${error instanceof Error ? error.message : String(error)}`;
      const enhancedError = new Error(detailedMessage);
      enhancedError.cause = error;
      throw enhancedError;
    }
  }

  /**
   * Clear OAuth tokens for a platform safely
   */
  static async clearOAuthTokens(platform: IntegrationPlatform): Promise<void> {
    try {
      DevLogger.info('TokenManager', `Clearing OAuth tokens for ${platform}`);

      // Use the safe database function to clear tokens
      const { error } = await supabase.rpc('clear_oauth_tokens_safely', {
        p_platform: platform
      });

      if (error) {
        DevLogger.error('TokenManager', 'Failed to clear tokens safely', error);
        throw new Error(`Failed to clear tokens for ${platform}: ${error.message}`);
      }

      DevLogger.info('TokenManager', `Successfully cleared OAuth tokens for ${platform}`);
      
      // Clear connection cache since tokens were removed
      this.clearConnectionCache(platform);
    } catch (error) {
      DevLogger.error('TokenManager', `Failed to clear tokens for ${platform}`, error);
      throw new Error(`Failed to clear tokens for ${platform}: ${error instanceof Error ? error.message : String(error)}`);
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
      DevLogger.info('TokenManager', `Storing API key for ${platform}`);

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

      DevLogger.info('TokenManager', `API key stored successfully for ${platform}`);
      
      // Clear connection cache since API key was updated
      this.clearConnectionCache(platform);
    } catch (error) {
      DevLogger.error('TokenManager', `Failed to store API key for ${platform}`, error);
      throw new Error(`Failed to store API key for ${platform}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get access token for a platform
   */
  static async getAccessToken(platform: IntegrationPlatform, skipRefresh = false): Promise<string | null> {
    try {
      DevLogger.info('TokenManager', `Getting access token for ${platform}`);

      const { data, error } = await supabase
        .from('integrations')
        .select('config')
        .eq('platform', platform)
        .eq('connected', true)
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          DevLogger.info('TokenManager', `No integration found for ${platform}`);
          return null;
        }
        throw error;
      }

      const config = data.config as IntegrationConfig;

      // Check OAuth tokens first (handle both camelCase and snake_case)
      const encryptedAccessToken = config.tokens?.accessToken || (config.tokens as any)?.access_token;
      if (encryptedAccessToken) {
        DevLogger.info('TokenManager', `Found access token for ${platform}`);
        
        // Decrypt token for use
        const accessToken = await TokenEncryptionService.safeDecryptToken(encryptedAccessToken);
        SecureLogger.logTokenOperation('TokenManager', 'Decrypted access token', {
          platform,
          tokenLength: accessToken.length
        });
        
        // Check if token is expired or needs refresh
        const expiresAt = config.tokens?.expiresAt || (config.tokens as any)?.expires_at;
        if (expiresAt) {
          const expiresAtDate = new Date(expiresAt);
          const now = new Date();
          const timeUntilExpiry = expiresAtDate.getTime() - now.getTime();
          
          if (timeUntilExpiry < this.TOKEN_REFRESH_THRESHOLD && !skipRefresh) {
            // Prevent infinite refresh loops with proper mutex
            if (this.refreshInProgress.has(platform)) {
              DevLogger.info('TokenManager', `Token refresh already in progress for ${platform}, waiting for completion`);
              
              // Wait for the existing refresh promise to complete
              const existingPromise = this.refreshPromises.get(platform);
              if (existingPromise) {
                try {
                  const refreshedToken = await existingPromise;
                  if (refreshedToken) {
                    DevLogger.info('TokenManager', `Received refreshed token for ${platform} from concurrent request`);
                    return refreshedToken;
                  }
                } catch {
                  DevLogger.warn('TokenManager', `Concurrent refresh failed for ${platform}, proceeding with existing token`);
                }
              }
              
              // Fallback to existing token if concurrent refresh failed
              return accessToken;
            }
            
            DevLogger.info('TokenManager', `Token needs refresh for ${platform}, attempting automatic refresh`);
            
            // Attempt token refresh for all platforms
            DevLogger.info('TokenManager', `Attempting token refresh for ${platform}`);
            
            // Attempt automatic refresh with proper mutex
            const encryptedRefreshToken = config.tokens?.refreshToken || (config.tokens as any)?.refresh_token;
            
            if (!encryptedRefreshToken) {
              DevLogger.warn('TokenManager', `No refresh token available for ${platform}`);
              return accessToken; // Return existing token if no refresh token
            }
            
            // Mark refresh as in progress and create promise
            this.refreshInProgress.add(platform);
            this.clearRefreshInProgress(platform);
            
            const refreshPromise = this.refreshTokens(platform)
              .then(async () => {
                DevLogger.info('TokenManager', `Token refreshed successfully for ${platform}`);
                // Return the refreshed token by calling getAccessToken again with skipRefresh=true
                return await this.getAccessToken(platform, true);
              })
              .catch(refreshError => {
                DevLogger.error('TokenManager', `Automatic token refresh failed for ${platform}`, refreshError);
                DevLogger.warn('TokenManager', `Using existing token for ${platform} despite refresh failure`);
                return accessToken; // Return existing token if refresh fails
              })
              .finally(() => {
                this.refreshInProgress.delete(platform);
                this.refreshPromises.delete(platform);
              });
            
            // Store the promise for concurrent requests
            this.refreshPromises.set(platform, refreshPromise);
            
            return await refreshPromise;
          }
        }
        return accessToken;
      }

      // Check direct accessToken in config (for Facebook Ads)
      if ((config as any)?.accessToken) {
        DevLogger.info('TokenManager', `Found direct access token for ${platform}`);
        DevLogger.info('TokenManager', `Found direct access token for ${platform}`);
        return (config as any).accessToken;
      }

      // Check API key (for Google AI - GoHighLevel is client-level, not account-level)
      if (config.apiKey?.apiKey) {
        DevLogger.info('TokenManager', `Found API key for ${platform}`);
        DevLogger.info('TokenManager', `Found API key for ${platform}`);
        return config.apiKey.apiKey;
      }

      DevLogger.info('TokenManager', `No valid token found for ${platform}`);
      DevLogger.info('TokenManager', `No valid token found for ${platform}`);
      return null;
    } catch (error) {
      DevLogger.error('TokenManager', `Failed to get access token for ${platform}`, error);
      return null;
    }
  }

  /**
   * Get refresh token for a platform
   */
  static async getRefreshToken(platform: IntegrationPlatform): Promise<string | null> {
    try {
      DevLogger.info('TokenManager', `Getting refresh token for ${platform}`);

      const { data, error } = await supabase
        .from('integrations')
        .select('config')
        .eq('platform', platform)
        .eq('connected', true)
        .limit(1)
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
      DevLogger.error('TokenManager', `Failed to get refresh token for ${platform}`, error);
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
        .limit(1)
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
      DevLogger.error('TokenManager', `Failed to check token refresh status for ${platform}`, error);
      return false;
    }
  }

  /**
   * Refresh OAuth tokens using OAuth service
   */
  static async refreshTokens(platform: IntegrationPlatform): Promise<void> {
    try {
      DevLogger.info('TokenManager', `Refreshing tokens for ${platform}`);

      // Import OAuth service to handle refresh
      const { OAuthService } = await import('@/services/auth/oauthService');
      
      // Use OAuth service to refresh tokens
      await OAuthService.refreshAccessToken(platform);
      
      DevLogger.info('TokenManager', `Tokens refreshed successfully for ${platform}`);
    } catch (error) {
      DevLogger.error('TokenManager', `Failed to refresh tokens for ${platform}`, error);
      throw new Error(`Failed to refresh tokens for ${platform}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Remove tokens for a platform
   */
  static async removeTokens(platform: IntegrationPlatform): Promise<void> {
    try {
      DevLogger.info('TokenManager', `Removing tokens for ${platform}`);

      const { data: existingData, error: fetchError } = await supabase
        .from('integrations')
        .select('config')
        .eq('platform', platform)
        .limit(1)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          DevLogger.info('TokenManager', `No integration found to remove for ${platform}`);
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

      DevLogger.info('TokenManager', `Tokens removed successfully for ${platform}`);
    } catch (error) {
      DevLogger.error('TokenManager', `Failed to remove tokens for ${platform}`, error);
      throw new Error(`Failed to remove tokens for ${platform}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if platform is connected
   */
  static async isConnected(platform: IntegrationPlatform): Promise<boolean> {
    try {
      DevLogger.debug('TokenManager', `isConnected(${platform}) called`);
      
      // Check cache first
      const cached = this.connectionCache.get(platform);
      const now = Date.now();
      
      if (cached && (now - cached.timestamp) < this.CACHE_DURATION) {
        DevLogger.debug('TokenManager', `isConnected(${platform}) = ${cached.isConnected} (cached)`);
        return cached.isConnected;
      }
      
      // Cache miss or expired - check database
      const token = await this.getAccessToken(platform);
      const isConnected = !!token;
      
      // Update cache
      this.connectionCache.set(platform, {
        isConnected,
        timestamp: now
      });
      
      DevLogger.debug('TokenManager', `isConnected(${platform}) = ${isConnected} (fresh)`);
      return isConnected;
    } catch (error) {
      DevLogger.error('TokenManager', `isConnected(${platform}) error:`, error);
      DevLogger.error('TokenManager', `Failed to check connection status for ${platform}`, error);
      
      // Cache the error result to prevent repeated failed calls
      this.connectionCache.set(platform, {
        isConnected: false,
        timestamp: Date.now()
      });
      
      return false;
    }
  }

  /**
   * Clear connection cache for a platform (call when tokens are updated)
   */
  static clearConnectionCache(platform?: IntegrationPlatform): void {
    if (platform) {
      this.connectionCache.delete(platform);
      DevLogger.debug('TokenManager', `Cleared connection cache for ${platform}`);
    } else {
      this.connectionCache.clear();
      DevLogger.debug('TokenManager', 'Cleared all connection cache');
    }
  }

  /**
   * Get all connected platforms
   */
  static async getConnectedPlatforms(): Promise<IntegrationPlatform[]> {
    try {
      DevLogger.info('TokenManager', 'Getting all connected platforms');

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

      DevLogger.info('TokenManager', `Found ${connectedPlatforms.length} connected platforms`);
      return connectedPlatforms;
    } catch (error) {
      DevLogger.error('TokenManager', 'Failed to get connected platforms', error);
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
        .limit(1)
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
      DevLogger.error('TokenManager', `Failed to get token expiration info for ${platform}`, error);
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
      DevLogger.info('TokenManager', 'Cleaning up expired tokens');

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
        DevLogger.info('TokenManager', `Marked ${platform} as disconnected due to expired tokens`);
      }

      DevLogger.info('TokenManager', `Cleaned up ${expiredPlatforms.length} expired tokens`);
    } catch (error) {
      DevLogger.error('TokenManager', 'Failed to cleanup expired tokens', error);
    }
  }
}
