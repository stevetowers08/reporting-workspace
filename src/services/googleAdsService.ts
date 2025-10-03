import { OAuthService } from './oauthService';

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
  private static readonly DEVELOPER_TOKEN = import.meta.env.VITE_GOOGLE_ADS_DEVELOPER_TOKEN || '';

  private static getAccessToken(): string | null {
    const tokens = OAuthService.getStoredTokens('google');
    return tokens?.accessToken || null;
  }

  private static getDeveloperToken(): string {
    return this.DEVELOPER_TOKEN;
  }

  static async authenticate(accessToken?: string, customerId?: string, developerToken?: string): Promise<boolean> {
    try {
      const token = accessToken || this.getAccessToken();
      const devToken = developerToken || this.getDeveloperToken();

      if (!token || !devToken) {
        return false;
      }

      // Validate credentials with Google Ads API
      const response = await fetch('https://googleads.googleapis.com/v14/customers:listAccessibleCustomers', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'developer-token': devToken,
          'Content-Type': 'application/json'
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Google Ads authentication failed:', error);
      return false;
    }
  }

  static async getAdAccounts(): Promise<GoogleAdsAccount[]> {
    const accessToken = this.getAccessToken();
    const developerToken = this.getDeveloperToken();

    if (!accessToken || !developerToken) {
      throw new Error('Google Ads not authenticated');
    }

    try {
      // Get accessible customers
      const response = await fetch('https://googleads.googleapis.com/v14/customers:listAccessibleCustomers', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': developerToken,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Google Ads API error: ${response.statusText}`);
      }

      const data = await response.json();
      const customers = data.resourceNames || [];

      // Get customer details for each accessible customer
      const accounts: GoogleAdsAccount[] = [];

      for (const customerResourceName of customers) {
        const customerId = customerResourceName.split('/').pop();
        if (!customerId) continue;

        try {
          // Get customer details
          const customerQuery = `
            SELECT 
              customer.id,
              customer.descriptive_name,
              customer.currency_code,
              customer.time_zone
            FROM customer
          `;

          const customerResponse = await fetch(`https://googleads.googleapis.com/v14/customers/${customerId}/googleAds:search`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'developer-token': developerToken,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: customerQuery })
          });

          if (customerResponse.ok) {
            const customerData = await customerResponse.json();
            const customer = customerData.results?.[0]?.customer;

            if (customer) {
              accounts.push({
                id: customer.id,
                name: customer.descriptiveName || `Account ${customer.id}`,
                status: 'active',
                currency: customer.currencyCode || 'USD',
                timezone: customer.timeZone || 'UTC'
              });
            }
          }
        } catch (error) {
          console.error(`Error fetching details for customer ${customerId}:`, error);
        }
      }

      return accounts;
    } catch (error) {
      console.error('Error fetching Google Ads accounts:', error);
      throw error;
    }
  }

  static async getConversionActions(customerId: string): Promise<GoogleAdsConversionAction[]> {
    const accessToken = this.getAccessToken();
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

      const response = await fetch(`https://googleads.googleapis.com/v14/customers/${customerId}/googleAds:search`, {
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
      // Return fallback conversion actions
      return [
        { id: 'conversions', name: 'Conversions', category: 'PURCHASE', type: 'WEBSITE', status: 'ENABLED' },
        { id: 'leads', name: 'Leads', category: 'LEAD', type: 'WEBSITE', status: 'ENABLED' },
        { id: 'calls', name: 'Calls', category: 'PURCHASE', type: 'PHONE_CALL', status: 'ENABLED' },
        { id: 'downloads', name: 'Downloads', category: 'DOWNLOAD', type: 'WEBSITE', status: 'ENABLED' },
        { id: 'signups', name: 'Sign-ups', category: 'SIGNUP', type: 'WEBSITE', status: 'ENABLED' }
      ];
    }
  }

  static async getCampaigns(customerId: string, dateRange?: { start: string; end: string }): Promise<GoogleAdsCampaign[]> {
    const accessToken = this.getAccessToken();
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

      const response = await fetch(`https://googleads.googleapis.com/v14/customers/${customerId}/googleAds:search`, {
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
    const accessToken = this.getAccessToken();
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

      const response = await fetch(`https://googleads.googleapis.com/v14/customers/${customerId}/googleAds:search`, {
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
      const accessToken = this.getAccessToken();
      const developerToken = this.getDeveloperToken();

      if (!accessToken || !developerToken) {
        return { success: false, error: 'Google Ads not authenticated' };
      }

      // Test authentication by getting accessible customers
      const response = await fetch('https://googleads.googleapis.com/v14/customers:listAccessibleCustomers', {
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

  static disconnect(): void {
    // Clear OAuth tokens
    localStorage.removeItem('oauth_tokens_google');
    console.log('Google Ads disconnected');
  }
}
