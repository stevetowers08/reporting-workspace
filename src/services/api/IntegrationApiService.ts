import { debugLogger } from '@/lib/debug';
import { supabase } from '@/lib/supabase';
import {
  IntegrationConfig,
  IntegrationPlatform,
  OAuthTokens,
  ApiKeyConfig,
  AccountInfo,
  IntegrationDisplay
} from '@/types/integration';

/**
 * API Service - Uses Supabase Edge Functions for integration management
 * 
 * This service provides a clean API layer that:
 * - Uses Edge Functions instead of direct database access
 * - Provides better error handling and validation
 * - Enables rate limiting and security policies
 * - Supports caching and performance optimization
 */
export class IntegrationApiService {
  private static readonly BASE_URL = 'https://bdmcdyxjdkgitphieklb.supabase.co/functions/v1';
  
  /**
   * Get authentication headers for API requests
   */
  private static async getAuthHeaders(): Promise<HeadersInit> {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || supabase.supabaseKey;
    
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'apikey': supabase.supabaseKey
    };
  }

  /**
   * Make API request to Edge Function
   */
  private static async makeRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    try {
      const headers = await this.getAuthHeaders();
      const url = `${this.BASE_URL}${endpoint}`;
      
      debugLogger.info('IntegrationApiService', `Making API request to ${endpoint}`, {
        method: options.method || 'GET',
        url
      });

      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorData.error || 'Unknown error'}`);
      }

      const data = await response.json();
      debugLogger.info('IntegrationApiService', `API request successful`, {
        endpoint,
        status: response.status
      });

      return data;
    } catch (error) {
      debugLogger.error('IntegrationApiService', `API request failed for ${endpoint}`, error);
      throw error;
    }
  }

  /**
   * Get all integrations
   */
  static async getAllIntegrations(): Promise<IntegrationConfig[]> {
    try {
      debugLogger.info('IntegrationApiService', 'Fetching all integrations via API');
      const response = await this.makeRequest('/integrations');
      
      if (!response.success) {
        throw new Error('Failed to fetch integrations');
      }

      return response.data.map((integration: any) => integration.config as IntegrationConfig);
    } catch (error) {
      debugLogger.error('IntegrationApiService', 'Error fetching all integrations', error);
      throw new Error(`Failed to fetch integrations: ${error.message}`);
    }
  }

  /**
   * Get specific integration
   */
  static async getIntegration(platform: IntegrationPlatform): Promise<IntegrationConfig | null> {
    try {
      debugLogger.info('IntegrationApiService', `Fetching integration for ${platform} via API`);
      const response = await this.makeRequest(`/integrations/${platform}`);
      
      if (!response.success) {
        if (response.error === 'Integration not found') {
          return null;
        }
        throw new Error(response.error || 'Failed to fetch integration');
      }

      return response.data.config as IntegrationConfig;
    } catch (error) {
      debugLogger.error('IntegrationApiService', `Error fetching integration ${platform}`, error);
      if (error.message.includes('Integration not found')) {
        return null;
      }
      throw new Error(`Failed to fetch integration: ${error.message}`);
    }
  }

  /**
   * Save OAuth tokens
   */
  static async saveOAuthTokens(
    platform: IntegrationPlatform,
    tokens: OAuthTokens,
    accountInfo: AccountInfo,
    metadata?: Record<string, any>,
    settings?: Record<string, any>
  ): Promise<IntegrationConfig> {
    try {
      debugLogger.info('IntegrationApiService', `Saving OAuth tokens for ${platform} via API`);
      
      const response = await this.makeRequest('/oauth-tokens', {
        method: 'POST',
        body: JSON.stringify({
          platform,
          tokens,
          accountInfo,
          metadata,
          settings
        })
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to save OAuth tokens');
      }

      // Return the updated config
      const integration = await this.getIntegration(platform);
      if (!integration) {
        throw new Error('Failed to retrieve saved integration');
      }

      return integration;
    } catch (error) {
      debugLogger.error('IntegrationApiService', `Error saving OAuth tokens for ${platform}`, error);
      throw new Error(`Failed to save OAuth tokens: ${error.message}`);
    }
  }

  /**
   * Save API key
   */
  static async saveApiKey(
    platform: IntegrationPlatform,
    apiKeyConfig: ApiKeyConfig,
    accountInfo: AccountInfo,
    metadata?: Record<string, any>,
    settings?: Record<string, any>
  ): Promise<IntegrationConfig> {
    try {
      debugLogger.info('IntegrationApiService', `Saving API key for ${platform} via API`);
      
      const response = await this.makeRequest('/oauth-tokens', {
        method: 'POST',
        body: JSON.stringify({
          platform,
          apiKey: apiKeyConfig,
          accountInfo,
          metadata,
          settings
        })
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to save API key');
      }

      // Return the updated config
      const integration = await this.getIntegration(platform);
      if (!integration) {
        throw new Error('Failed to retrieve saved integration');
      }

      return integration;
    } catch (error) {
      debugLogger.error('IntegrationApiService', `Error saving API key for ${platform}`, error);
      throw new Error(`Failed to save API key: ${error.message}`);
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
      debugLogger.info('IntegrationApiService', `Refreshing tokens for ${platform} via API`);
      
      const response = await this.makeRequest(`/oauth-tokens/${platform}`, {
        method: 'PUT',
        body: JSON.stringify({
          platform,
          tokens: newTokens
        })
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to refresh tokens');
      }

      // Return the updated config
      const integration = await this.getIntegration(platform);
      if (!integration) {
        throw new Error('Failed to retrieve refreshed integration');
      }

      return integration;
    } catch (error) {
      debugLogger.error('IntegrationApiService', `Error refreshing tokens for ${platform}`, error);
      throw new Error(`Failed to refresh tokens: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Disconnect integration
   */
  static async disconnect(platform: IntegrationPlatform): Promise<void> {
    try {
      debugLogger.info('IntegrationApiService', `Disconnecting ${platform} via API`);
      
      const response = await this.makeRequest(`/oauth-tokens/${platform}`, {
        method: 'DELETE'
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to disconnect integration');
      }

      debugLogger.info('IntegrationApiService', `${platform} disconnected successfully via API`);
    } catch (error) {
      debugLogger.error('IntegrationApiService', `Error disconnecting ${platform}`, error);
      throw new Error(`Failed to disconnect integration: ${error instanceof Error ? error.message : String(error)}`);
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
      debugLogger.info('IntegrationApiService', `Getting tokens for ${platform} via API`);
      
      const response = await this.makeRequest(`/oauth-tokens/${platform}`);

      if (!response.success) {
        if (response.error === 'No tokens found for this platform') {
          return null;
        }
        if (response.error === 'Token expired') {
          return {
            tokens: undefined,
            apiKey: undefined,
            accountInfo: undefined,
            expiresAt: response.expiresAt,
            needsRefresh: true
          };
        }
        throw new Error(response.error || 'Failed to get tokens');
      }

      return response.data;
    } catch (error) {
      debugLogger.error('IntegrationApiService', `Error getting tokens for ${platform}`, error);
      if (error instanceof Error && (error.message.includes('No tokens found') || error.message.includes('Token expired'))) {
        return null;
      }
      throw new Error(`Failed to get tokens: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get integration display data
   */
  static async getIntegrationDisplay(): Promise<IntegrationDisplay[]> {
    try {
      debugLogger.info('IntegrationApiService', 'Fetching integration display data via API');
      const integrations = await this.getAllIntegrations();

      const platforms = [
        { key: 'facebook', name: 'Facebook Ads', platform: 'facebookAds' as IntegrationPlatform },
        { key: 'google', name: 'Google Ads', platform: 'googleAds' as IntegrationPlatform },
        { key: 'gohighlevel', name: 'GoHighLevel', platform: 'goHighLevel' as IntegrationPlatform },
        { key: 'googlesheets', name: 'Google Sheets', platform: 'googleSheets' as IntegrationPlatform },
        { key: 'google-ai', name: 'Google AI Studio', platform: 'google-ai' as IntegrationPlatform }
      ];

      return platforms.map(p => {
        const integration = integrations.find(i => i.id === p.key);
        const isConnected = !!(integration?.tokens?.accessToken || integration?.apiKey?.apiKey);

        return {
          id: p.key,
          name: p.name,
          platform: p.platform,
          status: isConnected ? 'connected' : 'not connected',
          lastSync: integration?.lastSync || 'Never',
          clientsUsing: 0, // This would require a join or separate query
          accountName: integration?.accountInfo?.name || (isConnected ? `${p.name} Account` : undefined)
        };
      });
    } catch (error) {
      debugLogger.error('IntegrationApiService', 'Error fetching integration display data', error);
      throw new Error(`Failed to fetch integration display data: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Test API connection
   */
  static async testConnection(): Promise<boolean> {
    try {
      debugLogger.info('IntegrationApiService', 'Testing API connection');
      await this.makeRequest('/integrations');
      return true;
    } catch (error) {
      debugLogger.error('IntegrationApiService', 'API connection test failed', error);
      return false;
    }
  }
}
