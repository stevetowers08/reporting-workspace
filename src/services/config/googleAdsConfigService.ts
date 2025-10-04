import { debugLogger } from '@/lib/debug';
import { DatabaseService } from '../data/databaseService';

export interface GoogleAdsConfig {
  id?: string;
  developerToken: string;
  clientId: string;
  clientSecret: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export class GoogleAdsConfigService {

  /**
   * Get the active Google Ads configuration
   */
  static async getActiveConfig(): Promise<GoogleAdsConfig | null> {
    try {
      // Try to get from database first
      const configs = await DatabaseService.getGoogleAdsConfigs();
      const activeConfig = configs.find(config => config.isActive);
      
      if (activeConfig) {
        return activeConfig;
      }

      // Fallback to environment variables
      const envConfig: GoogleAdsConfig = {
        developerToken: import.meta.env.VITE_GOOGLE_ADS_DEVELOPER_TOKEN || '',
        clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
        clientSecret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '',
        isActive: true
      };

      return envConfig.developerToken ? envConfig : null;
    } catch (error) {
      debugLogger.error('GoogleAdsConfigService', 'Error getting Google Ads config', error);
      return null;
    }
  }

  /**
   * Save Google Ads configuration to database
   */
  static async saveConfig(config: Omit<GoogleAdsConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<GoogleAdsConfig> {
    try {
      // Deactivate all existing configs
      await DatabaseService.deactivateAllGoogleAdsConfigs();
      
      // Save new config
      const savedConfig = await DatabaseService.saveGoogleAdsConfig(config);
      return savedConfig;
    } catch (error) {
      debugLogger.error('GoogleAdsConfigService', 'Error saving Google Ads config', error);
      throw error;
    }
  }

  /**
   * Update existing Google Ads configuration
   */
  static async updateConfig(id: string, updates: Partial<GoogleAdsConfig>): Promise<GoogleAdsConfig> {
    try {
      const updatedConfig = await DatabaseService.updateGoogleAdsConfig(id, updates);
      return updatedConfig;
    } catch (error) {
      debugLogger.error('GoogleAdsConfigService', 'Error updating Google Ads config', error);
      throw error;
    }
  }

  /**
   * Get all Google Ads configurations
   */
  static async getAllConfigs(): Promise<GoogleAdsConfig[]> {
    try {
      return await DatabaseService.getGoogleAdsConfigs();
    } catch (error) {
      debugLogger.error('GoogleAdsConfigService', 'Error getting Google Ads configs', error);
      return [];
    }
  }

  /**
   * Delete Google Ads configuration
   */
  static async deleteConfig(id: string): Promise<boolean> {
    try {
      return await DatabaseService.deleteGoogleAdsConfig(id);
    } catch (error) {
      console.error('Error deleting Google Ads config:', error);
      return false;
    }
  }

  /**
   * Test Google Ads configuration
   */
  static async testConfig(config: GoogleAdsConfig): Promise<{ success: boolean; error?: string }> {
    try {
      // Test with a simple API call
      const response = await fetch('https://googleads.googleapis.com/v14/customers:listAccessibleCustomers', {
        headers: {
          'developer-token': config.developerToken,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        return { success: true };
      } else {
        const errorData = await response.json();
        return { 
          success: false, 
          error: errorData.error?.message || `HTTP ${response.status}` 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}
