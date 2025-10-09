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
}