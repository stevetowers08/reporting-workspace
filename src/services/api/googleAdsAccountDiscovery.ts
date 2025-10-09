import { debugLogger } from '@/lib/debug';
import { supabase } from '@/lib/supabase';
import { TokenManager } from '@/services/auth/TokenManager';

const GOOGLE_ADS_API_VERSION = 'v21';
const GOOGLE_ADS_BASE_URL = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;

export class GoogleAdsAccountDiscovery {
  /**
   * Minimal NDJSON parser for searchStream responses
   */
  private static parseNdjson(text: string): unknown[] {
    return text
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0)
      .map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          debugLogger.warn('GoogleAdsAccountDiscovery', `Failed to parse NDJSON line: ${line.substring(0, 120)}...`, e);
          return null;
        }
      })
      .filter((v): v is unknown => v !== null);
  }

  /**
   * Fetch the accessible customer IDs for the authorised user
   */
  static async listAccessibleCustomers(accessToken: string, developerToken: string): Promise<string[]> {
    const url = `${GOOGLE_ADS_BASE_URL}/customers:listAccessibleCustomers`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'developer-token': developerToken,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      debugLogger.error('GoogleAdsAccountDiscovery', `listAccessibleCustomers failed: ${response.status} - ${errorText}`);
      throw new Error(`listAccessibleCustomers failed: ${response.status}`);
    }

    const data = await response.json();
    const ids = (data.resourceNames || []).map((name: string) => name.replace('customers/', ''));
    debugLogger.debug('GoogleAdsAccountDiscovery', `Accessible customer IDs: ${ids.join(', ')}`);
    return ids;
  }

  /**
   * Determine if a customer is a manager using searchStream (avoids CORS on GET /customers/{id})
   */
  static async isManagerCustomer(customerId: string, accessToken: string, developerToken: string): Promise<boolean> {
    const cid = String(customerId).replace(/\D/g, '');
    const url = `${GOOGLE_ADS_BASE_URL}/customers/${cid}/googleAds:search`;
    const gaql = `SELECT customer.id, customer.manager FROM customer LIMIT 1`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'developer-token': developerToken,
        'login-customer-id': cid,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: gaql })
    });

    if (!response.ok) {
      const errorText = await response.text();
      debugLogger.warn('GoogleAdsAccountDiscovery', `search failed for ${cid}: ${response.status} - ${errorText}`);
      return false;
    }

    const data = await response.json().catch(async () => {
      const t = await response.text();
      debugLogger.warn('GoogleAdsAccountDiscovery', `Unexpected non-JSON response for ${cid}: ${t.substring(0, 200)}...`);
      return null;
    });
    const results = (data?.results ?? []) as Array<{ customer?: { manager?: boolean } }>;
    return results.length > 0 ? !!results[0].customer?.manager : false;
  }

  /**
   * Discover the correct manager (MCC) account and store it in Supabase
   */
  static async discoverAndStoreManagerAccount(): Promise<string | null> {
    try {
      debugLogger.debug('GoogleAdsAccountDiscovery', 'Starting manager account discovery...');
      
      const accessToken = await TokenManager.getAccessToken('googleAds');
      const developerToken = import.meta.env.VITE_GOOGLE_ADS_DEVELOPER_TOKEN;

      if (!accessToken || !developerToken) {
        debugLogger.error('GoogleAdsAccountDiscovery', 'Missing tokens for discovery', {
          hasAccessToken: !!accessToken,
          hasDeveloperToken: !!developerToken
        });
        return null;
      }

      debugLogger.debug('GoogleAdsAccountDiscovery', 'Tokens available, calling listAccessibleCustomers...');

      // Step 1: Get all accessible customer IDs
      const customerIds = await this.listAccessibleCustomers(accessToken, developerToken);

      debugLogger.debug('GoogleAdsAccountDiscovery', `Found ${customerIds.length} accessible customers:`, customerIds);

      if (customerIds.length === 0) {
        debugLogger.error('GoogleAdsAccountDiscovery', 'No accessible customers found');
        return null;
      }

      // Step 2: Find the manager (MCC) account
      debugLogger.debug('GoogleAdsAccountDiscovery', 'Searching for manager account...');
      for (const id of customerIds) {
        debugLogger.debug('GoogleAdsAccountDiscovery', `Checking customer ${id} for manager status via searchStream...`);
        const isManager = await this.isManagerCustomer(id, accessToken, developerToken);
        
        if (isManager) {
          debugLogger.debug('GoogleAdsAccountDiscovery', `Found manager account: ${id}`);

          // Step 3: Store it in Supabase
          const { error } = await supabase
            .from('integrations')
            .upsert({
              platform: 'googleAds',
              connected: true,
              account_id: id,
            }, {
              onConflict: 'platform'
            });

          if (error) {
            debugLogger.error('GoogleAdsAccountDiscovery', 'Failed to save manager account in Supabase', error);
            throw error; // Don't continue if we can't save
          } else {
            debugLogger.debug('GoogleAdsAccountDiscovery', `✅ Stored manager account ID ${id} in database`);
          }

          return id;
        } else {
          debugLogger.debug('GoogleAdsAccountDiscovery', `Customer ${id} is not a manager account`);
        }
      }

      // If no manager found, fallback to first accessible ID
      const fallback = customerIds[0];
      debugLogger.warn('GoogleAdsAccountDiscovery', `No manager found, using first accessible ID: ${fallback}`);
      return fallback;

    } catch (error) {
      debugLogger.error('GoogleAdsAccountDiscovery', 'Error discovering manager account', error);
      return null;
    }
  }
}
