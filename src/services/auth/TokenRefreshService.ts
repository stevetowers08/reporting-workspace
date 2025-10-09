import { debugLogger } from '@/lib/debug';
import { IntegrationPlatform } from '@/types/integration';
import { TokenManager } from './TokenManager';

/**
 * TokenRefreshService - Automatic token refresh service
 * 
 * This service handles automatic refresh of OAuth tokens before they expire.
 * It runs periodically to check for tokens that need refreshing and refreshes them proactively.
 */
export class TokenRefreshService {
  private static readonly REFRESH_CHECK_INTERVAL = 30 * 60 * 1000; // 30 minutes
  private static readonly REFRESH_THRESHOLD = 10 * 60 * 1000; // 10 minutes before expiration
  private static refreshTimer: ReturnType<typeof setInterval> | null = null;
  private static isRunning = false;

  /**
   * Start the automatic token refresh service
   */
  static start(): void {
    if (this.isRunning) {
      debugLogger.warn('TokenRefreshService', 'Service is already running');
      return;
    }

    debugLogger.info('TokenRefreshService', 'Starting automatic token refresh service');
    this.isRunning = true;

    // Run immediately on start
    this.checkAndRefreshTokens();

    // Set up periodic refresh
    this.refreshTimer = setInterval(() => {
      this.checkAndRefreshTokens();
    }, this.REFRESH_CHECK_INTERVAL);

    debugLogger.info('TokenRefreshService', `Service started - checking every ${this.REFRESH_CHECK_INTERVAL / 60000} minutes`);
  }

  /**
   * Stop the automatic token refresh service
   */
  static stop(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.isRunning = false;
    debugLogger.info('TokenRefreshService', 'Automatic token refresh service stopped');
  }

  /**
   * Check all platforms for tokens that need refreshing
   */
  private static async checkAndRefreshTokens(): Promise<void> {
    try {
      debugLogger.info('TokenRefreshService', 'Checking tokens for refresh');

      const platforms: IntegrationPlatform[] = ['googleAds', 'googleSheets', 'facebookAds'];
      const refreshPromises = platforms.map(platform => this.checkPlatformTokens(platform));

      await Promise.allSettled(refreshPromises);
      
      debugLogger.info('TokenRefreshService', 'Token refresh check completed');
    } catch (error) {
      debugLogger.error('TokenRefreshService', 'Error during token refresh check', error);
    }
  }

  /**
   * Check if a specific platform's tokens need refreshing
   */
  private static async checkPlatformTokens(platform: IntegrationPlatform): Promise<void> {
    try {
      // Check if tokens need refresh
      const needsRefresh = await TokenManager.needsTokenRefresh(platform);
      
      if (needsRefresh) {
        debugLogger.info('TokenRefreshService', `Refreshing tokens for ${platform}`);
        
        // Check if token is close to expiration (within threshold)
        const isCloseToExpiry = await this.isTokenCloseToExpiry(platform);
        
        if (isCloseToExpiry) {
          await TokenManager.refreshTokens(platform);
          debugLogger.info('TokenRefreshService', `Successfully refreshed tokens for ${platform}`);
        } else {
          debugLogger.info('TokenRefreshService', `Tokens for ${platform} need refresh but not close to expiry yet`);
        }
      } else {
        debugLogger.debug('TokenRefreshService', `Tokens for ${platform} are still valid`);
      }
    } catch (error) {
      debugLogger.error('TokenRefreshService', `Error checking tokens for ${platform}`, error);
      // Don't throw - we want to continue checking other platforms
    }
  }

  /**
   * Check if a token is close to expiration (within refresh threshold)
   */
  private static async isTokenCloseToExpiry(platform: IntegrationPlatform): Promise<boolean> {
    try {
      const expirationInfo = await TokenManager.getTokenExpirationInfo(platform);
      
      if (!expirationInfo.expiresAt) {
        return false; // No expiration time means it's not close to expiry
      }

      const expiresAt = new Date(expirationInfo.expiresAt);
      const now = new Date();
      const timeUntilExpiry = expiresAt.getTime() - now.getTime();

      return timeUntilExpiry <= this.REFRESH_THRESHOLD;
    } catch (error) {
      debugLogger.error('TokenRefreshService', `Error checking token expiry for ${platform}`, error);
      return false;
    }
  }

  /**
   * Manually trigger a token refresh check
   */
  static async refreshNow(): Promise<void> {
    debugLogger.info('TokenRefreshService', 'Manual token refresh triggered');
    await this.checkAndRefreshTokens();
  }

  /**
   * Get service status
   */
  static getStatus(): { isRunning: boolean; interval: number } {
    return {
      isRunning: this.isRunning,
      interval: this.REFRESH_CHECK_INTERVAL
    };
  }
}
