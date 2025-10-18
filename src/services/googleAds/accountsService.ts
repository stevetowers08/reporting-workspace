import { debugLogger } from '@/lib/debug';
import { TokenManager } from '@/services/auth/TokenManager';
import { DatabaseService } from '@/services/data/databaseService';

interface GoogleAdsAccount {
  resourceName: string;
  id: string;
  name?: string;
  descriptiveName?: string;
}

/**
 * Lists customer accounts ONLY from the configured manager account
 */
export async function listAccessibleCustomers(): Promise<GoogleAdsAccount[]> {
  try {
    debugLogger.info('GoogleAdsService', 'Starting listAccessibleCustomers...');
    
    // Get access token using existing TokenManager
    const accessToken = await TokenManager.getAccessToken('googleAds');
    debugLogger.debug('GoogleAdsService', 'Access token check:', accessToken ? 'Found' : 'Not found');
    
    if (!accessToken) {
      throw new Error('Google Ads not connected - no access token found');
    }

    // Get manager account ID from database configuration
    debugLogger.debug('GoogleAdsService', 'Getting integrations from database...');
    const integrations = await DatabaseService.getIntegrations();
    debugLogger.debug('GoogleAdsService', 'Integrations found:', integrations.length);
    
    const googleAdsIntegration = integrations.find(integration => integration.platform === 'googleAds');
    debugLogger.debug('GoogleAdsService', 'Google Ads integration found:', !!googleAdsIntegration);
    
    if (!googleAdsIntegration?.config?.manager_account_id) {
      throw new Error('Google Ads manager account ID not configured. Please set up the manager account ID in agency integrations.');
    }

    const managerAccountId = googleAdsIntegration.config.manager_account_id;
    debugLogger.debug(`GoogleAdsService`, `Manager account ID: ${managerAccountId}`);

    // Step 1: Get all sub-accounts from the configured manager account only
    const allAccounts: GoogleAdsAccount[] = [];
    
    try {
      // Get customer_client data from the configured manager account
      const subAccounts = await getCustomerClientAccounts(managerAccountId, accessToken);
      if (subAccounts.length > 0) {
        debugLogger.info(`GoogleAdsService`, `Found ${subAccounts.length} sub-accounts for manager account ${managerAccountId}`);
        allAccounts.push(...subAccounts);
      } else {
        debugLogger.info(`GoogleAdsService`, `No sub-accounts found for manager account ${managerAccountId}`);
      }
    } catch (error) {
      debugLogger.warn(`GoogleAdsService`, `Could not get accounts for manager account ${managerAccountId}:`, error);
    }

    // Remove duplicates based on ID and create a Map for better performance
    const accountMap = new Map<string, GoogleAdsAccount>();
    
    for (const account of allAccounts) {
      if (!accountMap.has(account.id)) {
        accountMap.set(account.id, account);
      }
    }
    
    const uniqueAccounts = Array.from(accountMap.values());

    debugLogger.info(`GoogleAdsService`, `Successfully fetched manager account ${managerAccountId} accounts:`, uniqueAccounts.length);
    debugLogger.debug(`GoogleAdsService`, `Final accounts:`, uniqueAccounts);
    
    return uniqueAccounts;
  } catch (error) {
    debugLogger.error('GoogleAdsService', 'Error in listAccessibleCustomers:', error);
    throw error;
  }
}

/**
 * Gets all customer_client accounts for a manager account
 */
async function getCustomerClientAccounts(
  managerCustomerId: string,
  accessToken: string
): Promise<GoogleAdsAccount[]> {
  try {
    debugLogger.debug(`GoogleAdsService`, `Getting customer client accounts for manager ${managerCustomerId}`);
    
    const query = `
      SELECT
        customer_client.client_customer,
        customer_client.descriptive_name,
        customer_client.manager,
        customer_client.level
      FROM customer_client
    `;

    const developerToken = import.meta.env.VITE_GOOGLE_ADS_DEVELOPER_TOKEN;
    debugLogger.debug('GoogleAdsService', 'Developer token check:', developerToken ? 'Found' : 'Not found');
    
    if (!developerToken || developerToken === 'your-google-ads-developer-token') {
      debugLogger.error('GoogleAdsService', 'Google Ads Developer Token not configured!');
      debugLogger.error('GoogleAdsService', 'Please run setup-google-ads-env.sh to configure your Google Ads API credentials');
      throw new Error('Google Ads Developer Token not configured. Please run setup-google-ads-env.sh to configure your Google Ads API credentials.');
    }

    const url = `https://googleads.googleapis.com/v21/customers/${managerCustomerId}/googleAds:search`;
    debugLogger.debug('GoogleAdsService', 'API URL:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': developerToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    debugLogger.debug('GoogleAdsService', 'API response status:', response.status);
    debugLogger.debug('GoogleAdsService', 'API response ok:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      debugLogger.error('GoogleAdsService', 'API error response:', errorText);
      // This might not be a manager account, return empty array
      return [];
    }

    const data = await response.json();
    debugLogger.debug('GoogleAdsService', 'API response data:', data);
    const results = data.results || [];
    debugLogger.debug('GoogleAdsService', 'Results count:', results.length);
    
    // Convert to our interface format
            const accounts: GoogleAdsAccount[] = results.map((row: { customerClient: { clientCustomer: string; descriptiveName: string } }) => {
              const customerClient = row.customerClient;
              debugLogger.debug(`GoogleAdsService`, `Processing customer client:`, customerClient);
              // Extract just the customer ID number from the resource name
              const customerId = customerClient.clientCustomer.replace('customers/', '');
              return {
                resourceName: `customers/${customerId}`,
                id: customerId,
                descriptiveName: customerClient.descriptiveName,
                name: customerClient.descriptiveName,
              };
            });

    debugLogger.debug('GoogleAdsService', 'Converted accounts:', accounts);
    return accounts;
  } catch (error) {
    debugLogger.warn(`GoogleAdsService`, `Error getting customer_client accounts for ${managerCustomerId}:`, error);
    return [];
  }
}

/**
 * Gets detailed information for a specific account
 */
async function _getAccountDetails(
  customerId: string,
  accessToken: string
): Promise<GoogleAdsAccount | null> {
  try {
    const query = `
      SELECT
        customer.id,
        customer.descriptive_name,
        customer.resource_name
      FROM customer
      WHERE customer.id = ${customerId}
    `;

    const response = await fetch(
      `https://googleads.googleapis.com/v21/customers/${customerId}/googleAds:search`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': import.meta.env.VITE_GOOGLE_ADS_DEVELOPER_TOKEN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      }
    );

    if (!response.ok) {
      debugLogger.error(`GoogleAdsService`, `Failed to get details for ${customerId}:`, { status: response.status, statusText: response.statusText });
      return null;
    }

    const data = await response.json();
    const customer = data.results?.[0]?.customer;

    if (!customer) {
      debugLogger.warn(`GoogleAdsService`, `No customer data for ${customerId}`);
      return null;
    }

    return {
      resourceName: customer.resourceName,
      id: customer.id,
      descriptiveName: customer.descriptiveName,
      name: customer.descriptiveName,
    };
  } catch (error) {
    debugLogger.error(`GoogleAdsService`, `Error getting account details for ${customerId}:`, error);
    return null;
  }
}
