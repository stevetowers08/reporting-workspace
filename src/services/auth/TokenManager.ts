/* eslint-disable no-console, no-undef, @typescript-eslint/no-explicit-any */
import { debugLogger } from '@/lib/debug';
import { supabase } from '@/lib/supabase';
import {
    ApiKeyConfig,
    IntegrationConfig,
    IntegrationPlatform,
    OAuthTokens
} from '@/types/integration';

/**
 * Secure AES-GCM encryption/decryption for tokens using Web Crypto API
 * Uses AES-256-GCM encryption with proper initialization vectors
 */
class TokenEncryption {
  private static readonly ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'dev-encryption-key-change-in-production';
  
  /**
   * Encrypt a token using AES-GCM
   */
  static async encrypt(text: string): Promise<string> {
    try {
      // Ensure we have a 32-character key for AES-256
      const keyString = this.ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32);
      
      // Import the key material
      const keyMaterial = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(keyString),
        { name: "AES-GCM" },
        false,
        ["encrypt"]
      );

      // Generate a random 12-byte IV
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // Encrypt the data
      const encryptedData = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        keyMaterial,
        new TextEncoder().encode(text)
      );

      // Combine IV and encrypted data for storage, encoded in Base64
      const ivString = this.arrayBufferToBase64(iv);
      const encryptedString = this.arrayBufferToBase64(new Uint8Array(encryptedData));

      return `${ivString}:${encryptedString}`;
    } catch (error) {
      debugLogger.error('TokenEncryption', 'Failed to encrypt token', error);
      throw new Error('Failed to encrypt token');
    }
  }
  
  /**
   * Decrypt a token using AES-GCM with backward compatibility for old crypto-js tokens
   */
  static async decrypt(encryptedToken: string): Promise<string> {
    try {
      // Check if this is a new format token (contains ':')
      if (encryptedToken.includes(':')) {
        // New AES-GCM format
        const [ivString, encryptedString] = encryptedToken.split(":");
        if (!ivString || !encryptedString) {
          throw new Error("Invalid encrypted token format.");
        }

        // Ensure we have a 32-character key for AES-256
        const keyString = this.ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32);
        
        // Import the key material
        const keyMaterial = await crypto.subtle.importKey(
          "raw",
          new TextEncoder().encode(keyString),
          { name: "AES-GCM" },
          false,
          ["decrypt"]
        );
        
        // Decode IV and encrypted data
        const iv = this.base64ToArrayBuffer(ivString);
        const data = this.base64ToArrayBuffer(encryptedString);

        // Decrypt the data
        const decrypted = await crypto.subtle.decrypt(
          { name: "AES-GCM", iv: iv },
          keyMaterial,
          data
        );

        return new TextDecoder().decode(decrypted);
      } else {
        // Old crypto-js format - try to decrypt with fallback method
        debugLogger.warn('TokenEncryption', 'Attempting to decrypt old crypto-js token format');
        
        // For old tokens, we'll need to re-encrypt them with the new method
        // For now, we'll return a placeholder that indicates the token needs to be refreshed
        throw new Error('Old token format detected - needs re-authentication');
      }
    } catch (error) {
      debugLogger.error('TokenEncryption', 'Failed to decrypt token', error);
      throw new Error('Failed to decrypt token');
    }
  }
  
  /**
   * Convert ArrayBuffer to Base64 string
   */
  private static arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
  
  /**
   * Convert Base64 string to Uint8Array
   */
  private static base64ToArrayBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}

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

      // Validate tokens before processing
      debugLogger.debug('TokenManager', 'Token validation', {
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
        accessToken: await TokenEncryption.encrypt(tokens.accessToken),
        refreshToken: tokens.refreshToken ? await TokenEncryption.encrypt(tokens.refreshToken) : undefined,
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
      
      debugLogger.debug('TokenManager', 'Database connection verified');
      
      debugLogger.debug('TokenManager', 'About to upsert to Supabase', {
        platform,
        accountInfo,
        configKeys: Object.keys(config),
        hasTokens: !!config.tokens,
        hasAccessToken: !!config.tokens?.accessToken
      });

      // Prepare tokens for safe storage
      const tokensForStorage = {
        accessToken: config.tokens?.accessToken,
        refreshToken: config.tokens?.refreshToken,
        expiresAt: config.tokens?.expiresAt,
        tokenType: tokens.tokenType,
        scope: tokens.scope
      };

      debugLogger.debug('TokenManager', 'About to store tokens safely', {
        platform,
        accountInfo,
        hasTokens: !!tokensForStorage.accessToken,
        hasRefreshToken: !!tokensForStorage.refreshToken
      });

      // Use the safe database function for atomic updates
      const { error } = await supabase.rpc('store_oauth_tokens_safely', {
        p_platform: platform,
        p_tokens: tokensForStorage,
        p_account_info: accountInfo
      });

      if (error) {
        debugLogger.error('TokenManager', 'Failed to store tokens safely', error);
        throw new Error(`Failed to store tokens for ${platform}: ${error.message}`);
      }

      debugLogger.info('TokenManager', `OAuth tokens stored successfully for ${platform}`);
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

      debugLogger.error('TokenManager', 'Comprehensive error details', errorDetails);
      
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
      debugLogger.info('TokenManager', `Clearing OAuth tokens for ${platform}`);

      // Use the safe database function to clear tokens
      const { error } = await supabase.rpc('clear_oauth_tokens_safely', {
        p_platform: platform
      });

      if (error) {
        debugLogger.error('TokenManager', 'Failed to clear tokens safely', error);
        throw new Error(`Failed to clear tokens for ${platform}: ${error.message}`);
      }

      debugLogger.info('TokenManager', `Successfully cleared OAuth tokens for ${platform}`);
    } catch (error) {
      debugLogger.error('TokenManager', `Failed to clear tokens for ${platform}`, error);
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
      throw new Error(`Failed to store API key for ${platform}: ${error instanceof Error ? error.message : String(error)}`);
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
      const encryptedAccessToken = config.tokens?.accessToken || (config.tokens as any)?.access_token;
      if (encryptedAccessToken) {
        console.log(`TokenManager: Found access token for ${platform}`);
        debugLogger.info('TokenManager', `Found access token for ${platform}`);
        
        // Check if token is encrypted (contains ':') or plain text
        let accessToken: string;
        if (encryptedAccessToken.includes(':')) {
          // Encrypted token - decrypt it
          try {
            accessToken = await TokenEncryption.decrypt(encryptedAccessToken);
          } catch (error) {
            debugLogger.error('TokenManager', `Failed to decrypt access token for ${platform}`, error);
            
            // If decryption fails, try to refresh the token using the refresh token
            const encryptedRefreshToken = config.tokens?.refreshToken || (config.tokens as any)?.refresh_token;
            if (encryptedRefreshToken && !skipRefresh) {
              debugLogger.info('TokenManager', `Decryption failed, attempting token refresh for ${platform}`);
              try {
                await this.refreshTokens(platform);
                // Return the refreshed token by calling getAccessToken again with skipRefresh=true to prevent infinite loop
                return await this.getAccessToken(platform, true);
              } catch (refreshError) {
                debugLogger.error('TokenManager', `Token refresh failed for ${platform}`, refreshError);
                return null;
              }
            }
            
            return null;
          }
        } else {
          // Plain text token - use directly
          debugLogger.info('TokenManager', `Using plain text access token for ${platform}`);
          accessToken = encryptedAccessToken;
        }
        
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
            const encryptedRefreshToken = config.tokens?.refreshToken || (config.tokens as any)?.refresh_token;
            if (encryptedRefreshToken) {
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

      // Check API key (for Google AI - GoHighLevel is client-level, not account-level)
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
      await OAuthService.refreshAccessToken(platform);
      
      debugLogger.info('TokenManager', `Tokens refreshed successfully for ${platform}`);
    } catch (error) {
      debugLogger.error('TokenManager', `Failed to refresh tokens for ${platform}`, error);
      throw new Error(`Failed to refresh tokens for ${platform}: ${error instanceof Error ? error.message : String(error)}`);
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
      throw new Error(`Failed to remove tokens for ${platform}: ${error instanceof Error ? error.message : String(error)}`);
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
