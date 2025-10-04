import { debugLogger } from '@/lib/debug';
import { supabase } from '@/lib/supabase';

// Browser API types
declare const fetch: typeof globalThis.fetch;
declare const crypto: globalThis.Crypto;
declare const TextEncoder: typeof globalThis.TextEncoder;
declare const URLSearchParams: typeof globalThis.URLSearchParams;

export interface GHLAccount {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
  website: string;
  timezone: string;
  currency: string;
  status: string;
}

export interface GHLContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  source: string;
  tags: string[];
  customFields: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface GHLCampaign {
  id: string;
  name: string;
  status: string;
  type: string;
  startDate: string;
  endDate?: string;
  budget?: number;
  metrics: {
    impressions: number;
    clicks: number;
    conversions: number;
    cost: number;
  };
}

export interface GHLAppCredentials {
  id: string;
  client_id: string;
  client_secret: string;
  shared_secret: string;
  redirect_uri: string;
  environment: string;
  is_active: boolean;
}

export class GoHighLevelService {
  private static readonly API_BASE_URL = 'https://rest.gohighlevel.com/v1';
  private static readonly OAUTH_BASE_URL = 'https://services.leadconnectorhq.com';
  
  private static accessToken: string | null = null;
  private static locationId: string | null = null;

  /**
   * Get GHL app credentials from database
   */
  private static async getCredentials(): Promise<GHLAppCredentials | null> {
    try {
      const { data, error } = await supabase
        .from('ghl_app_credentials')
        .select('*')
        .eq('is_active', true)
        .eq('environment', import.meta.env.DEV ? 'development' : 'production')
        .single();

      if (error) {
        debugLogger.error('GoHighLevelService', 'Failed to get credentials', error);
        return null;
      }

      return data;
    } catch (error) {
      debugLogger.error('GoHighLevelService', 'Error getting credentials', error);
      return null;
    }
  }

  /**
   * Generate OAuth authorization URL
   */
  static async getAuthorizationUrl(): Promise<string> {
    try {
      const credentials = await this.getCredentials();
      if (!credentials) {
        throw new Error('GHL credentials not found');
      }

      const scopes = [
        'contacts.readonly',
        'locations.readonly',
        'oauth.readonly',
        'opportunities.readonly',
        'funnels/redirect.readonly',
        'funnels/page.readonly',
        'funnels/funnel.readonly',
        'funnels/pagecount.readonly'
      ].join(' ');

      const baseUrl = 'https://marketplace.leadconnectorhq.com/oauth/chooselocation';
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: credentials.client_id,
        redirect_uri: credentials.redirect_uri,
        scope: scopes
      });

      const authUrl = `${baseUrl}?${params.toString()}`;

      debugLogger.info('GoHighLevelService', 'Generated authorization URL', {
        clientId: credentials.client_id,
        redirectUri: credentials.redirect_uri
      });

      return authUrl;
    } catch (error) {
      debugLogger.error('GoHighLevelService', 'Failed to generate authorization URL', error);
      throw error;
    }
  }

  /**
   * Exchange authorization code for access token
   */
  static async exchangeCodeForToken(code: string, locationId?: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
    locationId: string;
  }> {
    try {
      const credentials = await this.getCredentials();
      if (!credentials) {
        throw new Error('GHL credentials not found');
      }

      const tokenResponse = await fetch(`${this.OAUTH_BASE_URL}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code,
          client_id: credentials.client_id,
          client_secret: credentials.client_secret,
          redirect_uri: credentials.redirect_uri,
          user_type: 'Company',
          ...(locationId && { locationId })
        })
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json().catch(() => ({}));
        debugLogger.error('GoHighLevelService', 'Token exchange failed', {
          status: tokenResponse.status,
          statusText: tokenResponse.statusText,
          errorData,
          requestBody: {
            grant_type: 'authorization_code',
            code: code ? '***' : 'MISSING',
            client_id: credentials.client_id,
            client_secret: credentials.client_secret ? '***' : 'MISSING',
            redirect_uri: credentials.redirect_uri,
            user_type: 'Company',
            locationId: locationId || 'NOT_PROVIDED'
          }
        });
        throw new Error(`Token exchange failed: ${errorData.error || errorData.message || tokenResponse.statusText}`);
      }

      const tokenData = await tokenResponse.json();
      
      // Extract locationId from token response or use provided one
      const finalLocationId = tokenData.locationId || locationId;
      
      if (!finalLocationId) {
        throw new Error('Location ID not found in token response');
      }

      this.accessToken = tokenData.access_token;
      this.locationId = finalLocationId;

      debugLogger.info('GoHighLevelService', 'Successfully exchanged code for token', {
        hasAccessToken: !!tokenData.access_token,
        locationId: finalLocationId,
        expiresIn: tokenData.expires_in
      });

      return {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresIn: tokenData.expires_in,
        locationId: finalLocationId
      };
    } catch (error) {
      debugLogger.error('GoHighLevelService', 'Failed to exchange code for token', error);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
  }> {
    try {
      const credentials = await this.getCredentials();
      if (!credentials) {
        throw new Error('GHL credentials not found');
      }

      const tokenResponse = await fetch(`${this.OAUTH_BASE_URL}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: credentials.client_id,
          client_secret: credentials.client_secret,
          user_type: 'Sub-account'
        })
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        debugLogger.error('GoHighLevelService', 'Token refresh failed', {
          status: tokenResponse.status,
          errorData
        });
        throw new Error(`Token refresh failed: ${errorData.error || tokenResponse.statusText}`);
      }

      const tokenData = await tokenResponse.json();
      
      this.accessToken = tokenData.access_token;
      if (tokenData.refresh_token) {
        // Update refresh token if provided
        await this.updateRefreshToken(tokenData.refresh_token);
      }

      debugLogger.info('GoHighLevelService', 'Token refreshed successfully');
      
      return {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresIn: tokenData.expires_in
      };
    } catch (error) {
      debugLogger.error('GoHighLevelService', 'Error refreshing token', error);
      throw error;
    }
  }

  /**
   * Update refresh token in database
   */
  private static async updateRefreshToken(refreshToken: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('integrations')
        .update({
          config: {
            refreshToken,
            updatedAt: new Date().toISOString()
          }
        })
        .eq('platform', 'goHighLevel');

      if (error) {
        debugLogger.error('GoHighLevelService', 'Failed to update refresh token', error);
      }
    } catch (error) {
      debugLogger.error('GoHighLevelService', 'Error updating refresh token', error);
    }
  }

  /**
   * Set access token and location ID for API calls
   */
  static setCredentials(accessToken: string, locationId: string): void {
    this.accessToken = accessToken;
    this.locationId = locationId;
    debugLogger.info('GoHighLevelService', 'Credentials set', { locationId });
  }

  /**
   * Make authenticated API request
   */
  private static async makeApiRequest<T>(
    endpoint: string,
    options: globalThis.RequestInit = {}
  ): Promise<T> {
    if (!this.accessToken || !this.locationId) {
      throw new Error('GHL credentials not set. Please authenticate first.');
    }

    const url = `${this.API_BASE_URL}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
        headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
          'Version': '2021-07-28',
        ...options.headers
        }
      });

      if (!response.ok) {
      // Check if token expired and try to refresh
      if (response.status === 401) {
        debugLogger.info('GoHighLevelService', 'Token expired, attempting refresh');
        try {
          const connection = await DatabaseService.getGHLConnection();
          if (connection?.config?.refreshToken) {
            const newTokens = await this.refreshAccessToken(connection.config.refreshToken);
            this.setCredentials(newTokens.accessToken, this.locationId!);
            
            // Retry the request with new token
            const retryResponse = await fetch(url, {
              ...options,
              headers: {
                'Authorization': `Bearer ${newTokens.accessToken}`,
                'Version': '2021-07-28',
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'locationId': this.locationId!,
                ...options.headers
              }
            });
            
            if (retryResponse.ok) {
              return await retryResponse.json();
            }
          }
        } catch (refreshError) {
          debugLogger.error('GoHighLevelService', 'Token refresh failed', refreshError);
        }
      }
      
      const errorData = await response.json().catch(() => ({}));
      debugLogger.error('GoHighLevelService', 'API request failed', {
        url,
        status: response.status,
        error: errorData
      });
      throw new Error(`API request failed: ${errorData.message || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get account information
   */
  static async getAccountInfo(): Promise<GHLAccount> {
    try {
      const account = await this.makeApiRequest<GHLAccount>(`/locations/${this.locationId}`);
      debugLogger.info('GoHighLevelService', 'Retrieved account info', { 
        accountId: account.id, 
        accountName: account.name 
      });
      return account;
    } catch (error) {
      debugLogger.error('GoHighLevelService', 'Failed to get account info', error);
      throw error;
    }
  }

  /**
   * Get contacts
   */
  static async getContacts(limit = 100, offset = 0): Promise<GHLContact[]> {
    try {
      const response = await this.makeApiRequest<{ contacts: GHLContact[] }>(
        `/contacts/?locationId=${this.locationId}&limit=${limit}&offset=${offset}`
      );
      
      debugLogger.info('GoHighLevelService', 'Retrieved contacts', { 
        count: response.contacts?.length || 0 
      });
      
      return response.contacts || [];
    } catch (error) {
      debugLogger.error('GoHighLevelService', 'Failed to get contacts', error);
      throw error;
    }
  }

  /**
   * Get campaigns
   */
  static async getCampaigns(): Promise<GHLCampaign[]> {
    try {
      const response = await this.makeApiRequest<{ campaigns: GHLCampaign[] }>(
        `/campaigns/?locationId=${this.locationId}`
      );
      
      debugLogger.info('GoHighLevelService', 'Retrieved campaigns', { 
        count: response.campaigns?.length || 0 
      });
      
      return response.campaigns || [];
    } catch (error) {
      debugLogger.error('GoHighLevelService', 'Failed to get campaigns', error);
      throw error;
    }
  }

  /**
   * Get analytics data
   */
  static async getAnalytics(startDate: string, endDate: string): Promise<Record<string, unknown>> {
    try {
      const response = await this.makeApiRequest(
        `/analytics/?locationId=${this.locationId}&startDate=${startDate}&endDate=${endDate}`
      );
      
      debugLogger.info('GoHighLevelService', 'Retrieved analytics', { 
        startDate, 
        endDate 
      });
      
      return response as Record<string, unknown>;
    } catch (error) {
      debugLogger.error('GoHighLevelService', 'Failed to get analytics', error);
      throw error;
    }
  }

  /**
   * Setup webhook
   */
  static async setupWebhook(webhookUrl: string, events: string[]): Promise<Record<string, unknown>> {
    try {
      const response = await this.makeApiRequest('/webhooks', {
        method: 'POST',
        body: JSON.stringify({
          locationId: this.locationId,
          url: webhookUrl,
          events
        })
      });

      debugLogger.info('GoHighLevelService', 'Webhook setup', { 
        webhookUrl, 
        events 
      });
      
      return response as Record<string, unknown>;
    } catch (error) {
      debugLogger.error('GoHighLevelService', 'Failed to setup webhook', error);
      throw error;
    }
  }

  /**
   * Verify webhook signature
   */
  static async verifyWebhookSignature(payload: string, signature: string): Promise<boolean> {
    try {
      const credentials = await this.getCredentials();
      if (!credentials) {
        return false;
      }

      // Create HMAC-SHA256 hash
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(credentials.shared_secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );

      const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
      const expectedSignature = 'sha256=' + Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      return signature === expectedSignature;
    } catch (error) {
      debugLogger.error('GoHighLevelService', 'Failed to verify webhook signature', error);
      return false;
    }
  }

  /**
   * Disconnect GHL service
   */
  static disconnect(): void {
    this.accessToken = null;
    this.locationId = null;
    debugLogger.info('GoHighLevelService', 'Disconnected from GHL');
  }

  /**
   * Check if service is connected
   */
  static isConnected(): boolean {
    return !!(this.accessToken && this.locationId);
  }
}