// GoHighLevel Authentication Service

import { debugLogger } from '@/lib/debug';
import { supabase } from '@/lib/supabase';
import type { GHLAccount, GHLTokenData } from './goHighLevelTypes';
import { GHLRateLimiter, GHLValidator } from './goHighLevelUtils';

export class GoHighLevelAuthService {
  private static readonly API_BASE_URL = 'https://services.leadconnectorhq.com';
  private static readonly API_VERSION = '2021-04-15'; // API 2.0 version header
  private static agencyToken: string | null = null;
  private static locationTokens: Map<string, string> = new Map();

  // OAuth Methods
  static async getAuthorizationUrl(clientId: string, redirectUri: string, scopes: string[] = [], stateData?: Record<string, unknown>): Promise<string> {
    const baseUrl = 'https://marketplace.leadconnectorhq.com/oauth/chooselocation';
    
    // Generate PKCE code verifier and challenge
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);
    
    // Store code verifier for later use
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('oauth_code_verifier_goHighLevel', codeVerifier);
    }
    
    // Create state parameter with code verifier for backend access
    const statePayload = {
      ...stateData,
      codeVerifier: codeVerifier,
      timestamp: Date.now()
    };
    const state = btoa(JSON.stringify(statePayload));
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state: state
    });

    debugLogger.info('GoHighLevelAuthService', 'Generated authorization URL with PKCE', {
      baseUrl,
      redirectUri,
      scopes: scopes.join(' '),
      hasCodeChallenge: !!codeChallenge,
      hasState: !!state,
      stateLength: state.length
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

    // Get PKCE code verifier
    const codeVerifier = typeof window !== 'undefined' 
      ? window.sessionStorage.getItem('oauth_code_verifier_goHighLevel')
      : null;

    if (!codeVerifier) {
      throw new Error('Code verifier not found. Please try connecting again.');
    }

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
        user_type: 'Location',
        code_verifier: codeVerifier
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

    // Log OAuth scopes if available
    if (tokenData.scope) {
      const scopes = tokenData.scope.split(' ');
      debugLogger.info('GoHighLevelAuthService', 'OAuth token scopes', { scopes });
    }

    return tokenData;
  }

  // Utility method to decode and log OAuth token scopes
  static logTokenScopes(token: string): void {
    try {
      // Decode JWT token to get scopes (if it's a JWT)
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        if (payload.scope) {
          const scopes = payload.scope.split(' ');
          debugLogger.info('GoHighLevelAuthService', 'Token scopes decoded', { scopes });
        }
      }
    } catch (error) {
      debugLogger.warn('GoHighLevelAuthService', 'Could not decode token scopes', error);
    }
  }

  // Agency Token Management (DEPRECATED - Use client OAuth tokens instead)
  static setAgencyToken(token: string): void {
    // setAgencyToken is deprecated. Use client-specific OAuth tokens instead.
    if (!GHLValidator.validateToken(token)) {
      throw new Error('Invalid agency token format');
    }
    this.agencyToken = token;
    debugLogger.info('GoHighLevelAuthService', 'Agency token set (deprecated)');
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

  static async getAllLocationTokens(): Promise<Array<{ locationId: string; token: string }>> {
    try {
      const { data, error } = await supabase
        .from('integrations')
        .select('account_id, config')
        .eq('platform', 'goHighLevel')
        .eq('connected', true);

      if (error) {
        debugLogger.error('GoHighLevelAuthService', 'Error loading location tokens', error);
        return [];
      }

      const tokens: Array<{ locationId: string; token: string }> = [];
      
      for (const integration of data || []) {
        const accessToken = integration.config?.tokens?.accessToken;
        if (accessToken && integration.account_id) {
          tokens.push({
            locationId: integration.account_id,
            token: accessToken
          });
        }
      }

      debugLogger.info('GoHighLevelAuthService', `Loaded ${tokens.length} location tokens`);
      return tokens;
    } catch (error) {
      debugLogger.error('GoHighLevelAuthService', 'Error loading location tokens', error);
      return [];
    }
  }

  // Agency Token Management
  static async ensureAgencyToken(): Promise<void> {
    if (!this.agencyToken) {
      await this.loadAgencyTokenFromDb();
    }
  }

  static async getAgencyToken(): Promise<string> {
    // Get the first available location token instead of agency token
    const locationTokens = await this.getAllLocationTokens();
    if (locationTokens.length === 0) {
      throw new Error('No GoHighLevel location tokens available');
    }
    
    // Return the first available token
    const firstToken = locationTokens[0];
    debugLogger.info('GoHighLevelAuthService', 'Using location token as agency token', { 
      locationId: firstToken.locationId 
    });
    return firstToken.token;
  }

  private static async loadAgencyTokenFromDb(): Promise<void> {
    // This method is deprecated - we now use location tokens instead
    // Keeping for backward compatibility but it will not load anything
    debugLogger.warn('GoHighLevelAuthService', 'loadAgencyTokenFromDb is deprecated - use location tokens instead');
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
        const accountResponse = await this.makeApiRequest('/accounts/me') as any;
        const _account = accountResponse.account;

        // Test location access
        let locations: any[] = [];
        const capabilities = {
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
            const contactsResponse = await this.makeApiRequest(`/contacts?locationId=${testLocationId}`) as any;
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

  // PKCE Helper Methods
  private static generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, Array.from(array)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  private static async generateCodeChallenge(codeVerifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(digest))))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
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
