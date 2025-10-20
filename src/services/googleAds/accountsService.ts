import { TokenManager } from '@/services/auth/TokenManager';
import { DatabaseService } from '@/services/data/databaseService';
import { GoogleAdsAccount, GoogleAdsApiRow } from '@/types';

/**
 * Lists customer accounts ONLY from the configured manager account
 */
export async function listAccessibleCustomers(): Promise<GoogleAdsAccount[]> {
  try {
    
    // Get access token using existing TokenManager
    const accessToken = await TokenManager.getAccessToken('googleAds');
    
    if (!accessToken) {
      throw new Error('Google Ads not connected - no access token found');
    }

    // Get manager account ID from database configuration
    const integrations = await DatabaseService.getIntegrations();
    
    const googleAdsIntegration = integrations.find(integration => integration.platform === 'googleAds');
    
    if (!googleAdsIntegration?.config?.manager_account_id) {
      throw new Error('Google Ads manager account ID not configured. Please set up the manager account ID in agency integrations.');
    }

    const managerAccountId = googleAdsIntegration.config.manager_account_id;
    

    // Step 1: Get all sub-accounts from the configured manager account only
    const allAccounts: GoogleAdsAccount[] = [];
    
    try {
      // Get customer_client data from the configured manager account
      const subAccounts = await getCustomerClientAccounts(managerAccountId, accessToken);
      if (subAccounts.length > 0) {
        allAccounts.push(...subAccounts);
      } else {
      }
    } catch (error) {
    }

    // Remove duplicates based on ID and create a Map for better performance
    const accountMap = new Map<string, GoogleAdsAccount>();
    
    for (const account of allAccounts) {
      if (!accountMap.has(account.id)) {
        accountMap.set(account.id, account);
      }
    }
    
    const uniqueAccounts = Array.from(accountMap.values());

    
    return uniqueAccounts;
  } catch (error) {
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
    
    const query = `
      SELECT
        customer_client.client_customer,
        customer_client.descriptive_name,
        customer_client.manager,
        customer_client.level
      FROM customer_client
    `;

    const developerToken = import.meta.env.VITE_GOOGLE_ADS_DEVELOPER_TOKEN;
    
    if (!developerToken || developerToken === 'your-google-ads-developer-token') {
      throw new Error('Google Ads Developer Token not configured. Please run setup-google-ads-env.sh to configure your Google Ads API credentials.');
    }

    const url = `https://googleads.googleapis.com/v21/customers/${managerCustomerId}/googleAds:search`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': developerToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });


    if (!response.ok) {
      const errorText = await response.text();
      // This might not be a manager account, return empty array
      return [];
    }

    const data = await response.json();
    const results = data.results || [];
    
    // Convert to our interface format
            const accounts: GoogleAdsAccount[] = results.map((row: GoogleAdsApiRow) => {
              const customerClient = row.customerClient;
              // Extract just the customer ID number from the resource name
              const customerId = customerClient.clientCustomer.replace('customers/', '');
              return {
                resourceName: `customers/${customerId}`,
                id: customerId,
                descriptiveName: customerClient.descriptiveName,
                name: customerClient.descriptiveName,
              };
            });

    return accounts;
  } catch (error) {
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
      return null;
    }

    const data = await response.json();
    const customer = data.results?.[0]?.customer;

    if (!customer) {
      return null;
    }

    return {
      resourceName: customer.resourceName,
      id: customer.id,
      descriptiveName: customer.descriptiveName,
      name: customer.descriptiveName,
    };
  } catch (error) {
    return null;
  }
}
