import { debugLogger } from '@/lib/debug';
import { TokenManager } from '@/services/auth/TokenManager';
import { supabase } from '@/lib/supabase';

const GOOGLE_ADS_API_VERSION = 'v20';
const GOOGLE_ADS_BASE_URL = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;

export class GoogleAdsAccountDiscovery {
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
   * Fetch customer details to determine if it's a manager account
   */
  static async getCustomerDetails(customerId: string, accessToken: string, developerToken: string) {
    const url = `${GOOGLE_ADS_BASE_URL}/customers/${customerId}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'developer-token': developerToken,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      debugLogger.warn('GoogleAdsAccountDiscovery', `Failed to fetch customer ${customerId}: ${response.status} - ${errorText}`);
      return null;
    }

    return await response.json();
  }

  /**
   * Discover the correct manager (MCC) account and store it in Supabase
   */
  static async discoverAndStoreManagerAccount(): Promise<string | null> {
    try {
      const accessToken = await TokenManager.getAccessToken('googleAds');
      const developerToken = import.meta.env.VITE_GOOGLE_ADS_DEVELOPER_TOKEN;

      if (!accessToken || !developerToken) {
        debugLogger.warn('GoogleAdsAccountDiscovery', 'Missing tokens for discovery');
        return null;
      }

      // Step 1: Get all accessible customer IDs
      const customerIds = await this.listAccessibleCustomers(accessToken, developerToken);

      if (customerIds.length === 0) {
        debugLogger.warn('GoogleAdsAccountDiscovery', 'No accessible customers found');
        return null;
      }

      // Step 2: Find the manager (MCC) account
      for (const id of customerIds) {
        const details = await this.getCustomerDetails(id, accessToken, developerToken);
        if (details?.manager) {
          debugLogger.debug('GoogleAdsAccountDiscovery', `Found manager account: ${id}`);

          // Step 3: Store it in Supabase
          const { error } = await supabase
            .from('integrations')
            .upsert({
              platform: 'googleAds',
              connected: true,
              account_id: id,
            })
            .eq('platform', 'googleAds');

          if (error) {
            debugLogger.error('GoogleAdsAccountDiscovery', 'Failed to save manager account in Supabase', error);
          } else {
            debugLogger.debug('GoogleAdsAccountDiscovery', `✅ Stored manager account ID ${id} in database`);
          }

          return id;
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
