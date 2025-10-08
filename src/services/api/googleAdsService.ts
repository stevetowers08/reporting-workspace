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

  /**
   * Get Google Ads accounts using Edge Function
   */
  static async getAdAccounts(): Promise<GoogleAdsAccount[]> {
    debugLogger.debug('GoogleAdsService', 'getAdAccounts called - using Edge Function');

    try {
      // Check if Google Ads is connected first
      const isConnected = await TokenManager.isConnected('googleAds');
      if (!isConnected) {
        debugLogger.warn('GoogleAdsService', 'Google Ads not connected, returning empty accounts');
        return [];
      }

      // Use Supabase Edge Function instead of direct API calls
      const { supabase } = await import('@/lib/supabase');
      
      debugLogger.debug('GoogleAdsService', 'Using Edge Function for Google Ads accounts');
      
      const { data, error } = await supabase.functions.invoke('google-ads-api/accounts');

      if (error) {
        debugLogger.error('GoogleAdsService', 'Edge Function error', error);
        // Check if it's an authentication error
        if (error.message?.includes('token') || error.message?.includes('unauthorized')) {
          debugLogger.warn('GoogleAdsService', 'Google Ads authentication error - token may be expired');
          return [];
        }
        throw new Error(`Google Ads Edge Function error: ${error.message}`);
      }

      if (!data?.success || !data?.data) {
        debugLogger.warn('GoogleAdsService', 'Invalid response from Google Ads Edge Function', data);
        return [];
      }

      debugLogger.debug('GoogleAdsService', 'Edge Function response', data);
      
      // Transform Edge Function response to match our interface
      const accounts: GoogleAdsAccount[] = data.data.map((account: unknown) => {
        const acc = account as Record<string, unknown>;
        return {
          id: acc.id as string,
          name: (acc.descriptiveName || acc.name) as string,
          status: 'active' as const, // Edge Function doesn't return status, assume active
          currency: (acc.currency || 'USD') as string,
          timezone: (acc.timezone || 'UTC') as string
        };
      });

      debugLogger.debug('GoogleAdsService', 'Transformed accounts', accounts);
      return accounts;

    } catch (error) {
      debugLogger.error('GoogleAdsService', 'Failed to fetch Google Ads accounts via Edge Function', error);
      // Return empty array instead of throwing to prevent UI crashes
      return [];
    }
  }

  /**
   * Get Google Ads campaigns for a specific customer
   */
  static async getCampaigns(customerId: string, dateRange?: { start: string; end: string }): Promise<GoogleAdsCampaign[]> {
    debugLogger.debug('GoogleAdsService', 'getCampaigns called - using Edge Function');

    try {
      const { supabase } = await import('@/lib/supabase');
      
      debugLogger.debug('GoogleAdsService', 'Using Edge Function for Google Ads campaigns');
      
      const { data, error } = await supabase.functions.invoke(`google-ads-api/campaigns?customerId=${customerId}`);

      if (error) {
        debugLogger.error('GoogleAdsService', 'Edge Function error', error);
        throw new Error(`Google Ads Edge Function error: ${error.message}`);
      }

      if (!data?.success || !data?.data) {
        throw new Error('Invalid response from Google Ads Edge Function');
      }

      debugLogger.debug('GoogleAdsService', 'Edge Function campaigns response', data);
      
      // Transform Edge Function response to match our interface
      const campaigns: GoogleAdsCampaign[] = data.data.map((campaign: unknown) => {
        const camp = campaign as Record<string, unknown>;
        return {
          id: camp.id as string,
          name: camp.name as string,
          status: camp.status as 'enabled' | 'paused' | 'removed',
          type: camp.type as string,
          metrics: camp.metrics as GoogleAdsMetrics,
          dateRange: dateRange || { start: '', end: '' }
        };
      });

      debugLogger.debug('GoogleAdsService', 'Transformed campaigns', campaigns);
      return campaigns;

    } catch (error) {
      debugLogger.error('GoogleAdsService', 'Failed to fetch Google Ads campaigns via Edge Function', error);
      throw error;
    }
  }

  /**
   * Test Google Ads API connection
   */
  static async authenticate(): Promise<boolean> {
    try {
      const accessToken = await TokenManager.getAccessToken('googleAds');
      if (!accessToken) {
        debugLogger.error('GoogleAdsService', 'No Google Ads access token available');
        return false;
      }

      // Test with a simple API call
      const developerToken = this.getDeveloperToken();
      const response = await globalThis.fetch('https://googleads.googleapis.com/v20/customers:listAccessibleCustomers', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': developerToken,
          'Content-Type': 'application/json'
        }
      });

      return response.ok;
    } catch (error) {
      debugLogger.error('GoogleAdsService', 'Google Ads authentication failed', error);
      return false;
    }
  }

  /**
   * Get conversion actions for a customer
   */
  static async getConversionActions(customerId: string): Promise<GoogleAdsConversionAction[]> {
    try {
      const accessToken = await TokenManager.getAccessToken('googleAds');
      if (!accessToken) {
        throw new Error('Google Ads not connected');
      }

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

      const developerToken = this.getDeveloperToken();
      const response = await globalThis.fetch(`https://googleads.googleapis.com/v20/customers/${customerId}/googleAds:search`, {
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
      const results = data.results || [];
      
      return results.map((result: Record<string, unknown>) => {
        const conversionAction = result.conversionAction as Record<string, unknown>;
        return {
          id: conversionAction.id as string,
          name: conversionAction.name as string,
          category: conversionAction.category as string,
          type: conversionAction.type as string,
          status: conversionAction.status as string
        };
      });

    } catch (error) {
      debugLogger.error('GoogleAdsService', 'Error fetching conversion actions', error);
      throw error;
    }
  }

  /**
   * Get account metrics for a customer
   */
  static async getAccountMetrics(customerId: string, dateRange?: { start: string; end: string }): Promise<GoogleAdsMetrics> {
    const accessToken = await this.getAccessToken();
    const developerToken = this.getDeveloperToken();

    if (!accessToken || !developerToken) {
      throw new Error('Google Ads not authenticated');
    }

    try {
      // Format date range for Google Ads API
      const startDate = dateRange?.start ? dateRange.start.replace(/-/g, '') : '';
      const endDate = dateRange?.end ? dateRange.end.replace(/-/g, '') : '';
      
      const dateFilter = dateRange 
        ? `segments.date BETWEEN '${startDate}' AND '${endDate}'`
        : 'segments.date DURING LAST_30_DAYS';

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
          metrics.quality_score,
          segments.date
        FROM customer 
        WHERE ${dateFilter}
      `;

      const response = await globalThis.fetch(`https://googleads.googleapis.com/v20/customers/${customerId}/googleAds:search`, {
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
      const results = data.results || [];
      
      if (results.length === 0) {
        debugLogger.warn('GoogleAdsService', 'No Google Ads metrics found for date range');
        return this.getEmptyGoogleMetrics();
      }
      
      // Aggregate metrics across all days
      const aggregatedMetrics = results.reduce((acc: Record<string, number>, result: Record<string, unknown>) => {
        const metrics = result.metrics as Record<string, unknown>;
        acc.impressions += parseInt(metrics.impressions as string || '0');
        acc.clicks += parseInt(metrics.clicks as string || '0');
        acc.cost += parseFloat(metrics.costMicros as string || '0') / 1000000; // Convert micros to dollars
        acc.leads += parseInt(metrics.leads as string || '0');
        acc.conversions += parseInt(metrics.conversions as string || '0');
        return acc;
      }, {
        impressions: 0,
        clicks: 0,
        cost: 0,
        leads: 0,
        conversions: 0
      });

      // Calculate derived metrics
      const ctr = aggregatedMetrics.impressions > 0 ? (aggregatedMetrics.clicks / aggregatedMetrics.impressions) * 100 : 0;
      const cpc = aggregatedMetrics.clicks > 0 ? aggregatedMetrics.cost / aggregatedMetrics.clicks : 0;
      const conversionRate = aggregatedMetrics.clicks > 0 ? (aggregatedMetrics.conversions / aggregatedMetrics.clicks) * 100 : 0;
      const costPerConversion = aggregatedMetrics.conversions > 0 ? aggregatedMetrics.cost / aggregatedMetrics.conversions : 0;

      return {
        impressions: aggregatedMetrics.impressions,
        clicks: aggregatedMetrics.clicks,
        cost: aggregatedMetrics.cost,
        leads: aggregatedMetrics.leads,
        conversions: aggregatedMetrics.conversions,
        ctr: Math.round(ctr * 100) / 100,
        cpc: Math.round(cpc * 100) / 100,
        conversionRate: Math.round(conversionRate * 100) / 100,
        costPerConversion: Math.round(costPerConversion * 100) / 100,
        searchImpressionShare: 0, // Would need additional query
        qualityScore: 0 // Would need additional query
      };

    } catch (error) {
      debugLogger.error('GoogleAdsService', 'Error fetching account metrics', error);
      throw error;
    }
  }

  private static getAccessToken(): Promise<string | null> {
    return TokenManager.getAccessToken('googleAds');
  }

  private static getDeveloperToken(): string {
    // Use environment variable directly for development
    const token = import.meta.env.VITE_GOOGLE_ADS_DEVELOPER_TOKEN || '';
    debugLogger.debug('GoogleAdsService', 'Developer token retrieved', { 
      hasToken: !!token, 
      tokenLength: token.length,
      tokenPrefix: token.substring(0, 10)
    });
    return token;
  }

  private static getEmptyGoogleMetrics(): GoogleAdsMetrics {
    return {
      impressions: 0,
      clicks: 0,
      cost: 0,
      leads: 0,
      conversions: 0,
      ctr: 0,
      cpc: 0,
      conversionRate: 0,
      costPerConversion: 0,
      searchImpressionShare: 0,
      qualityScore: 0
    };
  }
}