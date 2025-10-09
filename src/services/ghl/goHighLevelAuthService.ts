// GoHighLevel Authentication Service

import { debugLogger } from '@/lib/debug';
import { supabase } from '@/lib/supabase';
import { GHLRateLimiter, GHLValidator } from './goHighLevelUtils';
import type { GHLTokenData, GHLAccount } from './goHighLevelTypes';

export class GoHighLevelAuthService {
  private static readonly API_BASE_URL = 'https://services.leadconnectorhq.com';
  private static readonly API_VERSION = '2021-07-28';
  private static agencyToken: string | null = null;
  private static locationTokens: Map<string, string> = new Map();

  // OAuth Methods
  static getAuthorizationUrl(clientId: string, redirectUri: string, scopes: string[] = []): string {
    const baseUrl = 'https://marketplace.leadconnectorhq.com/oauth/chooselocation';
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes.join(' ')
    });
    return `${baseUrl}?${params.toString()}`;
  }

  static async exchangeCodeForToken(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
  ): Promise<GHLTokenData> {
    await GHLRateLimiter.enforceRateLimit();

    const response = await fetch(`${this.API_BASE_URL}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        user_type: 'Company'
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || errorData.message || `Token exchange failed: ${response.statusText}`;
      throw new Error(errorMessage);
    }

    const tokenData = await response.json();
    
    if (!tokenData.access_token) {
      throw new Error('No access token received from GoHighLevel');
    }

    if (!tokenData.locationId) {
      throw new Error('No location ID received from GoHighLevel');
    }

    if (!GHLValidator.validateLocationId(tokenData.locationId)) {
      throw new Error('Invalid location ID format received from GoHighLevel');
    }

    debugLogger.info('GoHighLevelAuthService', 'Token exchange successful', {
      locationId: tokenData.locationId,
      hasRefreshToken: !!tokenData.refresh_token
    });

    return tokenData;
  }

  // Token Management
  static setAgencyToken(token: string): void {
    if (!GHLValidator.validateToken(token)) {
      throw new Error('Invalid agency token format');
    }
    this.agencyToken = token;
    debugLogger.info('GoHighLevelAuthService', 'Agency token set');
  }

  static setCredentials(accessToken: string, locationId: string): void {
    if (!GHLValidator.validateToken(accessToken) || !GHLValidator.validateLocationId(locationId)) {
      throw new Error('Invalid credentials format');
    }
    this.setLocationToken(locationId, accessToken);
    debugLogger.info('GoHighLevelAuthService', 'Location credentials set', { locationId });
  }

  private static setLocationToken(locationId: string, token: string): void {
    this.locationTokens.set(locationId, token);
  }

  static getLocationToken(locationId: string): string | null {
    return this.locationTokens.get(locationId) || null;
  }

  // Agency Token Management
  static async ensureAgencyToken(): Promise<void> {
    if (!this.agencyToken) {
      await this.loadAgencyTokenFromDb();
    }
  }

  static async getAgencyToken(): Promise<string> {
    await this.ensureAgencyToken();
    if (!this.agencyToken) {
      throw new Error('Agency token not available');
    }
    return this.agencyToken;
  }

  private static async loadAgencyTokenFromDb(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('integrations')
        .select('config')
        .eq('platform', 'goHighLevel')
        .single();

      if (error || !data?.config?.apiKey?.apiKey) {
        debugLogger.warn('GoHighLevelAuthService', 'No agency token found in database');
        return;
      }

      this.agencyToken = data.config.apiKey.apiKey;
      debugLogger.info('GoHighLevelAuthService', 'Agency token loaded from database');
    } catch (error) {
      debugLogger.error('GoHighLevelAuthService', 'Error loading agency token', error);
    }
  }

  // Token Testing
  static async testAgencyToken(token: string): Promise<{
    success: boolean;
    message: string;
    locations?: any[];
    capabilities?: any;
  }> {
    try {
      if (!GHLValidator.validateToken(token)) {
        throw new Error('Invalid token format. Private integration tokens should start with "pit-"');
      }

      const originalToken = this.agencyToken;
      this.agencyToken = token;

      try {
        // Test basic API access
        const accountResponse = await this.makeApiRequest('/accounts/me');
        const account = accountResponse.account;

        // Test location access
        let locations: any[] = [];
        let capabilities = {
          canListLocations: false,
          canAccessContacts: false
        };

        try {
          const locationsResponse = await this.makeApiRequest('/locations');
          if (Array.isArray(locationsResponse)) {
            locations = locationsResponse;
            capabilities.canListLocations = true;
            debugLogger.info('GoHighLevelAuthService', 'Agency token can list locations', { count: locations.length });
          }
        } catch (error) {
          debugLogger.warn('GoHighLevelAuthService', 'Cannot list locations with agency token', error);
        }

        // Test contacts access with first location
        if (locations.length > 0) {
          try {
            const testLocationId = locations[0]?.id || '';
            const contactsResponse = await this.makeApiRequest(`/contacts?locationId=${testLocationId}`);
            capabilities.canAccessContacts = contactsResponse.ok;
            debugLogger.info('GoHighLevelAuthService', 'Contacts access test', { success: contactsResponse.ok });
          } catch (error) {
            debugLogger.warn('GoHighLevelAuthService', 'Cannot access contacts', error);
          }
        }

        return {
          success: true,
          message: 'Agency token is valid',
          locations,
          capabilities
        };
      } finally {
        this.agencyToken = originalToken;
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Account Info
  static async getAccountInfo(): Promise<GHLAccount> {
    await GHLRateLimiter.enforceRateLimit();
    await this.ensureAgencyToken();
    
    if (!this.agencyToken) {
      throw new Error('Private integration token not set');
    }

    const response = await this.makeApiRequest('/accounts/me') as { account: GHLAccount };
    return response.account;
  }

  static async getCompanyInfo(): Promise<{ companyId: string }> {
    await GHLRateLimiter.enforceRateLimit();
    await this.ensureAgencyToken();
    
    if (!this.agencyToken) {
      throw new Error('Private integration token not set');
    }

    const response = await this.makeApiRequest('/accounts/me') as { account: { companyId: string } };
    return { companyId: response.account.companyId };
  }

  // Core API Request Method
  private static async makeApiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    await GHLRateLimiter.enforceRateLimit();
    
    if (!this.agencyToken) {
      throw new Error('Private integration token not set');
    }

    const url = `${this.API_BASE_URL}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.agencyToken}`,
      'Version': this.API_VERSION,
      'Content-Type': 'application/json',
      ...options.headers
    };

    debugLogger.debug('GoHighLevelAuthService', 'Making API request', { url, method: options.method || 'GET' });

    const response = await fetch(url, {
      ...options,
      headers
    });

    // Handle rate limiting
    if (response.status === 429) {
      await GHLRateLimiter.handleRateLimitError(response);
      // Retry the request
      return this.makeApiRequest<T>(endpoint, options);
    }

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `API request failed: ${response.statusText}`;
      
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch {
        // Use default error message if JSON parsing fails
      }
      
      throw new Error(errorMessage);
    }

    return response.json();
  }

  // Webhook Management
  static verifyWebhookSignature(): boolean {
    // Implementation for webhook signature verification
    // This would typically involve HMAC verification
    return true;
  }

  static async setupWebhook(locationId: string, webhookUrl: string, events: string[]): Promise<void> {
    await GHLRateLimiter.enforceRateLimit();
    await this.ensureAgencyToken();
    
    if (!this.agencyToken) {
      throw new Error('Private integration token not set');
    }

    await this.makeApiRequest('/webhooks', {
      method: 'POST',
      body: JSON.stringify({
        locationId,
        webhookUrl,
        events
      })
    });
  }
}
