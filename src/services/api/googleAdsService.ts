import { debugLogger } from '@/lib/debug';
import { TokenManager } from '@/services/auth/TokenManager';

export interface GoogleAdsAccount {
  id: string;
  name: string;
  status: string;
  currency: string;
  timezone: string;
}

export class GoogleAdsService {
  /**
   * Get Google Ads accounts - individual ad accounts, not manager account
   */
  static async getAdAccounts(): Promise<GoogleAdsAccount[]> {
    debugLogger.debug('GoogleAdsService', 'Getting Google Ads accounts');

    try {
      const accessToken = await this.ensureValidToken();
      const developerToken = this.getDeveloperToken();

      if (!accessToken || !developerToken) {
        debugLogger.warn('GoogleAdsService', 'No valid tokens available');
        return [];
      }

      const managerAccountId = await this.getManagerAccountId();
      if (!managerAccountId) {
        debugLogger.warn('GoogleAdsService', 'No manager account ID available');
        return [];
      }

      // Use the correct GAQL query to get individual ad accounts
        const query = `
          SELECT 
            customer_client.id, 
            customer_client.descriptive_name,
            customer_client.status,
          customer_client.manager,
          customer_client.level
          FROM customer_client
        WHERE customer_client.level > 0
        `;

      debugLogger.debug('GoogleAdsService', `Querying customer_client with searchStream: ${query}`);

      const response = await globalThis.fetch(`https://googleads.googleapis.com/v20/customers/${managerAccountId}/googleAds:searchStream`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': developerToken,
          'login-customer-id': managerAccountId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      });

      if (!response.ok) {
        const errorText = await response.text();
        debugLogger.error('GoogleAdsService', `Failed to get customer_client data: ${response.status} - ${errorText}`);
        return [];
      }

        const responseText = await response.text();
        debugLogger.debug('GoogleAdsService', 'Raw customer_client searchStream response length:', responseText.length);

      const individualAccounts: GoogleAdsAccount[] = [];
      const seenAccountIds = new Set<string>();

      // Parse searchStream response
        try {
          const responseData = JSON.parse(responseText);

          if (Array.isArray(responseData)) {
          for (const resultBlock of responseData) {
              if (resultBlock.results && Array.isArray(resultBlock.results)) {
              for (const result of resultBlock.results) {
                   const customerClient = result.customerClient;
                   if (customerClient && customerClient.id) {
                     const customerId = String(customerClient.id);
                     const descriptiveName = customerClient.descriptive_name;
                     const status = customerClient.status;
                     const isManager = customerClient.manager;
                     
                     // Skip if we've already seen this account ID
                     if (seenAccountIds.has(customerId)) {
                       continue;
                     }
                     
                     // Skip manager accounts - we only want individual ad accounts
                     if (isManager) {
                       continue;
                     }
                     
                     seenAccountIds.add(customerId);

                     // Use descriptive_name as the account name
                     const accountName = descriptiveName || `Ad Account ${customerId}`;

                     individualAccounts.push({
                       id: customerId,
                       name: accountName,
                    status: status?.toLowerCase() || 'active',
                       currency: 'USD',
                       timezone: 'UTC'
                     });

                  debugLogger.debug('GoogleAdsService', `✅ Added individual ad account: ${accountName} (${customerId})`);
                   }
                }
              }
            }
          }
        } catch (parseError) {
        debugLogger.error('GoogleAdsService', 'Error parsing customer_client searchStream response:', parseError);
      }

      debugLogger.debug('GoogleAdsService', `✅ Successfully found ${individualAccounts.length} individual ad accounts`);
      return individualAccounts;

    } catch (error) {
      debugLogger.error('GoogleAdsService', 'Error getting Google Ads accounts', error);
      return [];
    }
  }

  /**
   * Ensure we have a valid access token
   */
  private static async ensureValidToken(): Promise<string | null> {
    try {
      const accessToken = await TokenManager.getAccessToken('googleAds');
      if (!accessToken) {
        debugLogger.warn('GoogleAdsService', 'No access token available');
        return null;
      }

      debugLogger.debug('GoogleAdsService', 'Valid access token obtained');
      return accessToken;

    } catch (error) {
      debugLogger.error('GoogleAdsService', 'Failed to ensure valid token', error);
      return null;
    }
  }

  /**
   * Get developer token from environment
   */
  private static getDeveloperToken(): string | null {
    const token = import.meta.env.VITE_GOOGLE_ADS_DEVELOPER_TOKEN;
    if (!token) {
      debugLogger.warn('GoogleAdsService', 'No developer token found in environment');
      return null;
    }
    debugLogger.debug('GoogleAdsService', 'Developer token retrieved', { hasToken: !!token, tokenLength: token.length });
    return token;
  }

  /**
   * Retrieves the manager account ID from Supabase.
   * This ID is used as the login-customer-id header for all Google Ads API requests.
   */
  private static async getManagerAccountId(): Promise<string | null> {
    try {
      const { supabase } = await import('@/lib/supabase');
      
      const { data: integration, error } = await supabase
        .from('integrations')
        .select('account_id')
        .eq('platform', 'googleAds')
        .eq('connected', true)
        .single();

      if (error || !integration?.account_id) {
        debugLogger.warn('GoogleAdsService', 'No manager account ID found in integration data');
        return null;
      }

      // Clean up "Optional[...]" wrapper if present
      const longManagerId = String(integration.account_id)
        .replace(/^Optional\[/, '')
        .replace(/\]$/, '')
        .trim();

      debugLogger.debug('GoogleAdsService', `Manager ID from database (cleaned): ${longManagerId}`);

      return longManagerId;
    } catch (error) {
      debugLogger.error('GoogleAdsService', 'Failed to get manager account ID', error);
      return null;
    }
  }

  /**
   * Get account metrics for reporting
   */
  static async getAccountMetrics(customerId: string, dateRange: { start: string; end: string }): Promise<{
    impressions: number;
    clicks: number;
    cost: number;
    leads: number;
    ctr: number;
    averageCpc: number;
    conversions: number;
  }> {
    try {
      debugLogger.debug('GoogleAdsService', 'Getting account metrics', { customerId, dateRange });
      
      const accessToken = await this.ensureValidToken();
      const developerToken = this.getDeveloperToken();

      if (!accessToken || !developerToken) {
        debugLogger.warn('GoogleAdsService', 'No valid tokens available for metrics');
        return this.getEmptyMetrics();
      }

      const managerAccountId = await this.getManagerAccountId();
      if (!managerAccountId) {
        debugLogger.warn('GoogleAdsService', 'No manager account ID available for metrics');
        return this.getEmptyMetrics();
      }

      // Format dates for GAQL
      const startDate = dateRange.start.replace(/-/g, '');
      const endDate = dateRange.end.replace(/-/g, '');

      const query = `
        SELECT 
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.ctr,
          metrics.average_cpc,
          segments.date
        FROM campaign 
        WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
          AND campaign.status = 'ENABLED'
      `;

      const response = await globalThis.fetch(`https://googleads.googleapis.com/v20/customers/${managerAccountId}/googleAds:searchStream`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': developerToken,
          'login-customer-id': managerAccountId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      });

      if (!response.ok) {
        const errorText = await response.text();
        debugLogger.error('GoogleAdsService', `Failed to get metrics: ${response.status} - ${errorText}`);
        return this.getEmptyMetrics();
      }

      const responseText = await response.text();
      const responseData = JSON.parse(responseText);
      
      // Aggregate metrics across all campaigns
      let totalImpressions = 0;
      let totalClicks = 0;
      let totalCostMicros = 0;
      let totalConversions = 0;

      if (Array.isArray(responseData)) {
        for (const resultBlock of responseData) {
          if (resultBlock.results && Array.isArray(resultBlock.results)) {
            for (const result of resultBlock.results) {
          const metrics = result.metrics;
              if (metrics) {
                totalImpressions += parseInt(metrics.impressions || '0');
                totalClicks += parseInt(metrics.clicks || '0');
                totalCostMicros += parseInt(metrics.costMicros || '0');
                totalConversions += parseFloat(metrics.conversions || '0');
              }
            }
          }
        }
      }

      const cost = totalCostMicros / 1000000; // Convert micros to dollars
      const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const avgCpc = totalClicks > 0 ? cost / totalClicks : 0;

      const metrics = {
        impressions: totalImpressions,
        clicks: totalClicks,
        cost: cost,
        leads: totalConversions,
        ctr: ctr,
        averageCpc: avgCpc,
        conversions: totalConversions
      };

      debugLogger.debug('GoogleAdsService', 'Account metrics calculated', metrics);
      return metrics;

    } catch (error) {
      debugLogger.error('GoogleAdsService', 'Error getting account metrics', error);
      return this.getEmptyMetrics();
    }
  }

  /**
   * Get conversion actions for a customer
   */
  static async getConversionActions(customerId: string): Promise<Array<{
    id: string;
    name: string;
    status: string;
    type: string;
  }>> {
    try {
      debugLogger.debug('GoogleAdsService', 'Getting conversion actions', { customerId });
      
      const accessToken = await this.ensureValidToken();
      const developerToken = this.getDeveloperToken();

      if (!accessToken || !developerToken) {
        debugLogger.warn('GoogleAdsService', 'No valid tokens available for conversion actions');
        return [];
      }

      const managerAccountId = await this.getManagerAccountId();
      if (!managerAccountId) {
        debugLogger.warn('GoogleAdsService', 'No manager account ID available for conversion actions');
        return [];
      }

      const query = `
        SELECT 
          conversion_action.id,
          conversion_action.name,
          conversion_action.status,
          conversion_action.type
        FROM conversion_action
        WHERE conversion_action.status = 'ENABLED'
      `;

      const response = await globalThis.fetch(`https://googleads.googleapis.com/v20/customers/${managerAccountId}/googleAds:searchStream`, {
        method: 'POST',
        headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': developerToken,
          'login-customer-id': managerAccountId,
        'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      });

      if (!response.ok) {
        const errorText = await response.text();
        debugLogger.error('GoogleAdsService', `Failed to get conversion actions: ${response.status} - ${errorText}`);
        return [];
      }

      const responseText = await response.text();
      const responseData = JSON.parse(responseText);
      
      const conversionActions: Array<{
        id: string;
        name: string;
        status: string;
        type: string;
      }> = [];

      if (Array.isArray(responseData)) {
        for (const resultBlock of responseData) {
          if (resultBlock.results && Array.isArray(resultBlock.results)) {
            for (const result of resultBlock.results) {
              const conversionAction = result.conversionAction;
              if (conversionAction) {
                conversionActions.push({
                  id: conversionAction.id,
                  name: conversionAction.name,
                  status: conversionAction.status,
                  type: conversionAction.type
                });
              }
            }
          }
        }
      }

      debugLogger.debug('GoogleAdsService', `Found ${conversionActions.length} conversion actions`);
      return conversionActions;

    } catch (error) {
      debugLogger.error('GoogleAdsService', 'Error getting conversion actions', error);
      return [];
    }
  }

  /**
   * Test connection to Google Ads API
   */
  static async testConnection(): Promise<{ success: boolean; error?: string; accountInfo?: {
    managerAccountId: string;
    hasAccessToken: boolean;
    hasDeveloperToken: boolean;
  } }> {
    try {
      debugLogger.debug('GoogleAdsService', 'Testing connection');
      
    const accessToken = await this.ensureValidToken();
    const developerToken = this.getDeveloperToken();

      if (!accessToken || !developerToken) {
        return {
          success: false,
          error: 'Missing access token or developer token'
        };
      }

      const managerAccountId = await this.getManagerAccountId();
      if (!managerAccountId) {
        return {
          success: false,
          error: 'No manager account ID found'
        };
      }

      // Test with a simple query
      const query = `
        SELECT customer.id, customer.descriptive_name
        FROM customer 
        LIMIT 1
      `;

      const response = await globalThis.fetch(`https://googleads.googleapis.com/v20/customers/${managerAccountId}/googleAds:searchStream`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': developerToken,
          'login-customer-id': managerAccountId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `API request failed: ${response.status} - ${errorText}`
        };
      }

      debugLogger.debug('GoogleAdsService', 'Connection test successful');
      return {
        success: true,
        accountInfo: {
          managerAccountId,
          hasAccessToken: !!accessToken,
          hasDeveloperToken: !!developerToken
        }
      };

    } catch (error) {
      debugLogger.error('GoogleAdsService', 'Connection test failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Authenticate with Google Ads API
   */
  static async authenticate(accessToken?: string, _customerId?: string): Promise<boolean> {
    try {
      debugLogger.debug('GoogleAdsService', 'Authenticating');
      
      const token = accessToken || await TokenManager.getAccessToken('googleAds');
      if (!token) {
        debugLogger.warn('GoogleAdsService', 'No access token available for authentication');
        return false;
      }

    const developerToken = this.getDeveloperToken();
      if (!developerToken) {
        debugLogger.warn('GoogleAdsService', 'No developer token available for authentication');
        return false;
      }

      // Test authentication with a simple API call
      const testResult = await this.testConnection();
      
      if (testResult.success) {
        debugLogger.debug('GoogleAdsService', 'Authentication successful');
        return true;
      } else {
        debugLogger.warn('GoogleAdsService', 'Authentication failed', testResult.error);
        return false;
      }

    } catch (error) {
      debugLogger.error('GoogleAdsService', 'Authentication error', error);
      return false;
    }
  }

  /**
   * Get empty metrics structure
   */
  private static getEmptyMetrics() {
    return {
      impressions: 0,
      clicks: 0,
      cost: 0,
      leads: 0,
      ctr: 0,
      averageCpc: 0,
      conversions: 0
    };
  }
}