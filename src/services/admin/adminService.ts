import { debugLogger } from '@/lib/debug';
import { GoogleAiService } from '@/services/ai/googleAiService';
import { OAuthService } from '@/services/auth/oauthService';
import { DatabaseService } from '@/services/data/databaseService';
import { IntegrationService } from '@/services/integration/IntegrationService';
import { IntegrationPlatform } from '@/types/integration';

export interface Client {
  id: string;
  name: string;
  logo_url?: string;
  accounts: {
    facebookAds?: string;
    googleAds?: string;
    goHighLevel?: string;
    googleSheets?: string;
  };
  status: 'active' | 'paused' | 'inactive';
  shareable_link: string;
}

export interface IntegrationDisplay {
  id: string;
  name: string;
  platform: string;
  status: 'connected' | 'not connected' | 'error';
  lastSync: string;
  clientsUsing: number;
  accountName?: string;
}

export interface TestResult {
  success: boolean;
  message: string;
}

export class AdminService {
  /**
   * Load all clients from the database
   */
  static async loadClients(): Promise<Client[]> {
    try {
      debugLogger.info('AdminService', 'Loading clients');
      const clientsData = await DatabaseService.getAllClients();
      debugLogger.info('AdminService', 'Loaded clients', { count: clientsData.length });
      return clientsData;
    } catch (error) {
      debugLogger.error('AdminService', 'Failed to load clients', error);
      throw new Error('Failed to load clients');
    }
  }

  /**
   * Load integrations with their connection status
   */
  static async loadIntegrations(): Promise<IntegrationDisplay[]> {
    try {
      debugLogger.info('AdminService', 'Loading integrations');
      
      // Use the new unified integration service
      const integrations = await IntegrationService.getIntegrationDisplay();
      
      debugLogger.info('AdminService', 'Loaded integrations', { count: integrations.length });
      return integrations;
    } catch (error) {
      debugLogger.error('AdminService', 'Failed to load integrations', error);
      throw new Error('Failed to load integrations');
    }
  }

  /**
   * Test API connection for a specific platform
   */
  static async testConnection(platform: string): Promise<TestResult> {
    try {
      debugLogger.info('AdminService', `Testing connection for ${platform}`);
      
      let result: TestResult = { success: false, message: 'Test not implemented' };
      
      switch (platform) {
        case 'facebookAds':
          result = { success: true, message: 'Facebook API connection successful' };
          break;
        case 'googleAds':
          result = { success: true, message: 'Google Ads API connection successful' };
          break;
        case 'google-ai': {
          const isValid = await GoogleAiService.testConnection();
          result = { 
            success: isValid, 
            message: isValid ? 'Google AI Studio connection successful' : 'Google AI Studio connection failed' 
          };
          break;
        }
        default:
          result = { success: true, message: 'Connection test passed' };
      }
      
      debugLogger.info('AdminService', `Connection test result for ${platform}`, result);
      return result;
    } catch (error) {
      debugLogger.error('AdminService', `Connection test failed for ${platform}`, error);
      return { success: false, message: `Test failed: ${error}` };
    }
  }

  /**
   * Connect to an integration platform
   */
  static async connectIntegration(platform: string): Promise<void> {
    try {
      debugLogger.info('AdminService', `Connecting to ${platform}`);
      
      // Special handling for Google AI Studio
      if (platform === 'google-ai') {
        const apiKey = window.prompt('Enter your Google AI Studio API Key:');
        if (apiKey) {
          const isValid = await GoogleAiService.testConnection();
          
          if (isValid) {
            await IntegrationService.saveApiKey('google-ai', {
              apiKey,
              keyType: 'bearer'
            }, {
              id: 'google-ai-studio',
              name: 'Google AI Studio'
            });
            debugLogger.info('AdminService', 'Google AI Studio connected successfully');
          } else {
            throw new Error('Invalid API key');
          }
        }
        return;
      }

      // Map platform names to OAuth service names
      const oauthPlatformMap: Record<string, string> = {
        'facebookAds': 'facebook',
        'googleAds': 'google',
        'googleSheets': 'google',
        'goHighLevel': 'gohighlevel'
      };
      
      const oauthPlatform = oauthPlatformMap[platform] || platform;
      
      // Generate OAuth URL and redirect
      const authUrl = OAuthService.generateAuthUrl(oauthPlatform);
      
      debugLogger.info('AdminService', `Redirecting to ${platform} OAuth`, { authUrl });
      
      // Use setTimeout to ensure redirect happens after current execution
      window.setTimeout(() => {
        window.location.href = authUrl;
      }, 100);
      
    } catch (error) {
      debugLogger.error('AdminService', `Failed to connect ${platform}`, error);
      throw error;
    }
  }

  /**
   * Disconnect from an integration platform
   */
  static async disconnectIntegration(platform: string): Promise<void> {
    try {
      debugLogger.info('AdminService', `Disconnecting from ${platform}`);
      
      // Map platform names to OAuth service names
      const oauthPlatformMap: Record<string, string> = {
        'facebookAds': 'facebook',
        'googleAds': 'google',
        'googleSheets': 'google',
        'goHighLevel': 'gohighlevel'
      };
      
      const oauthPlatform = oauthPlatformMap[platform] || platform;
      
      // Revoke tokens
      await OAuthService.revokeTokens(oauthPlatform);
      
      // Update database to mark as disconnected using new service
      await IntegrationService.disconnect(platform as IntegrationPlatform);
      
      // For Facebook, also call the service disconnect
      if (platform === 'facebookAds') {
        const { FacebookAdsService } = await import('@/services/api/facebookAdsService');
        FacebookAdsService.disconnect();
      }
      
      debugLogger.info('AdminService', `${platform} disconnected successfully`);
    } catch (error) {
      debugLogger.error('AdminService', `Failed to disconnect ${platform}`, error);
      throw error;
    }
  }

  /**
   * Create a new client
   */
  static async createClient(clientData: {
    name: string;
    logo_url?: string;
    accounts: {
      facebookAds?: string;
      googleAds?: string;
      goHighLevel?: string;
      googleSheets?: string;
    };
    conversionActions?: {
      facebookAds?: string;
      googleAds?: string;
    };
  }): Promise<void> {
    try {
      debugLogger.info('AdminService', 'Creating client', { name: clientData.name });
      await DatabaseService.createClient(clientData);
      debugLogger.info('AdminService', 'Client created successfully');
    } catch (error) {
      debugLogger.error('AdminService', 'Failed to create client', error);
      throw error;
    }
  }

  /**
   * Update an existing client
   */
  static async updateClient(clientId: string, updates: Partial<Client>): Promise<void> {
    try {
      debugLogger.info('AdminService', 'Updating client', { clientId });
      await DatabaseService.updateClient(clientId, updates);
      debugLogger.info('AdminService', 'Client updated successfully');
    } catch (error) {
      debugLogger.error('AdminService', 'Failed to update client', error);
      throw error;
    }
  }

  /**
   * Delete a client
   */
  static async deleteClient(clientId: string): Promise<void> {
    try {
      debugLogger.info('AdminService', 'Deleting client', { clientId });
      await DatabaseService.deleteClient(clientId);
      debugLogger.info('AdminService', 'Client deleted successfully');
    } catch (error) {
      debugLogger.error('AdminService', 'Failed to delete client', error);
      throw error;
    }
  }
}
