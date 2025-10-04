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
   * Get Facebook tokens from the database
   */
  static async getTokens(): Promise<FacebookTokens | null> {
    try {
      const { data, error } = await supabase
        .from('integrations')
        .select('config')
        .eq('platform', 'facebookAds')
        .eq('connected', true)
        .single();

      if (error) {
        debugLogger.error('FacebookTokenService', 'Error fetching Facebook tokens from database', error);
        return null;
      }

      if (!data?.config) {
        debugLogger.warn('FacebookTokenService', 'No Facebook config found in database');
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
      debugLogger.error('FacebookTokenService', 'Error getting Facebook tokens from database', error);
      return null;
    }
  }

  /**
   * Store Facebook tokens in the database
   */
  static async storeTokens(tokens: FacebookTokens, userInfo?: any): Promise<boolean> {
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
        debugLogger.error('FacebookTokenService', 'Error storing Facebook tokens in database', error);
        return false;
      }

      debugLogger.info('FacebookTokenService', 'Facebook tokens stored in database successfully');
      return true;
    } catch (error) {
      debugLogger.error('FacebookTokenService', 'Error storing Facebook tokens in database', error);
      return false;
    }
  }

  /**
   * Clear tokens from database
   */
  static async clearTokens(): Promise<boolean> {
    try {
      // Update database to disconnected
      const { error } = await supabase
        .from('integrations')
        .update({
          connected: false,
          config: {},
          updated_at: new Date().toISOString()
        })
        .eq('platform', 'facebookAds');

      if (error) {
        debugLogger.error('FacebookTokenService', 'Error clearing Facebook tokens from database', error);
        return false;
      }

      debugLogger.info('FacebookTokenService', 'Facebook tokens cleared from database');
      return true;
    } catch (error) {
      debugLogger.error('FacebookTokenService', 'Error clearing Facebook tokens', error);
      return false;
    }
  }
}