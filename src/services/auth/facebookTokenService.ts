import { debugLogger } from '@/lib/debug';
import { supabase } from '@/lib/supabase';

export interface FacebookTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType: string;
  scope?: string;
}

export class FacebookTokenService {
  /**
   * Get Facebook tokens from the backend/database
   */
  static async getTokensFromBackend(): Promise<FacebookTokens | null> {
    try {
      const { data, error } = await supabase
        .from('integrations')
        .select('config')
        .eq('platform', 'facebookAds')
        .eq('connected', true)
        .single();

      if (error) {
        debugLogger.error('FacebookTokenService', 'Error fetching Facebook tokens from backend', error);
        return null;
      }

      if (!data?.config) {
        debugLogger.warn('FacebookTokenService', 'No Facebook config found in backend');
        return null;
      }

      // Extract tokens from config
      const config = data.config;
      if (config.accessToken) {
        return {
          accessToken: config.accessToken,
          refreshToken: config.refreshToken,
          expiresIn: config.expiresIn,
          tokenType: config.tokenType || 'Bearer',
          scope: config.scope
        };
      }

      debugLogger.warn('FacebookTokenService', 'No access token found in Facebook config');
      return null;
    } catch (error) {
      debugLogger.error('FacebookTokenService', 'Error getting Facebook tokens from backend', error);
      return null;
    }
  }

  /**
   * Store Facebook tokens in the backend/database
   */
  static async storeTokensInBackend(tokens: FacebookTokens, userInfo?: any): Promise<boolean> {
    try {
      const config = {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        tokenType: tokens.tokenType,
        scope: tokens.scope,
        user: userInfo,
        lastUpdated: new Date().toISOString()
      };

      const { error } = await supabase
        .from('integrations')
        .upsert({
          platform: 'facebookAds',
          connected: true,
          config: config,
          updated_at: new Date().toISOString()
        }, { onConflict: 'platform' });

      if (error) {
        debugLogger.error('FacebookTokenService', 'Error storing Facebook tokens in backend', error);
        return false;
      }

      debugLogger.info('FacebookTokenService', 'Facebook tokens stored in backend successfully');
      return true;
    } catch (error) {
      debugLogger.error('FacebookTokenService', 'Error storing Facebook tokens in backend', error);
      return false;
    }
  }

  /**
   * Get Facebook tokens from localStorage (existing method)
   */
  static getTokensFromLocalStorage(): FacebookTokens | null {
    try {
      const storedTokens = localStorage.getItem('oauth_tokens_facebook');
      if (!storedTokens) return null;

      const tokens = JSON.parse(storedTokens);
      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        tokenType: tokens.tokenType || 'Bearer',
        scope: tokens.scope
      };
    } catch (error) {
      debugLogger.error('FacebookTokenService', 'Error parsing Facebook tokens from localStorage', error);
      return null;
    }
  }

  /**
   * Get Facebook tokens from any available source (localStorage first, then backend)
   */
  static async getTokens(): Promise<FacebookTokens | null> {
    // First try localStorage
    const localTokens = this.getTokensFromLocalStorage();
    if (localTokens?.accessToken) {
      debugLogger.debug('FacebookTokenService', 'Using Facebook tokens from localStorage');
      return localTokens;
    }

    // Fallback to backend
    debugLogger.debug('FacebookTokenService', 'No localStorage tokens, fetching from backend');
    return await this.getTokensFromBackend();
  }

  /**
   * Store tokens in both localStorage and backend
   */
  static async storeTokens(tokens: FacebookTokens, userInfo?: any): Promise<boolean> {
    try {
      // Store in localStorage
      localStorage.setItem('oauth_tokens_facebook', JSON.stringify({
        ...tokens,
        timestamp: Date.now()
      }));

      // Store in backend
      await this.storeTokensInBackend(tokens, userInfo);

      debugLogger.info('FacebookTokenService', 'Facebook tokens stored in both localStorage and backend');
      return true;
    } catch (error) {
      debugLogger.error('FacebookTokenService', 'Error storing Facebook tokens', error);
      return false;
    }
  }

  /**
   * Clear tokens from both localStorage and backend
   */
  static async clearTokens(): Promise<boolean> {
    try {
      // Clear localStorage
      localStorage.removeItem('oauth_tokens_facebook');
      localStorage.removeItem('oauth_state_facebook');

      // Update backend to disconnected
      const { error } = await supabase
        .from('integrations')
        .update({
          connected: false,
          config: {},
          updated_at: new Date().toISOString()
        })
        .eq('platform', 'facebookAds');

      if (error) {
        debugLogger.error('FacebookTokenService', 'Error clearing Facebook tokens from backend', error);
        return false;
      }

      debugLogger.info('FacebookTokenService', 'Facebook tokens cleared from both localStorage and backend');
      return true;
    } catch (error) {
      debugLogger.error('FacebookTokenService', 'Error clearing Facebook tokens', error);
      return false;
    }
  }
}
