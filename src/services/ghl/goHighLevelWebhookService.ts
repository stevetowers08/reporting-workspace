// GoHighLevel Webhook Service
// Handles app install events and other webhook notifications

import { debugLogger } from '@/lib/debug';
import { supabase } from '@/lib/supabase';

export interface GHLAppInstallEvent {
  type: string;
  appId: string;
  versionId: string;
  installType: string;
  locationId: string;
  companyId: string;
  userId: string;
  companyName: string;
  isWhitelabelCompany: boolean;
  whitelabelDetails?: {
    companyName: string;
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
  };
  timestamp: string;
  webhookId: string;
}

export interface GHLWebhookConfig {
  webhookUrl: string;
  events: string[];
  isActive: boolean;
}

export class GoHighLevelWebhookService {
  /**
   * Process app install webhook event
   */
  static async processAppInstallEvent(event: GHLAppInstallEvent): Promise<boolean> {
    try {
      debugLogger.info('GoHighLevelWebhookService', 'Processing app install event', {
        appId: event.appId,
        locationId: event.locationId,
        companyId: event.companyId,
        installType: event.installType
      });

      // Store the installation event in database
      const { error } = await supabase
        .from('ghl_installations')
        .upsert({
          app_id: event.appId,
          version_id: event.versionId,
          install_type: event.installType,
          location_id: event.locationId,
          company_id: event.companyId,
          user_id: event.userId,
          company_name: event.companyName,
          is_whitelabel: event.isWhitelabelCompany,
          whitelabel_details: event.whitelabelDetails,
          installed_at: event.timestamp,
          webhook_id: event.webhookId,
          status: 'active'
        }, {
          onConflict: 'app_id,location_id'
        });

      if (error) {
        debugLogger.error('GoHighLevelWebhookService', 'Failed to store installation event', error);
        return false;
      }

      // Create integration record for the location
      await this.createIntegrationRecord(event);

      debugLogger.info('GoHighLevelWebhookService', 'App install event processed successfully', {
        locationId: event.locationId
      });

      return true;
    } catch (error) {
      debugLogger.error('GoHighLevelWebhookService', 'Error processing app install event', error);
      return false;
    }
  }

  /**
   * Create integration record for the installed location
   */
  private static async createIntegrationRecord(event: GHLAppInstallEvent): Promise<void> {
    try {
      const { error } = await supabase
        .from('integrations')
        .upsert({
          platform: 'goHighLevel',
          account_id: event.locationId,
          connected: false, // Will be true once OAuth is completed
          config: {
            accountInfo: {
              id: event.locationId,
              name: event.companyName,
              companyId: event.companyId,
              userId: event.userId,
              isWhitelabel: event.isWhitelabelCompany,
              whitelabelDetails: event.whitelabelDetails
            },
            installation: {
              appId: event.appId,
              versionId: event.versionId,
              installType: event.installType,
              installedAt: event.timestamp,
              webhookId: event.webhookId
            },
            lastSync: new Date().toISOString(),
            syncStatus: 'pending_oauth',
            connectedAt: null
          }
        }, {
          onConflict: 'platform,account_id'
        });

      if (error) {
        debugLogger.error('GoHighLevelWebhookService', 'Failed to create integration record', error);
        throw error;
      }

      debugLogger.info('GoHighLevelWebhookService', 'Integration record created', {
        locationId: event.locationId
      });
    } catch (error) {
      debugLogger.error('GoHighLevelWebhookService', 'Error creating integration record', error);
      throw error;
    }
  }

  /**
   * Verify webhook signature (if GoHighLevel provides signature verification)
   */
  static verifyWebhookSignature(_payload: string, _signature: string, _secret: string): boolean {
    // Note: GoHighLevel documentation doesn't specify signature verification
    // This is a placeholder for future implementation if they add it
    debugLogger.info('GoHighLevelWebhookService', 'Webhook signature verification not implemented');
    return true;
  }

  /**
   * Get webhook configuration for GoHighLevel app
   */
  static async getWebhookConfig(): Promise<GHLWebhookConfig | null> {
    try {
      const { data, error } = await supabase
        .from('oauth_credentials')
        .select('webhook_config')
        .eq('platform', 'goHighLevel')
        .eq('is_active', true)
        .single();

      if (error) {
        debugLogger.error('GoHighLevelWebhookService', 'Failed to get webhook config', error);
        return null;
      }

      return data?.webhook_config || null;
    } catch (error) {
      debugLogger.error('GoHighLevelWebhookService', 'Error getting webhook config', error);
      return null;
    }
  }

  /**
   * Update webhook configuration
   */
  static async updateWebhookConfig(config: GHLWebhookConfig): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('oauth_credentials')
        .update({
          webhook_config: config,
          updated_at: new Date().toISOString()
        })
        .eq('platform', 'goHighLevel')
        .eq('is_active', true);

      if (error) {
        debugLogger.error('GoHighLevelWebhookService', 'Failed to update webhook config', error);
        return false;
      }

      debugLogger.info('GoHighLevelWebhookService', 'Webhook config updated successfully');
      return true;
    } catch (error) {
      debugLogger.error('GoHighLevelWebhookService', 'Error updating webhook config', error);
      return false;
    }
  }

  /**
   * Get installation status for a location
   */
  static async getInstallationStatus(locationId: string): Promise<{
    isInstalled: boolean;
    installationData?: Record<string, unknown>;
    integrationStatus?: string;
  }> {
    try {
      // Check installation record
      const { data: installation } = await supabase
        .from('ghl_installations')
        .select('*')
        .eq('location_id', locationId)
        .eq('status', 'active')
        .single();

      // Check integration status
      const { data: integration } = await supabase
        .from('integrations')
        .select('connected, config')
        .eq('platform', 'goHighLevel')
        .eq('account_id', locationId)
        .single();

      return {
        isInstalled: !!installation,
        installationData: installation,
        integrationStatus: integration?.connected ? 'connected' : 'pending_oauth'
      };
    } catch (error) {
      debugLogger.error('GoHighLevelWebhookService', 'Error getting installation status', error);
      return { isInstalled: false };
    }
  }
}
