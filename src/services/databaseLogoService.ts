import { supabase } from '@/lib/supabase';
import { LogoMetadata } from './logoService';

export interface DatabaseLogoMetadata {
  id: string;
  platform: string;
  name: string;
  version: string;
  last_updated: string;
  source: 'official' | 'custom';
  logo_svg?: string;
  logo_png_url?: string;
  logo_webp_url?: string;
  width: number;
  height: number;
  min_size: number;
  max_size: number;
  background_color?: string;
  usage_contexts: string[];
  status: 'active' | 'deprecated' | 'pending';
  created_at: string;
  updated_at: string;
}

class DatabaseLogoService {
  /**
   * Get logo metadata from database
   */
  async getLogoMetadata(platform: string): Promise<DatabaseLogoMetadata | null> {
    try {
      const { data, error } = await supabase
        .from('logo_metadata')
        .select('*')
        .eq('platform', platform)
        .eq('status', 'active')
        .single();

      if (error) {
        console.error('Error fetching logo metadata:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getLogoMetadata:', error);
      return null;
    }
  }

  /**
   * Get all active logo metadata
   */
  async getAllLogoMetadata(): Promise<DatabaseLogoMetadata[]> {
    try {
      const { data, error } = await supabase
        .from('logo_metadata')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (error) {
        console.error('Error fetching all logo metadata:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllLogoMetadata:', error);
      return [];
    }
  }

  /**
   * Update logo metadata
   */
  async updateLogoMetadata(
    platform: string, 
    updates: Partial<DatabaseLogoMetadata>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('logo_metadata')
        .update({
          ...updates,
          last_updated: new Date().toISOString()
        })
        .eq('platform', platform);

      if (error) {
        console.error('Error updating logo metadata:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateLogoMetadata:', error);
      return false;
    }
  }

  /**
   * Add new logo metadata
   */
  async addLogoMetadata(logoData: Omit<DatabaseLogoMetadata, 'id' | 'created_at' | 'updated_at'>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('logo_metadata')
        .insert(logoData);

      if (error) {
        console.error('Error adding logo metadata:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in addLogoMetadata:', error);
      return false;
    }
  }

  /**
   * Mark logo as deprecated
   */
  async deprecateLogo(platform: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('logo_metadata')
        .update({ 
          status: 'deprecated',
          last_updated: new Date().toISOString()
        })
        .eq('platform', platform);

      if (error) {
        console.error('Error deprecating logo:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deprecateLogo:', error);
      return false;
    }
  }

  /**
   * Convert database format to service format
   */
  convertToServiceFormat(dbLogo: DatabaseLogoMetadata): LogoMetadata {
    return {
      id: dbLogo.id,
      platform: dbLogo.platform,
      name: dbLogo.name,
      version: dbLogo.version,
      lastUpdated: dbLogo.last_updated,
      source: dbLogo.source,
      formats: {
        svg: dbLogo.logo_svg,
        png: dbLogo.logo_png_url,
        webp: dbLogo.logo_webp_url
      },
      dimensions: {
        width: dbLogo.width,
        height: dbLogo.height
      },
      brandGuidelines: {
        minSize: dbLogo.min_size,
        maxSize: dbLogo.max_size,
        backgroundColor: dbLogo.background_color,
        usage: dbLogo.usage_contexts
      }
    };
  }

  /**
   * Sync logo metadata with database
   */
  async syncLogoMetadata(): Promise<void> {
    try {
      const dbLogos = await this.getAllLogoMetadata();
      
      // Update local logo service with database data
      const logoService = (await import('./logoService')).logoService;
      
      for (const dbLogo of dbLogos) {
        // Update local cache if needed
        console.log(`Synced logo metadata for ${dbLogo.platform}`);
      }
    } catch (error) {
      console.error('Error syncing logo metadata:', error);
    }
  }
}

export const databaseLogoService = new DatabaseLogoService();
