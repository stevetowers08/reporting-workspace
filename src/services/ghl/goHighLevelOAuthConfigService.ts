// GoHighLevel OAuth Configuration Service
// Handles OAuth app registration and configuration management

import { debugLogger } from '@/lib/debug';
import { supabase } from '@/lib/supabase';

export interface GHLAppConfig {
  appName: string;
  appType: 'Private' | 'Public';
  targetUser: 'Sub-account' | 'Agency';
  whoCanInstall: 'Both Agency & Sub-account' | 'Agency Only' | 'Sub-account Only';
  listingType: 'white-label' | 'public';
  logo?: string;
  companyName: string;
  description: string;
  previewImages?: string[];
}

export interface GHLOAuthCredentials {
  clientId: string;
  clientSecret: string;
  redirectUris: string[];
  scopes: string[];
  webhookUrl?: string;
  webhookEvents?: string[];
}

export interface GHLInstallationUrl {
  url: string;
  expiresAt: string;
}

export class GoHighLevelOAuthConfigService {
  /**
   * Get recommended OAuth configuration for development
   */
  static getRecommendedConfig(): GHLAppConfig {
    return {
      appName: 'Marketing Analytics Dashboard',
      appType: 'Private', // Start with Private during development
      targetUser: 'Sub-account',
      whoCanInstall: 'Both Agency & Sub-account',
      listingType: 'white-label',
      companyName: 'Tulen Agency',
      description: 'Comprehensive marketing analytics dashboard for Facebook Ads, Google Ads, and GoHighLevel data integration.',
      previewImages: []
    };
  }

  /**
   * Get production OAuth configuration
   */
  static getProductionConfig(): GHLAppConfig {
    return {
      appName: 'Marketing Analytics Dashboard',
      appType: 'Public', // Switch to Public for production
      targetUser: 'Sub-account',
      whoCanInstall: 'Both Agency & Sub-account',
      listingType: 'white-label',
      companyName: 'Tulen Agency',
      description: 'Professional marketing analytics dashboard providing unified insights across Facebook Ads, Google Ads, and GoHighLevel platforms.',
      previewImages: []
    };
  }

  /**
   * Get required scopes for the application
   * Based on GoHighLevel OAuth 2.0 documentation
   */
  static getRequiredScopes(): string[] {
    return [
      // Calendar management
      'calendars.readonly',
      'calendars/events.readonly',
      'calendars.write',
      'calendars/events.write',
      'calendars/groups.readonly',
      'calendars/groups.write',
      'calendars/resources.readonly',
      'calendars/resources.write',
      
      // Business and company data
      'businesses.readonly',
      'businesses.write',
      'companies.readonly',
      
      // Contact and opportunity management
      'contacts.readonly',
      'contacts.write',
      'opportunities.readonly',
      'opportunities.write',
      
      // Funnel and page data
      'funnels/funnel.readonly',
      'funnels/page.readonly',
      
      // Location data
      'locations.readonly'
    ];
  }

  /**
   * Get optional scopes for advanced features
   */
  static getOptionalScopes(): string[] {
    return [
      'campaigns.readonly',
      'campaigns.write',
      'reports.readonly',
      'users.readonly',
      'settings.readonly',
      'settings.write'
    ];
  }

  /**
   * Get minimum required scopes (for testing)
   */
  static getMinimumScopes(): string[] {
    return [
      'contacts.readonly',
      'opportunities.readonly',
      'calendars.readonly',
      'locations.readonly'
    ];
  }

  /**
   * Save OAuth credentials to database
   */
  static async saveOAuthCredentials(credentials: GHLOAuthCredentials): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('oauth_credentials')
        .upsert({
          platform: 'goHighLevel',
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
          redirect_uri: credentials.redirectUris.join(','),
          scopes: credentials.scopes.join(' '),
          auth_url: 'https://marketplace.leadconnectorhq.com/oauth/chooselocation',
          token_url: 'https://services.leadconnectorhq.com/oauth/token',
          webhook_config: {
            webhook_url: credentials.webhookUrl,
            events: credentials.webhookEvents || ['app.install'],
            is_active: !!credentials.webhookUrl
          },
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'platform'
        });

      if (error) {
        debugLogger.error('GoHighLevelOAuthConfigService', 'Failed to save OAuth credentials', error);
        return false;
      }

      debugLogger.info('GoHighLevelOAuthConfigService', 'OAuth credentials saved successfully');
      return true;
    } catch (error) {
      debugLogger.error('GoHighLevelOAuthConfigService', 'Error saving OAuth credentials', error);
      return false;
    }
  }

  /**
   * Get OAuth credentials from database
   */
  static async getOAuthCredentials(): Promise<GHLOAuthCredentials | null> {
    try {
      const { data, error } = await supabase
        .from('oauth_credentials')
        .select('*')
        .eq('platform', 'goHighLevel')
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          debugLogger.info('GoHighLevelOAuthConfigService', 'No OAuth credentials found');
          return null;
        }
        throw error;
      }

      return {
        clientId: data.client_id,
        clientSecret: data.client_secret,
        redirectUris: data.redirect_uri.split(','),
        scopes: data.scopes.split(' '),
        webhookUrl: data.webhook_config?.webhook_url,
        webhookEvents: data.webhook_config?.events
      };
    } catch (error) {
      debugLogger.error('GoHighLevelOAuthConfigService', 'Error getting OAuth credentials', error);
      return null;
    }
  }

  /**
   * Generate installation URL for GoHighLevel app
   * This URL should be provided to agency/location admins
   */
  static async generateInstallationUrl(): Promise<GHLInstallationUrl | null> {
    try {
      const credentials = await this.getOAuthCredentials();
      if (!credentials) {
        throw new Error('OAuth credentials not configured');
      }

      // The installation URL is typically provided by GoHighLevel in the app dashboard
      // This is a placeholder - the actual URL should be retrieved from the app configuration
      const installationUrl = `https://marketplace.leadconnectorhq.com/app/${credentials.clientId}/install`;
      
      // Set expiration to 24 hours from now
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      debugLogger.info('GoHighLevelOAuthConfigService', 'Installation URL generated', {
        url: installationUrl,
        expiresAt
      });

      return {
        url: installationUrl,
        expiresAt
      };
    } catch (error) {
      debugLogger.error('GoHighLevelOAuthConfigService', 'Error generating installation URL', error);
      return null;
    }
  }

  /**
   * Validate OAuth configuration
   */
  static validateOAuthConfig(credentials: GHLOAuthCredentials): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!credentials.clientId) {
      errors.push('Client ID is required');
    }

    if (!credentials.clientSecret) {
      errors.push('Client Secret is required');
    }

    if (!credentials.redirectUris || credentials.redirectUris.length === 0) {
      errors.push('At least one redirect URI is required');
    }

    if (!credentials.scopes || credentials.scopes.length === 0) {
      errors.push('At least one scope is required');
    }

    // Validate redirect URIs format
    credentials.redirectUris.forEach((uri, index) => {
      try {
        new URL(uri);
        if (!uri.startsWith('https://')) {
          errors.push(`Redirect URI ${index + 1} must use HTTPS`);
        }
      } catch {
        errors.push(`Redirect URI ${index + 1} is not a valid URL`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get OAuth configuration instructions for manual setup
   */
  static getSetupInstructions(): {
    steps: string[];
    requiredFields: string[];
    recommendedSettings: Record<string, string>;
  } {
    return {
      steps: [
        '1. Go to GoHighLevel Marketplace → My Apps → Create App',
        '2. Fill in app profile with recommended settings',
        '3. Configure Auth settings:',
        '   - Add redirect URL(s)',
        '   - Select required scopes',
        '   - Generate Client ID & Client Secret',
        '4. Configure webhook URL in Advanced Settings → Webhooks',
        '5. Save the Client ID and Client Secret securely',
        '6. Update environment variables with credentials'
      ],
      requiredFields: [
        'APP Name',
        'APP Type (Private recommended for development)',
        'Target User (Sub-account recommended)',
        'Who can install (Both Agency & Sub-account recommended)',
        'Listing Type (white-label recommended)',
        'Company Name',
        'Description',
        'Redirect URL(s)',
        'Scopes',
        'Client ID',
        'Client Secret'
      ],
      recommendedSettings: {
        'APP Type': 'Private (for development) / Public (for production)',
        'Target User': 'Sub-account',
        'Who can install': 'Both Agency & Sub-account',
        'Listing Type': 'white-label',
        'Redirect URI': 'https://yourdomain.com/oauth/callback',
        'Webhook URL': 'https://yourdomain.com/webhooks/goHighLevel'
      }
    };
  }
}
