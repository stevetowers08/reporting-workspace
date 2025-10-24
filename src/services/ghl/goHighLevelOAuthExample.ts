// GoHighLevel OAuth Integration Example
// Demonstrates the complete OAuth 2.0 flow implementation

import { debugLogger } from '@/lib/debug';
import { GoHighLevelOAuthConfigService } from '@/services/ghl/goHighLevelOAuthConfigService';
import { GoHighLevelWebhookService } from '@/services/ghl/goHighLevelWebhookService';
import { GHLTokenData, SimpleGHLService } from '@/services/ghl/simpleGHLService';

export class GoHighLevelOAuthExample {
  /**
   * Complete OAuth setup process
   */
  static async setupOAuthIntegration(): Promise<void> {
    try {
      debugLogger.info('GoHighLevelOAuthExample', 'Starting OAuth setup');

      // 1. Get recommended configuration
      const appConfig = GoHighLevelOAuthConfigService.getRecommendedConfig();
      const requiredScopes = GoHighLevelOAuthConfigService.getRequiredScopes();
      
      debugLogger.info('GoHighLevelOAuthExample', 'App configuration', {
        appName: appConfig.appName,
        appType: appConfig.appType,
        scopesCount: requiredScopes.length
      });

      // 2. Save OAuth credentials (this would be done after manual app registration)
      const credentials = {
        clientId: import.meta.env.VITE_GHL_CLIENT_ID,
        clientSecret: import.meta.env.VITE_GHL_CLIENT_SECRET,
        redirectUris: [
          'https://tulenreporting.vercel.app/oauth/callback',
          'http://localhost:5173/oauth/callback' // For development
        ],
        scopes: requiredScopes,
        webhookUrl: 'https://reporting.tulenagency.com/webhooks/goHighLevel',
        webhookEvents: ['app.install']
      };

      // Validate configuration
      const validation = GoHighLevelOAuthConfigService.validateOAuthConfig(credentials);
      if (!validation.isValid) {
        throw new Error(`Invalid OAuth configuration: ${validation.errors.join(', ')}`);
      }

      // Save credentials to database
      const saved = await GoHighLevelOAuthConfigService.saveOAuthCredentials(credentials);
      if (!saved) {
        throw new Error('Failed to save OAuth credentials');
      }

      debugLogger.info('GoHighLevelOAuthExample', 'OAuth setup completed successfully');
    } catch (error) {
      debugLogger.error('GoHighLevelOAuthExample', 'OAuth setup failed', error);
      throw error;
    }
  }

  /**
   * Generate authorization URL for user to connect their GoHighLevel account
   */
  static async generateAuthUrl(): Promise<string> {
    try {
      const clientId = import.meta.env.VITE_GHL_CLIENT_ID;
      const redirectUri = window.location.hostname === 'localhost' 
        ? 'http://localhost:5173/oauth/callback'
        : 'https://tulenreporting.vercel.app/oauth/callback';

      if (!clientId) {
        throw new Error('GoHighLevel client ID not configured');
      }

      // Generate authorization URL with PKCE
      const authUrl = await SimpleGHLService.getAuthorizationUrl(
        clientId,
        redirectUri,
        GoHighLevelOAuthConfigService.getRequiredScopes()
      );

      debugLogger.info('GoHighLevelOAuthExample', 'Generated authorization URL', {
        hasUrl: !!authUrl,
        redirectUri
      });

      return authUrl;
    } catch (error) {
      debugLogger.error('GoHighLevelOAuthExample', 'Failed to generate auth URL', error);
      throw error;
    }
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  static async handleOAuthCallback(code: string, state?: string): Promise<GHLTokenData> {
    try {
      debugLogger.info('GoHighLevelOAuthExample', 'Handling OAuth callback', {
        hasCode: !!code,
        hasState: !!state
      });

      const clientId = import.meta.env.VITE_GHL_CLIENT_ID;
      const redirectUri = window.location.hostname === 'localhost' 
        ? 'http://localhost:5173/oauth/callback'
        : 'https://tulenreporting.vercel.app/oauth/callback';

      if (!clientId) {
        throw new Error('GoHighLevel client ID not configured');
      }

      // Exchange authorization code for tokens
      const tokenData = await SimpleGHLService.exchangeCodeForToken(
        code,
        clientId,
        redirectUri,
        state
      );

      // Save tokens to database
      const saved = await SimpleGHLService.saveLocationToken(
        tokenData.locationId,
        tokenData.access_token,
        tokenData.scope?.split(' ') || [],
        tokenData.refresh_token,
        tokenData.expires_in
      );

      if (!saved) {
        throw new Error('Failed to save tokens to database');
      }

      debugLogger.info('GoHighLevelOAuthExample', 'OAuth callback handled successfully', {
        locationId: tokenData.locationId,
        hasRefreshToken: !!tokenData.refresh_token
      });

      return tokenData;
    } catch (error) {
      debugLogger.error('GoHighLevelOAuthExample', 'OAuth callback handling failed', error);
      throw error;
    }
  }

  /**
   * Refresh access token when it expires
   */
  static async refreshAccessToken(locationId: string): Promise<string | null> {
    try {
      debugLogger.info('GoHighLevelOAuthExample', 'Refreshing access token', { locationId });

      const validToken = await SimpleGHLService.getValidToken(locationId);
      
      if (validToken) {
        debugLogger.info('GoHighLevelOAuthExample', 'Token is still valid', { locationId });
        return validToken;
      }

      debugLogger.info('GoHighLevelOAuthExample', 'Token needs refresh', { locationId });
      return null; // Token refresh is handled automatically by getValidToken
    } catch (error) {
      debugLogger.error('GoHighLevelOAuthExample', 'Token refresh failed', error);
      return null;
    }
  }

  /**
   * Create location token from agency token (for multi-location management)
   */
  static async createLocationTokenFromAgency(
    agencyAccessToken: string,
    companyId: string,
    locationId: string
  ): Promise<string | null> {
    try {
      debugLogger.info('GoHighLevelOAuthExample', 'Creating location token from agency token', {
        companyId,
        locationId
      });

      const locationTokenData = await SimpleGHLService.createLocationToken(
        agencyAccessToken,
        companyId,
        locationId
      );

      // Save the location token
      const saved = await SimpleGHLService.saveLocationToken(
        locationId,
        locationTokenData.access_token,
        locationTokenData.scope.split(' '),
        undefined, // No refresh token for location tokens
        locationTokenData.expires_in
      );

      if (!saved) {
        throw new Error('Failed to save location token');
      }

      debugLogger.info('GoHighLevelOAuthExample', 'Location token created successfully', {
        locationId,
        expiresIn: locationTokenData.expires_in
      });

      return locationTokenData.access_token;
    } catch (error) {
      debugLogger.error('GoHighLevelOAuthExample', 'Location token creation failed', error);
      return null;
    }
  }

  /**
   * Handle webhook events (app install, etc.)
   */
  static async handleWebhookEvent(eventData: Record<string, unknown>): Promise<boolean> {
    try {
      debugLogger.info('GoHighLevelOAuthExample', 'Handling webhook event', {
        type: eventData.type,
        appId: eventData.appId
      });

      if (eventData.type === 'app.install') {
        const success = await GoHighLevelWebhookService.processAppInstallEvent(eventData);
        
        if (success) {
          debugLogger.info('GoHighLevelOAuthExample', 'App install event processed successfully', {
            locationId: eventData.locationId
          });
        }
        
        return success;
      }

      debugLogger.info('GoHighLevelOAuthExample', 'Unhandled webhook event type', {
        type: eventData.type
      });

      return true; // Acknowledge the webhook even if we don't handle it
    } catch (error) {
      debugLogger.error('GoHighLevelOAuthExample', 'Webhook event handling failed', error);
      return false;
    }
  }

  /**
   * Get installation status for a location
   */
  static async getInstallationStatus(locationId: string): Promise<{
    isInstalled: boolean;
    isConnected: boolean;
    status: string;
  }> {
    try {
      const status = await GoHighLevelWebhookService.getInstallationStatus(locationId);
      
      return {
        isInstalled: status.isInstalled,
        isConnected: status.integrationStatus === 'connected',
        status: status.integrationStatus || 'not_installed'
      };
    } catch (error) {
      debugLogger.error('GoHighLevelOAuthExample', 'Failed to get installation status', error);
      return {
        isInstalled: false,
        isConnected: false,
        status: 'error'
      };
    }
  }

  /**
   * Get setup instructions for manual OAuth configuration
   */
  static getSetupInstructions(): {
    steps: string[];
    requiredFields: string[];
    recommendedSettings: Record<string, string>;
  } {
    return GoHighLevelOAuthConfigService.getSetupInstructions();
  }
}
