import { debugLogger } from '@/lib/debug';
import { TokenManager } from '@/services/auth/TokenManager';

export interface GoogleAdsMetrics {
  impressions: number;
  clicks: number;
  cost: number;
  leads: number;
  conversions: number;
  ctr: number;
  cpc: number;
  conversionRate: number;
  costPerConversion: number;
  searchImpressionShare: number;
  qualityScore: number;
}

export interface GoogleAdsCampaign {
  id: string;
  name: string;
  status: 'enabled' | 'paused' | 'removed';
  type: string;
  metrics: GoogleAdsMetrics;
  dateRange: {
    start: string;
    end: string;
  };
}

export interface GoogleAdsAccount {
  id: string;
  name: string;
  status: string;
  currency: string;
  timezone: string;
}

export interface GoogleAdsConversionAction {
  id: string;
  name: string;
  category: string;
  type: string;
  status: string;
}

export class GoogleAdsService {
  // Rate limiting state
  private static lastRequestTime = 0;
  private static readonly MIN_REQUEST_INTERVAL = 200; // 200ms between requests (5 requests/second max)
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 1000; // 1 second base delay

  /**
   * Fetch customer ID programmatically after OAuth authentication
   * This follows Google Ads API best practices for getting customer ID
   */
  static async fetchCustomerId(accessToken: string): Promise<string | null> {
    const developerToken = this.getDeveloperToken();
    
    if (!accessToken || !developerToken) {
      debugLogger.error('GoogleAdsService', 'Missing access token or developer token for customer ID fetch');
      return null;
    }

    try {
      debugLogger.debug('GoogleAdsService', 'Fetching customer ID programmatically');
      
      const response = await fetch('https://googleads.googleapis.com/v20/customers:listAccessibleCustomers', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': developerToken,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        debugLogger.error('GoogleAdsService', 'Failed to fetch accessible customers', { 
          status: response.status, 
          statusText: response.statusText 
        });
        return null;
      }

      const data = await response.json();
      const customers = data.resourceNames || [];
      
      if (customers.length === 0) {
        debugLogger.warn('GoogleAdsService', 'No accessible customers found');
        return null;
      }

      // Get the first customer ID (most common use case)
      const customerId = customers[0].split('/').pop();
      debugLogger.info('GoogleAdsService', 'Successfully fetched customer ID', { customerId });
      
      return customerId;
    } catch (error) {
      debugLogger.error('GoogleAdsService', 'Error fetching customer ID', error);
      return null;
    }
  }

  private static getDeveloperToken(): string {
    // Use environment variable directly for development
    return import.meta.env.VITE_GOOGLE_ADS_DEVELOPER_TOKEN || '';
  }

  private static async getAccessToken(): Promise<string | null> {
    // First try TokenManager (database-only)
    const token = await TokenManager.getAccessToken('googleAds');
    if (token) {
      debugLogger.debug('GoogleAdsService', 'Using token from TokenManager', { hasAccessToken: true });
      return token;
    }
    
    // SECURITY: Environment tokens should NEVER be used in client-side code
    // This exposes API keys in the client bundle and is a critical security vulnerability
    // All authentication must go through OAuth flows only
    
    debugLogger.warn('GoogleAdsService', 'No Google access token found. Please authenticate through OAuth.');
    return null;
  }

  // Rate-limited fetch with retry logic
  private static async rateLimitedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    // Rate limiting: ensure minimum interval between requests
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      const delay = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      debugLogger.debug('GoogleAdsService', `Rate limiting: waiting ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    this.lastRequestTime = Date.now();

    // Retry logic with exponential backoff
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        debugLogger.debug('GoogleAdsService', `API request attempt ${attempt}/${this.MAX_RETRIES}`, { url });
        
        const response = await fetch(url, options);
        
        // Check for rate limit headers
        const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
        const rateLimitReset = response.headers.get('X-RateLimit-Reset');
        
        if (rateLimitRemaining) {
          debugLogger.debug('GoogleAdsService', `Rate limit remaining: ${rateLimitRemaining}`);
        }
        
        if (rateLimitReset) {
          debugLogger.debug('GoogleAdsService', `Rate limit resets at: ${rateLimitReset}`);
        }

        // Check for rate limit errors
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After') || '60';
          const delay = parseInt(retryAfter) * 1000;
          
          debugLogger.warn('GoogleAdsService', `Rate limited! Waiting ${delay}ms before retry ${attempt}/${this.MAX_RETRIES}`);
          
          if (attempt < this.MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          } else {
            throw new Error(`Rate limited after ${this.MAX_RETRIES} attempts`);
          }
        }

        // Check for other errors
        if (!response.ok) {
          const errorText = await response.text();
          debugLogger.error('GoogleAdsService', `API request failed with status ${response.status}`, { 
            url, 
            status: response.status, 
            error: errorText 
          });
          
          // Don't retry on client errors (4xx)
          if (response.status >= 400 && response.status < 500) {
            throw new Error(`API request failed: ${response.status} ${errorText}`);
          }
          
          // Retry on server errors (5xx)
          if (attempt < this.MAX_RETRIES) {
            const delay = this.RETRY_DELAY * Math.pow(2, attempt - 1); // Exponential backoff
            debugLogger.warn('GoogleAdsService', `Server error, retrying in ${delay}ms (attempt ${attempt}/${this.MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          } else {
            throw new Error(`API request failed after ${this.MAX_RETRIES} attempts: ${response.status} ${errorText}`);
          }
        }

        return response;
      } catch (error) {
        debugLogger.error('GoogleAdsService', `API request attempt ${attempt} failed`, { url, error });
        
        if (attempt === this.MAX_RETRIES) {
          throw error;
        }
        
        // Wait before retry
        const delay = this.RETRY_DELAY * Math.pow(2, attempt - 1);
        debugLogger.warn('GoogleAdsService', `Retrying in ${delay}ms (attempt ${attempt}/${this.MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error('This should never be reached');
  }

  static async authenticate(accessToken?: string, developerToken?: string): Promise<boolean> {
    try {
      const token = accessToken || await this.getAccessToken();
      const devToken = developerToken || this.getDeveloperToken();

      if (!token || !devToken) {
        return false;
      }

      // Validate credentials with Google Ads API
      const response = await fetch('https://googleads.googleapis.com/v20/customers:listAccessibleCustomers', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'developer-token': devToken,
          'Content-Type': 'application/json'
        }
      });

      return response.ok;
    } catch (error) {
      debugLogger.error('GoogleAdsService', 'Google Ads authentication failed', error);
      return false;
    }
  }

  static async getAdAccounts(): Promise<GoogleAdsAccount[]> {
    debugLogger.debug('GoogleAdsService', 'getAdAccounts called - using Edge Function');

    try {
      // Use Supabase Edge Function to avoid CORS issues
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase configuration missing');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/google-ads-api/accounts`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Google Ads API error: ${response.status} - ${errorData.message || response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch Google Ads accounts');
      }

      const accounts: GoogleAdsAccount[] = data.data.map((account: any) => ({
        id: account.id,
        name: account.name,
        status: 'active',
        currency: account.currency,
        timezone: account.timezone
      }));

      debugLogger.info('GoogleAdsService', 'Successfully fetched Google Ads accounts via Edge Function', { count: accounts.length });
      return accounts;
    } catch (error) {
      debugLogger.error('GoogleAdsService', 'Error fetching Google Ads accounts via Edge Function', error);
      throw error;
    }
  }

  static async getConversionActions(customerId: string): Promise<GoogleAdsConversionAction[]> {
    const accessToken = await this.getAccessToken();
    const developerToken = this.getDeveloperToken();

    if (!accessToken || !developerToken) {
      throw new Error('Google Ads not authenticated');
    }

    if (!customerId) {
      throw new Error('No customer ID provided');
    }

    try {
      const query = `
        SELECT 
          conversion_action.id,
          conversion_action.name,
          conversion_action.category,
          conversion_action.type,
          conversion_action.status
        FROM conversion_action
        WHERE conversion_action.status = 'ENABLED'
      `;

      const response = await fetch(`https://googleads.googleapis.com/v20/customers/${customerId}/googleAds:search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': developerToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Google Ads conversion actions error:', errorData);
        // Return fallback conversion actions
        return [
          { id: 'conversions', name: 'Conversions', category: 'PURCHASE', type: 'WEBSITE', status: 'ENABLED' },
          { id: 'leads', name: 'Leads', category: 'LEAD', type: 'WEBSITE', status: 'ENABLED' },
          { id: 'calls', name: 'Calls', category: 'PURCHASE', type: 'PHONE_CALL', status: 'ENABLED' },
          { id: 'downloads', name: 'Downloads', category: 'DOWNLOAD', type: 'WEBSITE', status: 'ENABLED' },
          { id: 'signups', name: 'Sign-ups', category: 'SIGNUP', type: 'WEBSITE', status: 'ENABLED' }
        ];
      }

      const data = await response.json();
      const results = data.results || [];

      return results.map((result: any) => ({
        id: result.conversionAction.id,
        name: result.conversionAction.name,
        category: result.conversionAction.category,
        type: result.conversionAction.type,
        status: result.conversionAction.status
      }));
    } catch (error) {
      console.error('Error fetching Google Ads conversion actions:', error);
      // Return empty array instead of fallback data
      return [];
    }
  }

  static async getCampaigns(customerId: string, dateRange?: { start: string; end: string }): Promise<GoogleAdsCampaign[]> {
    const accessToken = await this.getAccessToken();
    const developerToken = this.getDeveloperToken();

    if (!accessToken || !developerToken) {
      throw new Error('Google Ads not authenticated');
    }

    try {
      const query = `
        SELECT 
          campaign.id,
          campaign.name,
          campaign.status,
          campaign.advertising_channel_type,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.leads,
          metrics.ctr,
          metrics.average_cpc,
          metrics.conversions_from_interactions_rate,
          metrics.cost_per_conversion,
          metrics.search_impression_share,
          metrics.quality_score
        FROM campaign 
        WHERE segments.date DURING ${dateRange ? `${dateRange.start.replace(/-/g, '')},${dateRange.end.replace(/-/g, '')}` : 'LAST_30_DAYS'}
      `;

      const response = await fetch(`https://googleads.googleapis.com/v20/customers/${customerId}/googleAds:search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': developerToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      });

      if (!response.ok) {
        throw new Error(`Google Ads API error: ${response.statusText}`);
      }

      const data = await response.json();

      return (data.results || []).map((result: any) => ({
        id: result.campaign.id,
        name: result.campaign.name,
        status: result.campaign.status.toLowerCase(),
        type: result.campaign.advertisingChannelType,
        metrics: this.parseMetrics(result.metrics),
        dateRange: dateRange || { start: '', end: '' }
      }));
    } catch (error) {
      console.error('Error fetching Google Ads campaigns:', error);
      throw error;
    }
  }

  static async getAccountMetrics(customerId: string, dateRange?: { start: string; end: string }): Promise<GoogleAdsMetrics> {
    const accessToken = await this.getAccessToken();
    const developerToken = this.getDeveloperToken();

    if (!accessToken || !developerToken) {
      throw new Error('Google Ads not authenticated');
    }

    try {
      const query = `
        SELECT 
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.leads,
          metrics.ctr,
          metrics.average_cpc,
          metrics.conversions_from_interactions_rate,
          metrics.cost_per_conversion,
          metrics.search_impression_share,
          metrics.quality_score
        FROM customer 
        WHERE segments.date DURING ${dateRange ? `${dateRange.start.replace(/-/g, '')},${dateRange.end.replace(/-/g, '')}` : 'LAST_30_DAYS'}
      `;

      const response = await fetch(`https://googleads.googleapis.com/v20/customers/${customerId}/googleAds:search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': developerToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      });

      if (!response.ok) {
        throw new Error(`Google Ads API error: ${response.statusText}`);
      }

      const data = await response.json();
      return this.parseMetrics(data.results?.[0]?.metrics || {});
    } catch (error) {
      console.error('Error fetching Google Ads account metrics:', error);
      throw error;
    }
  }

  private static parseMetrics(metrics: any): GoogleAdsMetrics {
    return {
      impressions: parseInt(metrics.impressions || '0'),
      clicks: parseInt(metrics.clicks || '0'),
      cost: parseFloat(metrics.costMicros || '0') / 1000000, // Convert from micros
      leads: parseFloat(metrics.leads || '0'),
      conversions: parseFloat(metrics.conversions || '0'),
      ctr: parseFloat(metrics.ctr || '0') * 100, // Convert to percentage
      cpc: parseFloat(metrics.averageCpc || '0') / 1000000, // Convert from micros
      conversionRate: parseFloat(metrics.conversionsFromInteractionsRate || '0') * 100,
      costPerConversion: parseFloat(metrics.costPerConversion || '0') / 1000000,
      searchImpressionShare: parseFloat(metrics.searchImpressionShare || '0') * 100,
      qualityScore: parseFloat(metrics.qualityScore || '0')
    };
  }

  static async testConnection(): Promise<{ success: boolean; error?: string; accountInfo?: any }> {
    try {
      const accessToken = await this.getAccessToken();
      const developerToken = this.getDeveloperToken();

      if (!accessToken || !developerToken) {
        return { success: false, error: 'Google Ads not authenticated' };
      }

      // Test authentication by getting accessible customers
      const response = await fetch('https://googleads.googleapis.com/v20/customers:listAccessibleCustomers', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': developerToken,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, error: `Google Ads API error: ${errorData.error?.message || response.statusText}` };
      }

      const data = await response.json();
      const customers = data.resourceNames || [];

      // Get account details
      const accounts = await this.getAdAccounts();

      return {
        success: true,
        accountInfo: {
          accessibleCustomers: customers,
          adAccounts: accounts
        }
      };
    } catch (error) {
      console.error('Google Ads connection test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async disconnect(): Promise<void> {
    // Clear OAuth tokens using TokenManager
    await TokenManager.removeTokens('googleAds');
    console.log('Google Ads disconnected');
  }
}
