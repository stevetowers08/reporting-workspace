// Google Ads Configuration Service
import { DatabaseService } from '@/services/data/databaseService';
import { debugLogger } from '@/lib/debug';

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
  static async getAllConfigs(): Promise<GoogleAdsConfig[]> {
    try {
      const configs = await DatabaseService.getGoogleAdsConfigs();
      return configs.map(config => ({
        id: config.id,
        developerToken: config.developer_token,
        clientId: config.client_id,
        clientSecret: config.client_secret,
        isActive: config.is_active,
        createdAt: config.created_at,
        updatedAt: config.updated_at
      }));
    } catch (error) {
      debugLogger.error('GoogleAdsConfigService', 'Error getting all configs', error);
      throw error;
    }
  }

  static async getConfig(): Promise<GoogleAdsConfig | null> {
    try {
      const config = await DatabaseService.getActiveGoogleAdsConfig();
      if (!config) return null;
      
      return {
        id: config.id,
        developerToken: config.developer_token,
        clientId: config.client_id,
        clientSecret: config.client_secret,
        isActive: config.is_active,
        createdAt: config.created_at,
        updatedAt: config.updated_at
      };
    } catch (error) {
      debugLogger.error('GoogleAdsConfigService', 'Error getting config', error);
      return null;
    }
  }
  
  static async saveConfig(config: Omit<GoogleAdsConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<GoogleAdsConfig> {
    try {
      // Deactivate all other configs if this one is active
      if (config.isActive) {
        await DatabaseService.deactivateAllGoogleAdsConfigs();
      }

      const saved = await DatabaseService.saveGoogleAdsConfig({
        developer_token: config.developerToken,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        is_active: config.isActive
      });

      return {
        id: saved.id,
        developerToken: saved.developer_token,
        clientId: saved.client_id,
        clientSecret: saved.client_secret,
        isActive: saved.is_active,
        createdAt: saved.created_at,
        updatedAt: saved.updated_at
      };
    } catch (error) {
      debugLogger.error('GoogleAdsConfigService', 'Error saving config', error);
      throw error;
    }
  }

  static async updateConfig(id: string, updates: Partial<Omit<GoogleAdsConfig, 'id' | 'createdAt' | 'updatedAt'>>): Promise<GoogleAdsConfig> {
    try {
      // If setting this config as active, deactivate all others
      if (updates.isActive === true) {
        await DatabaseService.deactivateAllGoogleAdsConfigs();
      }

      const updateData: any = {};
      if (updates.developerToken !== undefined) updateData.developer_token = updates.developerToken;
      if (updates.clientId !== undefined) updateData.client_id = updates.clientId;
      if (updates.clientSecret !== undefined) updateData.client_secret = updates.clientSecret;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

      const updated = await DatabaseService.updateGoogleAdsConfig(id, updateData);

      return {
        id: updated.id,
        developerToken: updated.developer_token,
        clientId: updated.client_id,
        clientSecret: updated.client_secret,
        isActive: updated.is_active,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at
      };
    } catch (error) {
      debugLogger.error('GoogleAdsConfigService', 'Error updating config', error);
      throw error;
    }
  }

  static async deleteConfig(id: string): Promise<void> {
    try {
      await DatabaseService.deleteGoogleAdsConfig(id);
    } catch (error) {
      debugLogger.error('GoogleAdsConfigService', 'Error deleting config', error);
      throw error;
    }
  }

  static async testConfig(config: GoogleAdsConfig): Promise<{ success: boolean; error?: string }> {
    try {
      // Basic validation - check if token format looks correct
      if (!config.developerToken || config.developerToken.length < 10) {
        return { success: false, error: 'Developer token appears to be invalid (too short)' };
      }

      // TODO: Add actual API test here
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}
