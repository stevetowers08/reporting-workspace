import { debugLogger } from '@/lib/debug';
import { TokenManager } from '@/services/auth/TokenManager';
import { DatabaseService } from '@/services/data/databaseService';
import { CommonGoogleAdsAccount, GoogleAdsApiRow, Integration } from '@/types';

// Simple cache for integrations to prevent repeated API calls
let integrationsCache: Integration[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Helper function to get cached integrations
async function getCachedIntegrations() {
  const now = Date.now();
  
  // Return cached data if it's still valid
  if (integrationsCache && (now - cacheTimestamp) < CACHE_DURATION) {
    debugLogger.debug('GoogleAdsAccountsService', 'Using cached integrations', { 
      cacheAge: now - cacheTimestamp,
      cacheDuration: CACHE_DURATION 
    });
    return integrationsCache;
  }
  
  // Fetch fresh data and update cache
  debugLogger.debug('GoogleAdsAccountsService', 'Fetching fresh integrations data', { 
    cacheAge: now - cacheTimestamp,
    cacheDuration: CACHE_DURATION 
  });
  integrationsCache = await DatabaseService.getIntegrations();
  cacheTimestamp = now;
  
  return integrationsCache;
}

// Function to invalidate cache when integrations are updated
export function invalidateIntegrationsCache() {
  integrationsCache = null;
  cacheTimestamp = 0;
}

/**
 * Lists customer accounts ONLY from the configured manager account
 */
export async function listAccessibleCustomers(): Promise<CommonGoogleAdsAccount[]> {
  debugLogger.debug('GoogleAdsAccountsService', 'listAccessibleCustomers called');
  
  // Get access token using existing TokenManager
  const accessToken = await TokenManager.getAccessToken('googleAds');
  
  if (!accessToken) {
    debugLogger.error('GoogleAdsAccountsService', 'No access token found');
    throw new Error('Google Ads not connected - no access token found');
  }

  debugLogger.debug('GoogleAdsAccountsService', 'Access token retrieved');

    // Get manager account ID and developer token from database configuration
    const integrations = await getCachedIntegrations();
    
    const googleAdsIntegration = integrations.find(integration => integration.platform === 'googleAds');
    
    if (!googleAdsIntegration?.config?.manager_account_id) {
      debugLogger.error('GoogleAdsAccountsService', 'Manager account ID not configured', {
        hasIntegration: !!googleAdsIntegration,
        hasConfig: !!googleAdsIntegration?.config
      });
      throw new Error('Google Ads manager account ID not configured. Please set up the manager account ID in agency integrations.');
    }

    const managerAccountId = googleAdsIntegration.config.manager_account_id;
    const developerToken = googleAdsIntegration.config.developer_token || import.meta.env.VITE_GOOGLE_ADS_DEVELOPER_TOKEN;
    
    if (!developerToken) {
      throw new Error('Google Ads developer token not configured. Please set it in the integrations config or environment variable.');
    }
    
    debugLogger.debug('GoogleAdsAccountsService', 'Config loaded', { managerAccountId, hasDeveloperToken: !!developerToken });
    

    // Get accounts from both sources
    const allAccounts: CommonGoogleAdsAccount[] = [];
    let customerClientCount = 0;
    let accessibleCustomersCount = 0;
    
    // Source 1: Customer client accounts (sub-accounts from manager)
    try {
      const subAccounts = await getCustomerClientAccounts(managerAccountId, accessToken, developerToken);
      customerClientCount = subAccounts.length;
      if (subAccounts.length > 0) {
        allAccounts.push(...subAccounts);
      }
    } catch (error) {
      debugLogger.error('GoogleAdsAccountsService', 'Error fetching customer client accounts', {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        managerAccountId
      });
    }
    
    // Source 2: Accessible customers (directly accessible accounts)
    try {
      const accessibleCustomers = await getAccessibleCustomers(accessToken, developerToken);
      accessibleCustomersCount = accessibleCustomers.length;
      if (accessibleCustomers.length > 0) {
        allAccounts.push(...accessibleCustomers);
      }
    } catch (error) {
      debugLogger.error('GoogleAdsAccountsService', 'Error fetching accessible customers', {
        error,
        errorMessage: error instanceof Error ? error.message : String(error)
      });
    }
    
    debugLogger.info('GoogleAdsAccountsService', 'Combined accounts before deduplication', {
      total: allAccounts.length,
      customerClientCount,
      accessibleCustomersCount,
      sample: allAccounts.slice(0, 5).map(a => ({ id: a.id, name: a.name }))
    });
    
    // Fallback: Add manager account if no accounts found
    if (allAccounts.length === 0) {
      debugLogger.warn('GoogleAdsAccountsService', 'No accounts found from either source, using manager account fallback', {
        managerAccountId,
        customerClientCount,
        accessibleCustomersCount
      });
      allAccounts.push({
        resourceName: `customers/${managerAccountId}`,
        id: managerAccountId,
        descriptiveName: 'Manager Account',
        name: 'Manager Account'
      });
    }

    // Remove duplicates - keep first occurrence (customer_client has better names)
    const seen = new Set<string>();
    const uniqueAccounts: CommonGoogleAdsAccount[] = [];
    
    for (const account of allAccounts) {
      if (!seen.has(account.id)) {
        seen.add(account.id);
        uniqueAccounts.push(account);
      }
    }
    
    return uniqueAccounts;
}

/**
 * Gets all customer_client accounts for a manager account
 */
async function getCustomerClientAccounts(
  managerCustomerId: string,
  accessToken: string,
  developerToken: string
): Promise<CommonGoogleAdsAccount[]> {
  try {
    const query = `
      SELECT
        customer_client.client_customer,
        customer_client.descriptive_name,
        customer_client.manager,
        customer_client.level
      FROM customer_client
    `;

    const url = `https://googleads.googleapis.com/v22/customers/${managerCustomerId}/googleAds:search`;

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
      let errorDetails;
      try {
        errorDetails = JSON.parse(errorText);
      } catch {
        errorDetails = errorText;
      }
      
      debugLogger.error('GoogleAdsAccountsService', 'Google Ads API error', {
        status: response.status,
        statusText: response.statusText,
        error: errorDetails,
        managerCustomerId,
        url
      });
      
      // If it's a 403 or 404, this might not be a manager account or might not have access
      // Return empty array but log the error for debugging
      if (response.status === 403 || response.status === 404) {
        debugLogger.warn('GoogleAdsAccountsService', 'Manager account might not have sub-accounts or access denied', {
          managerCustomerId,
          status: response.status
        });
        return [];
      }
      
      // For other errors, throw to surface the issue
      throw new Error(`Google Ads API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorDetails)}`);
    }

    const data = await response.json();
    
    // Log raw response structure for debugging
    debugLogger.debug('GoogleAdsAccountsService', 'Raw API response', {
      hasResults: !!data.results,
      resultsType: Array.isArray(data.results) ? 'array' : typeof data.results,
      resultsLength: Array.isArray(data.results) ? data.results.length : 'N/A',
      responseKeys: Object.keys(data),
      managerCustomerId
    });
    
    const results = data.results || [];
    
    debugLogger.info('GoogleAdsAccountsService', 'Parsing customer client accounts', {
      resultCount: results.length,
      managerCustomerId,
      firstResult: results[0] ? JSON.stringify(results[0]).substring(0, 200) : 'none'
    });
    
    // Convert to our interface format
    const accounts: CommonGoogleAdsAccount[] = results.map((row: GoogleAdsApiRow, index: number) => {
      try {
        const customerClient = row.customerClient;
        if (!customerClient || !customerClient.clientCustomer) {
          debugLogger.warn('GoogleAdsAccountsService', 'Invalid row structure', { index, row });
          return null;
        }
        // Extract just the customer ID number from the resource name
        const customerId = customerClient.clientCustomer.replace('customers/', '');
        const account = {
          resourceName: `customers/${customerId}`,
          id: customerId,
          descriptiveName: customerClient.descriptiveName || `Account ${customerId}`,
          name: customerClient.descriptiveName || `Account ${customerId}`,
        };
        debugLogger.debug('GoogleAdsAccountsService', 'Mapped account', { index, account });
        return account;
      } catch (error) {
        debugLogger.error('GoogleAdsAccountsService', 'Error mapping account', { index, error, row });
        return null;
      }
    }).filter((acc): acc is CommonGoogleAdsAccount => acc !== null);

    debugLogger.info('GoogleAdsAccountsService', 'Customer client accounts mapped', {
      inputCount: results.length,
      outputCount: accounts.length,
      accounts: accounts.slice(0, 5).map(a => ({ id: a.id, name: a.name }))
    });

    return accounts;
  } catch (error) {
    debugLogger.error('GoogleAdsAccountsService', 'Error in getCustomerClientAccounts', {
      error,
      managerCustomerId,
      errorMessage: error instanceof Error ? error.message : String(error)
    });
    return [];
  }
}

/**
 * Gets all directly accessible customers (alternative to customer_client)
 */
async function getAccessibleCustomers(accessToken: string, developerToken: string): Promise<CommonGoogleAdsAccount[]> {
  try {
    const url = `https://googleads.googleapis.com/v22/customers:listAccessibleCustomers`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': developerToken,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorDetails;
      try {
        errorDetails = JSON.parse(errorText);
      } catch {
        errorDetails = errorText;
      }
      
      debugLogger.error('GoogleAdsAccountsService', 'Accessible customers API error', {
        status: response.status,
        statusText: response.statusText,
        error: errorDetails
      });
      
      return [];
    }

    const data = await response.json();
    
    debugLogger.debug('GoogleAdsAccountsService', 'Raw accessible customers response', {
      hasResourceNames: !!data.resourceNames,
      resourceNamesType: Array.isArray(data.resourceNames) ? 'array' : typeof data.resourceNames,
      resourceNamesLength: Array.isArray(data.resourceNames) ? data.resourceNames.length : 'N/A',
      responseKeys: Object.keys(data)
    });
    
    const resourceNames = data.resourceNames || [];
    
    debugLogger.info('GoogleAdsAccountsService', 'Accessible customers received', {
      count: resourceNames.length,
      sample: resourceNames.slice(0, 5)
    });
    
    // Convert resource names to account format
    // Note: We don't fetch names here to avoid too many API calls
    // The deduplication logic will prefer customer_client names which have better names
    const accounts: CommonGoogleAdsAccount[] = resourceNames.map((resourceName: string, index: number) => {
      if (!resourceName || typeof resourceName !== 'string') {
        debugLogger.warn('GoogleAdsAccountsService', 'Invalid resource name', { index, resourceName });
        return null;
      }
      const customerId = resourceName.replace('customers/', '');
      return {
        resourceName,
        id: customerId,
        descriptiveName: `Account ${customerId}`,
        name: `Account ${customerId}`
      };
    }).filter((acc): acc is CommonGoogleAdsAccount => acc !== null);

    debugLogger.info('GoogleAdsAccountsService', 'Accessible customers mapped', {
      inputCount: resourceNames.length,
      outputCount: accounts.length,
      accounts: accounts.slice(0, 5).map(a => ({ id: a.id, name: a.name }))
    });

    return accounts;
  } catch (error) {
    debugLogger.error('GoogleAdsAccountsService', 'Error in getAccessibleCustomers', {
      error,
      errorMessage: error instanceof Error ? error.message : String(error)
    });
    return [];
  }
}

/**
 * Gets detailed information for a specific account
 */
async function _getAccountDetails(
  customerId: string,
  accessToken: string
): Promise<CommonGoogleAdsAccount | null> {
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
      `https://googleads.googleapis.com/v22/customers/${customerId}/googleAds:search`,
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
    } catch (_error) {
      // Handle error silently
      return null;
    }
}
