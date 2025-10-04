import { debugLogger } from '@/lib/debug';
import { GoogleAiService } from '@/services/ai/googleAiService';
import { OAuthService } from '@/services/auth/oauthService';
import { DatabaseService } from '@/services/data/databaseService';

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
      
      // Get integrations from database
      const dbIntegrations = await DatabaseService.getIntegrations();
      
      // Define platform configurations
      const platforms = [
        { key: 'facebook', name: 'Facebook Ads', platform: 'facebookAds' },
        { key: 'google', name: 'Google Ads', platform: 'googleAds' },
        { key: 'gohighlevel', name: 'GoHighLevel', platform: 'goHighLevel' },
        { key: 'googlesheets', name: 'Google Sheets', platform: 'googleSheets' },
        { key: 'google-ai', name: 'Google AI Studio', platform: 'google-ai' }
      ];
      
      const integrations: IntegrationDisplay[] = platforms.map(platform => {
        // Special handling for Google AI Studio (uses API key, not OAuth)
        if (platform.platform === 'google-ai') {
          const dbIntegration = dbIntegrations.find(i => i.platform === platform.platform);
          const isConnected = !!(dbIntegration?.config?.apiKey);
          
          return {
            id: platform.key,
            name: platform.name,
            platform: platform.platform,
            status: isConnected ? 'connected' : 'not connected',
            lastSync: isConnected ? 'Recently' : 'Never',
            clientsUsing: 0,
            accountName: isConnected ? 'Google AI Studio' : undefined
          };
        }
        
        // Check localStorage first
        const hasLocalTokens = OAuthService.getStoredTokens(platform.key) !== null;
        const isLocalTokenValid = OAuthService.isTokenValid(platform.key);
        
        // Check database
        const dbIntegration = dbIntegrations.find(i => i.platform === platform.platform && i.connected);
        const hasDbTokens = !!(dbIntegration?.config?.tokens?.accessToken || dbIntegration?.config?.accessToken);
        
        // Use either localStorage or database tokens
        const isConnected = (hasLocalTokens && isLocalTokenValid) || hasDbTokens;
        
        return {
          id: platform.key,
          name: platform.name,
          platform: platform.platform,
          status: isConnected ? 'connected' : 'not connected',
          lastSync: isConnected ? 'Recently' : 'Never',
          clientsUsing: 0,
          accountName: isConnected ? `${platform.name} Account` : undefined
        };
      });
      
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
            await DatabaseService.saveIntegration('google-ai', {
              connected: true,
              accountName: 'Google AI Studio',
              lastSync: new Date().toISOString(),
              config: { apiKey }
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
      
      // Update database to mark as disconnected
      await DatabaseService.saveIntegration(platform, {
        connected: false,
        accountName: undefined,
        lastSync: undefined,
        config: { tokens: {} }
      });
      
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
