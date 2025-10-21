import { API_BASE_URLS, API_VERSIONS } from '@/constants/apiVersions';
import { debugLogger, debugService } from '@/lib/debug';
import {
    CachedData
} from '@/types/api';

export interface FacebookAdsMetrics {
  impressions: number;
  clicks: number;
  spend: number;
  leads: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpm: number;
  roas: number;
  reach: number;
  frequency: number;
  previousPeriod?: {
    impressions: number;
    clicks: number;
    spend: number;
    leads: number;
    conversions: number;
    ctr: number;
    cpc: number;
    cpm: number;
    roas: number;
    reach: number;
    frequency: number;
  };
  demographics?: {
    ageGroups: {
      '25-34': number;
      '35-44': number;
      '45-54': number;
      '55+': number;
    };
    gender: {
      female: number;
      male: number;
    };
  };
  platformBreakdown?: {
    facebookVsInstagram: {
      facebook: number;
      instagram: number;
    };
    adPlacements: {
      feed: number;
      stories: number;
      reels: number;
    };
  };
}

export interface FacebookAdsCampaign {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'archived';
  objective: string;
  metrics: FacebookAdsMetrics;
  dateRange: {
    start: string;
    end: string;
  };
}

export class FacebookAdsService {
  private static readonly API_VERSION = API_VERSIONS.FACEBOOK;
  private static readonly BASE_URL = API_BASE_URLS.FACEBOOK;
  private static requestCache = new Map<string, CachedData<unknown>>();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Cache management methods
  private static getCachedData<T>(key: string): T | null {
    const cached = this.requestCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  private static setCachedData<T>(key: string, data: T): void {
    this.requestCache.set(key, { data, timestamp: Date.now() });
  }

  // Get developer token from facebook_ads_configs table
  static async getDeveloperToken(): Promise<string> {
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase
        .from('facebook_ads_configs')
        .select('developer_token')
        .eq('is_active', true)
        .single();

      if (error) {
        debugLogger.error('FacebookAdsService', 'Error fetching Facebook developer token from database', error);
        throw new Error('No Facebook developer token found in database');
      }

      if (!data?.developer_token) {
        throw new Error('No Facebook developer token found in database');
      }

      debugLogger.debug('FacebookAdsService', 'Using Facebook developer token from database');
      return data.developer_token;
    } catch (error) {
      debugLogger.error('FacebookAdsService', 'Error getting developer token from database', error);
      throw error;
    }
  }

  // Get user access token from integrations table
  static async getUserAccessToken(): Promise<string> {
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase
        .from('integrations')
        .select('config')
        .eq('platform', 'facebookAds')
        .eq('connected', true)
        .single();

      if (error) {
        debugLogger.error('FacebookAdsService', 'Error fetching Facebook config from database', error);
        throw new Error('No Facebook integration found in database');
      }

      const config = data?.config;
      if (!config?.accessToken) {
        throw new Error('No Facebook access token found in database');
      }

      debugLogger.debug('FacebookAdsService', 'Using Facebook user access token from database');
      return config.accessToken;
    } catch (error) {
      debugLogger.error('FacebookAdsService', 'Error getting user access token from database', error);
      throw error;
    }
  }

  // Legacy method for backward compatibility
  static async getAccessToken(): Promise<string> {
    return this.getUserAccessToken();
  }

  // Rate limiting state
  private static lastRequestTime = 0;
  private static readonly MIN_REQUEST_INTERVAL = 100; // 100ms between requests (10 requests/second max)
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 1000; // 1 second base delay

  // Request deduplication
  private static pendingRequests = new Map<string, Promise<unknown>>();

  // Deduplicate requests to prevent multiple identical API calls
  private static async deduplicateRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    if (this.pendingRequests.has(key)) {
      debugLogger.debug('FacebookAdsService', `Deduplicating request: ${key}`);
      return await this.pendingRequests.get(key)!;
    }

    const promise = requestFn().finally(() => {
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, promise);
    return await promise;
  }

  // Rate-limited fetch with retry logic - now includes developer token
  static async rateLimitedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    // Rate limiting: ensure minimum interval between requests
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      const delay = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      debugLogger.debug('FacebookAdsService', `Rate limiting: waiting ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    this.lastRequestTime = Date.now();

    // Retry logic with exponential backoff
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        debugLogger.debug('FacebookAdsService', `API request attempt ${attempt}/${this.MAX_RETRIES}`, { url });
        
        // Add timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // Handle timeout errors
        if (controller.signal.aborted) {
          throw new Error('Request timeout after 30 seconds');
        }
        
        // Check for rate limit headers
        const rateLimitRemaining = response.headers.get('X-App-Usage-Call-Count');
        const rateLimitReset = response.headers.get('X-App-Usage-Time-Reset');
        
        if (rateLimitRemaining) {
          debugLogger.debug('FacebookAdsService', `Rate limit remaining: ${rateLimitRemaining}`);
        }
        
        if (rateLimitReset) {
          debugLogger.debug('FacebookAdsService', `Rate limit resets at: ${rateLimitReset}`);
        }

        // Check for rate limit errors
        if (response.status === 429 || response.status === 613) {
          const retryAfter = response.headers.get('Retry-After') || '60';
          const delay = parseInt(retryAfter) * 1000;
          
          debugLogger.warn('FacebookAdsService', `Rate limited! Waiting ${delay}ms before retry ${attempt}/${this.MAX_RETRIES}`);
          
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
          debugLogger.error('FacebookAdsService', `API request failed with status ${response.status}`, { 
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
            debugLogger.warn('FacebookAdsService', `Server error, retrying in ${delay}ms (attempt ${attempt}/${this.MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          } else {
            throw new Error(`API request failed after ${this.MAX_RETRIES} attempts: ${response.status} ${errorText}`);
          }
        }

        return response;
      } catch (error) {
        debugLogger.error('FacebookAdsService', `API request attempt ${attempt} failed`, { url, error });
        
        if (attempt === this.MAX_RETRIES) {
          throw error;
        }
        
        // Wait before retry
        const delay = this.RETRY_DELAY * Math.pow(2, attempt - 1);
        debugLogger.warn('FacebookAdsService', `Retrying in ${delay}ms (attempt ${attempt}/${this.MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // This should never be reached, but TypeScript needs a return statement
    throw new Error('Maximum retry attempts exceeded');
  }



  static async authenticate(accessToken?: string, _adAccountId?: string): Promise<boolean> {
    try {
      const userToken = accessToken || await this.getUserAccessToken();

      // Validate token with Facebook Graph API using proper headers
      const headers = {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      };
      
      const response = await FacebookAdsService.rateLimitedFetch(
        `${this.BASE_URL}/me`,
        { headers }
      );

      if (response.ok) {
        const userData = await response.json();
        debugLogger.info('FacebookAdsService', 'Facebook authentication successful', userData);
        return true;
      } else {
        const errorData = await response.json();
        debugLogger.error('FacebookAdsService', 'Facebook authentication failed', errorData);
        return false;
      }
    } catch (error) {
      debugLogger.error('FacebookAdsService', 'Facebook Ads authentication error', error);
      return false;
    }
  }

  static async validateTokenScopes(): Promise<{ hasBusinessManagement: boolean; scopes: string[] }> {
    try {
      const userToken = await this.getUserAccessToken();
      
      if (!userToken) {
        return { hasBusinessManagement: false, scopes: [] };
      }

      // Try to access business management endpoint to check if permission is available
      const headers = {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      };
      
      const businessResponse = await FacebookAdsService.rateLimitedFetch(
        `${this.BASE_URL}/me/businesses?fields=id`,
        { headers }
      );
      const hasBusinessManagement = businessResponse.ok;

      return { 
        hasBusinessManagement, 
        scopes: hasBusinessManagement ? ['ads_read', 'ads_management', 'business_management'] : ['ads_read', 'ads_management']
      };
    } catch (error) {
      debugLogger.error('FacebookAdsService', 'Token scope validation error', error);
      return { hasBusinessManagement: false, scopes: [] };
    }
  }

  static async getAdAccounts(): Promise<any[]> {
    try {
      // First try to get cached accounts from Supabase integration
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data, error } = await supabase
          .from('integrations')
          .select('config')
          .eq('platform', 'facebookAds')
          .eq('connected', true)
          .single();
        
        if (error || !data?.config) {
          throw new Error('Facebook integration not found');
        }
        
        const integration = data.config;
        
        if (integration?.settings?.adAccounts && integration.settings.adAccounts.length > 0) {
          debugLogger.debug('FacebookAdsService', 'Using cached ad accounts from Supabase', { 
            count: integration.settings.adAccounts.length 
          });
          return integration.settings.adAccounts;
        }
      } catch (error) {
        debugLogger.warn('FacebookAdsService', 'Could not get cached accounts from Supabase', error);
      }

      // Fallback to API call if no cached data
      debugLogger.debug('FacebookAdsService', 'No cached accounts found, fetching from Facebook API');
      
      const userToken = await this.getUserAccessToken();
      
      if (!userToken) {
        throw new Error('Facebook user access token not found. Please authenticate first.');
      }

      debugLogger.debug('FacebookAdsService', 'Facebook user token length', userToken.length);

      // Use proper Authorization header format as per Facebook API documentation
      const headers = {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      };

      // Define fields to fetch according to Facebook API documentation
      const fields = [
        'account_id',           // Ad account ID (without 'act_' prefix)
        'id',                   // Full ID (with 'act_' prefix)
        'name',                 // Account name
        'account_status',       // Account status (1=ACTIVE, 2=DISABLED, etc.)
        'currency',             // Currency code (USD, EUR, etc.)
        'timezone_id',          // Timezone ID
        'timezone_name',        // Timezone name
        'business{name}',        // Business Manager info
        'amount_spent'          // Total amount spent
      ].join(',');

      try {
        // Fetch ALL ad accounts with comprehensive pagination
        const allAccounts = await this.fetchAllAdAccountsWithPagination(fields, headers);
        
        debugLogger.debug('FacebookAdsService', 'All ad accounts fetched', allAccounts.length);

        // Process and format the accounts according to Facebook API documentation
        const processedAccounts = allAccounts.map((account: any) => ({
          id: account.id,                    // Full ID with 'act_' prefix
          account_id: account.account_id,    // Numeric ID
          name: account.name || 'Unnamed Account',
          account_status: account.account_status,
          currency: account.currency,
          timezone_id: account.timezone_id,
          timezone_name: account.timezone_name,
          amount_spent: account.amount_spent ? parseFloat(account.amount_spent) / 100 : 0, // Convert cents to dollars
          business_name: account.business?.name || null,
          isActive: account.account_status === 1
        }));

        // Filter to only show active accounts (optional)
        const activeAccounts = processedAccounts.filter(acc => acc.isActive);
        
        debugLogger.info('FacebookAdsService', 'Ad accounts processed', {
          total: processedAccounts.length,
          active: activeAccounts.length
        });
        
        // Cache the results in Supabase for future use
        try {
          await this.cacheAdAccounts(activeAccounts);
        } catch (error) {
          debugLogger.warn('FacebookAdsService', 'Failed to cache ad accounts', error);
        }
        
        return activeAccounts;
        
      } catch (error) {
        debugLogger.error('FacebookAdsService', 'Error fetching ad accounts from Facebook API', error);
        throw error;
      }
    } catch (error) {
      debugLogger.error('FacebookAdsService', 'Error fetching Facebook ad accounts', error);
      throw error;
    }
  }

  // Fetch ALL ad accounts with comprehensive pagination to get all accounts user has access to
  private static async fetchAllAdAccountsWithPagination(fields: string, headers: Record<string, string>): Promise<any[]> {
    const allAccounts: any[] = [];
    let nextUrl: string | null = `${this.BASE_URL}/me/adaccounts?fields=${fields}&limit=100`;

    debugLogger.info('FacebookAdsService', 'Starting comprehensive ad account fetch with pagination');

    while (nextUrl) {
      try {
        debugLogger.debug('FacebookAdsService', 'Fetching page', { url: nextUrl });
        
        const response = await FacebookAdsService.rateLimitedFetch(nextUrl, { headers });
        
        if (!response.ok) {
          debugLogger.error('FacebookAdsService', 'Failed to fetch ad accounts page', {
            status: response.status,
            statusText: response.statusText,
            url: nextUrl
          });
          throw new Error(`Facebook API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (data.error) {
          debugLogger.error('FacebookAdsService', 'Facebook API returned error', data.error);
          throw new Error(data.error.message);
        }

        const accounts = data.data || [];
        allAccounts.push(...accounts);

        debugLogger.debug('FacebookAdsService', 'Fetched page of accounts', {
          count: accounts.length,
          total: allAccounts.length,
          hasNext: !!data.paging?.next
        });

        // Check for next page
        nextUrl = data.paging?.next || null;
        
        // Safety check to prevent infinite loops
        if (allAccounts.length > 1000) {
          debugLogger.warn('FacebookAdsService', 'Stopping pagination at 1000 accounts to prevent infinite loop');
          break;
        }
        
      } catch (error) {
        debugLogger.error('FacebookAdsService', 'Error fetching paginated accounts', error);
        break;
      }
    }

    debugLogger.info('FacebookAdsService', 'Comprehensive ad account fetch completed', {
      totalAccounts: allAccounts.length
    });

    return allAccounts;
  }

  // Fetch paginated accounts to handle large numbers of ad accounts
  private static async fetchPaginatedAccounts(url: string, _userToken?: string): Promise<any[]> {
    const allAccounts: any[] = [];
    let nextUrl: string | null = url;

    while (nextUrl) {
      try {
        const headers = await this.buildApiHeaders();
        const response = await FacebookAdsService.rateLimitedFetch(nextUrl, { headers });
        
        if (!response.ok) {
          debugLogger.warn('FacebookAdsService', 'Failed to fetch paginated accounts', {
            status: response.status,
            statusText: response.statusText,
            url: nextUrl
          });
          break;
        }

        const data = await response.json();
        const accounts = data.data || [];
        allAccounts.push(...accounts);

        // Check for next page
        nextUrl = data.paging?.next || null;
        
        debugLogger.debug('FacebookAdsService', 'Fetched page of accounts', {
          count: accounts.length,
          total: allAccounts.length,
          hasNext: !!nextUrl
        });
      } catch (error) {
        debugLogger.error('FacebookAdsService', 'Error fetching paginated accounts', error);
        break;
      }
    }

    return allAccounts;
  }

  // Fetch ad accounts via system users for comprehensive coverage
  private static async fetchSystemUserAccounts(userToken: string): Promise<any[]> {
    try {
      debugLogger.debug('FacebookAdsService', 'Fetching ad accounts via system users');
      
      const headers = {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      };
      
      // Get all businesses first
      const businessesResponse = await FacebookAdsService.rateLimitedFetch(
        `${this.BASE_URL}/me/businesses?fields=id,name`,
        { headers }
      );
      
      if (!businessesResponse.ok) {
        debugLogger.warn('FacebookAdsService', 'Cannot fetch businesses for system users', {
          status: businessesResponse.status
        });
        return [];
      }

      const businessesData = await businessesResponse.json();
      const businesses = businessesData.data || [];
      
      if (!businesses.length) {
        debugLogger.debug('FacebookAdsService', 'No businesses found for system user accounts');
        return [];
      }

      const allSystemUserAccounts: any[] = [];

      // For each business, get system users and their ad accounts
      for (const business of businesses) {
        try {
          // Get system users for this business
          const systemUsersResponse = await FacebookAdsService.rateLimitedFetch(
            `${this.BASE_URL}/${business.id}/system_users?fields=id,name`,
            { headers }
          );

          if (!systemUsersResponse.ok) {
            debugLogger.warn('FacebookAdsService', `Cannot fetch system users for business ${business.name}`, {
              status: systemUsersResponse.status
            });
            continue;
          }

          const systemUsersData = await systemUsersResponse.json();
          const systemUsers = systemUsersData.data || [];

          // For each system user, get their ad accounts
          for (const systemUser of systemUsers) {
            try {
              const systemUserAccountsResponse = await FacebookAdsService.rateLimitedFetch(
                `${this.BASE_URL}/${systemUser.id}/adaccounts?fields=id,name,account_status,currency,timezone_name`,
                { headers }
              );

              if (systemUserAccountsResponse.ok) {
                const systemUserAccountsData = await systemUserAccountsResponse.json();
                const accounts = systemUserAccountsData.data || [];
                allSystemUserAccounts.push(...accounts);
                
                debugLogger.debug('FacebookAdsService', `System user ${systemUser.name} ad accounts`, accounts.length);
              }
            } catch (error) {
              debugLogger.warn('FacebookAdsService', `Error fetching accounts for system user ${systemUser.name}`, error);
            }
          }
        } catch (error) {
          debugLogger.warn('FacebookAdsService', `Error fetching system users for business ${business.name}`, error);
        }
      }

      debugLogger.debug('FacebookAdsService', 'Total system user ad accounts', allSystemUserAccounts.length);
      return allSystemUserAccounts;
    } catch (error) {
      debugLogger.error('FacebookAdsService', 'Error fetching system user accounts', error);
      return [];
    }
  }

  // Force refresh ad accounts from Facebook API (bypasses cache)
  static async refreshAdAccounts(): Promise<any[]> {
    try {
      debugLogger.info('FacebookAdsService', 'Force refreshing ad accounts from Facebook API');
      
      const userToken = await this.getUserAccessToken();
      
      if (!userToken) {
        throw new Error('Facebook user access token not found. Please authenticate first.');
      }

      // Use proper Authorization header format as per Facebook API documentation
      const headers = {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      };

      // Define fields to fetch according to Facebook API documentation
      const fields = [
        'account_id',           // Ad account ID (without 'act_' prefix)
        'id',                   // Full ID (with 'act_' prefix)
        'name',                 // Account name
        'account_status',       // Account status (1=ACTIVE, 2=DISABLED, etc.)
        'currency',             // Currency code (USD, EUR, etc.)
        'timezone_id',          // Timezone ID
        'timezone_name',        // Timezone name
        'business{name}',        // Business Manager info
        'amount_spent'          // Total amount spent
      ].join(',');

      try {
        // Fetch ALL ad accounts with comprehensive pagination
        const allAccounts = await this.fetchAllAdAccountsWithPagination(fields, headers);
        
        debugLogger.debug('FacebookAdsService', 'All ad accounts refreshed', allAccounts.length);

        // Process and format the accounts according to Facebook API documentation
        const processedAccounts = allAccounts.map((account: any) => ({
          id: account.id,                    // Full ID with 'act_' prefix
          account_id: account.account_id,    // Numeric ID
          name: account.name || 'Unnamed Account',
          account_status: account.account_status,
          currency: account.currency,
          timezone_id: account.timezone_id,
          timezone_name: account.timezone_name,
          amount_spent: account.amount_spent ? parseFloat(account.amount_spent) / 100 : 0, // Convert cents to dollars
          business_name: account.business?.name || null,
          isActive: account.account_status === 1
        }));

        // Filter to only show active accounts (optional)
        const activeAccounts = processedAccounts.filter(acc => acc.isActive);
        
        debugLogger.info('FacebookAdsService', 'Ad accounts refreshed', {
          total: processedAccounts.length,
          active: activeAccounts.length
        });
        
        // Cache the results in Supabase for future use
        try {
          await this.cacheAdAccounts(activeAccounts);
        } catch (error) {
          debugLogger.warn('FacebookAdsService', 'Failed to cache refreshed ad accounts', error);
        }
        
        return activeAccounts;
        
      } catch (error) {
        debugLogger.error('FacebookAdsService', 'Error refreshing ad accounts from Facebook API', error);
        throw error;
      }
    } catch (error) {
      debugLogger.error('FacebookAdsService', 'Error refreshing Facebook ad accounts', error);
      throw error;
    }
  }

  // Check if we can access Tulen Agency business manager specifically
  static async checkTulenAgencyAccess(): Promise<{
    businessFound: boolean;
    businessInfo: any;
    ownedAccounts: any[];
    clientAccounts: any[];
    totalAccounts: number;
  }> {
    try {
      const userToken = await this.getUserAccessToken();
      const developerToken = await this.getDeveloperToken();
      
      if (!userToken || !developerToken) {
        throw new Error('Facebook tokens not found. Please authenticate first.');
      }

      debugLogger.info('FacebookAdsService', 'Checking access to Tulen Agency business manager');

      // Get all businesses
      const headers = await this.buildApiHeaders();
      const businessesResponse = await FacebookAdsService.rateLimitedFetch(
        `${this.BASE_URL}/me/businesses?fields=id,name&access_token=${userToken}`,
        { headers }
      );
      
      if (!businessesResponse.ok) {
        throw new Error(`Failed to fetch businesses: ${businessesResponse.status}`);
      }

      const businessesData = await businessesResponse.json();
      const businesses = businessesData.data || [];
      
      debugLogger.info('FacebookAdsService', 'All accessible businesses', {
        count: businesses.length,
        businesses: businesses.map((b: any) => ({ id: b.id, name: b.name }))
      });

      // Find Tulen Agency business manager
      const tulenAgency = businesses.find((b: any) => 
        b.name?.toLowerCase().includes('tulen') || 
        b.name?.toLowerCase().includes('agency')
      );

      if (!tulenAgency) {
        debugLogger.warn('FacebookAdsService', 'Tulen Agency business manager not found');
        return {
          businessFound: false,
          businessInfo: null,
          ownedAccounts: [],
          clientAccounts: [],
          totalAccounts: 0
        };
      }

      debugLogger.info('FacebookAdsService', 'Found Tulen Agency business manager', tulenAgency);

      // Get owned accounts
      let ownedAccounts: any[] = [];
      try {
        ownedAccounts = await FacebookAdsService.fetchPaginatedAccounts(
          `${this.BASE_URL}/${tulenAgency.id}/owned_ad_accounts?fields=id,name,account_status,currency,timezone_name&access_token=${userToken}`
        );
        debugLogger.info('FacebookAdsService', 'Tulen Agency owned accounts', {
          count: ownedAccounts.length,
          accounts: ownedAccounts.map(acc => ({ id: acc.id, name: acc.name }))
        });
      } catch (error) {
        debugLogger.error('FacebookAdsService', 'Error fetching Tulen Agency owned accounts', error);
      }

      // Get client accounts
      let clientAccounts: any[] = [];
      try {
        clientAccounts = await FacebookAdsService.fetchPaginatedAccounts(
          `${this.BASE_URL}/${tulenAgency.id}/client_ad_accounts?fields=id,name,account_status,currency,timezone_name&access_token=${userToken}`
        );
        debugLogger.info('FacebookAdsService', 'Tulen Agency client accounts', {
          count: clientAccounts.length,
          accounts: clientAccounts.map(acc => ({ id: acc.id, name: acc.name }))
        });
      } catch (error) {
        debugLogger.error('FacebookAdsService', 'Error fetching Tulen Agency client accounts', error);
      }

      const totalAccounts = ownedAccounts.length + clientAccounts.length;

      debugLogger.info('FacebookAdsService', 'Tulen Agency access summary', {
        businessFound: true,
        businessId: tulenAgency.id,
        businessName: tulenAgency.name,
        ownedAccounts: ownedAccounts.length,
        clientAccounts: clientAccounts.length,
        totalAccounts,
        allAccountNames: [...ownedAccounts, ...clientAccounts].map(acc => acc.name)
      });

      return {
        businessFound: true,
        businessInfo: tulenAgency,
        ownedAccounts,
        clientAccounts,
        totalAccounts
      };
    } catch (error) {
      debugLogger.error('FacebookAdsService', 'Error checking Tulen Agency access', error);
      throw error;
    }
  }

  // Search for a specific ad account by name
  static async searchAdAccountByName(accountName: string): Promise<any[]> {
    try {
      const userToken = await this.getUserAccessToken();
      const developerToken = await this.getDeveloperToken();
      
      if (!userToken || !developerToken) {
        throw new Error('Facebook tokens not found. Please authenticate first.');
      }

      debugLogger.info('FacebookAdsService', `Searching for ad account: "${accountName}"`);

      const foundAccounts: any[] = [];
      const searchTerms = [
        accountName.toLowerCase(),
        accountName.toLowerCase().replace(/\s+/g, ''),
        accountName.toLowerCase().replace(/\s+/g, '_'),
        accountName.toLowerCase().replace(/\s+/g, '-')
      ];

      // 1. Search in user accounts
      const headers = await this.buildApiHeaders();
      try {
        const userResponse = await FacebookAdsService.rateLimitedFetch(
          `${this.BASE_URL}/me/adaccounts?fields=id,name,account_status,currency,timezone_name&access_token=${userToken}`,
          { headers }
        );
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          const userAccounts = userData.data || [];
          
          for (const account of userAccounts) {
            const accountNameLower = account.name?.toLowerCase() || '';
            if (searchTerms.some(term => accountNameLower.includes(term))) {
              foundAccounts.push({ ...account, source: 'user_accounts' });
              debugLogger.info('FacebookAdsService', `Found "${accountName}" in user accounts`, account);
            }
          }
        }
      } catch (error) {
        debugLogger.error('FacebookAdsService', 'Error searching user accounts', error);
      }

      // 2. Search in business manager accounts
      try {
        const businessesResponse = await FacebookAdsService.rateLimitedFetch(
          `${this.BASE_URL}/me/businesses?fields=id,name&access_token=${userToken}`,
          { headers }
        );
        
        if (businessesResponse.ok) {
          const businessesData = await businessesResponse.json();
          const businesses = businessesData.data || [];
          
          for (const business of businesses) {
            try {
              // Search owned accounts
              const ownedAccounts = await FacebookAdsService.fetchPaginatedAccounts(
                `${this.BASE_URL}/${business.id}/owned_ad_accounts?fields=id,name,account_status,currency,timezone_name&access_token=${userToken}`
              );
              
              for (const account of ownedAccounts) {
                const accountNameLower = account.name?.toLowerCase() || '';
                if (searchTerms.some(term => accountNameLower.includes(term))) {
                  foundAccounts.push({ ...account, source: `business_owned_${business.name}` });
                  debugLogger.info('FacebookAdsService', `Found "${accountName}" in business owned accounts`, account);
                }
              }
              
              // Search client accounts
              const clientAccounts = await FacebookAdsService.fetchPaginatedAccounts(
                `${this.BASE_URL}/${business.id}/client_ad_accounts?fields=id,name,account_status,currency,timezone_name&access_token=${userToken}`
              );
              
              for (const account of clientAccounts) {
                const accountNameLower = account.name?.toLowerCase() || '';
                if (searchTerms.some(term => accountNameLower.includes(term))) {
                  foundAccounts.push({ ...account, source: `business_client_${business.name}` });
                  debugLogger.info('FacebookAdsService', `Found "${accountName}" in business client accounts`, account);
                }
              }
            } catch (error) {
              debugLogger.error('FacebookAdsService', `Error searching accounts for business ${business.name}`, error);
            }
          }
        }
      } catch (error) {
        debugLogger.error('FacebookAdsService', 'Error searching business accounts', error);
      }

      // 3. Search in system user accounts
      try {
        const sysUserAccounts = await FacebookAdsService.fetchSystemUserAccounts(userToken);
        
        for (const account of sysUserAccounts) {
          const accountNameLower = account.name?.toLowerCase() || '';
          if (searchTerms.some(term => accountNameLower.includes(term))) {
            foundAccounts.push({ ...account, source: 'system_user_accounts' });
            debugLogger.info('FacebookAdsService', `Found "${accountName}" in system user accounts`, account);
          }
        }
      } catch (error) {
        debugLogger.error('FacebookAdsService', 'Error searching system user accounts', error);
      }

      debugLogger.info('FacebookAdsService', `Search complete for "${accountName}"`, {
        found: foundAccounts.length,
        accounts: foundAccounts.map(acc => ({ id: acc.id, name: acc.name, source: acc.source }))
      });

      return foundAccounts;
    } catch (error) {
      debugLogger.error('FacebookAdsService', `Error searching for account "${accountName}"`, error);
      throw error;
    }
  }

  // Debug method to get detailed account information
  static async debugAdAccounts(): Promise<{
    userAccounts: any[];
    businessAccounts: any[];
    systemUserAccounts: any[];
    allAccounts: any[];
    uniqueAccounts: any[];
  }> {
    try {
      const userToken = await this.getUserAccessToken();
      const developerToken = await this.getDeveloperToken();
      
      if (!userToken || !developerToken) {
        throw new Error('Facebook tokens not found. Please authenticate first.');
      }

      debugLogger.info('FacebookAdsService', 'Starting detailed debug of ad accounts');

      const allAccounts: any[] = [];
      const userAccounts: any[] = [];
      const businessAccounts: any[] = [];
      const systemUserAccounts: any[] = [];

      // 1. Get user accounts
      const headers = await this.buildApiHeaders();
      try {
        const userResponse = await FacebookAdsService.rateLimitedFetch(
          `${this.BASE_URL}/me/adaccounts?fields=id,name,account_status,currency,timezone_name&access_token=${userToken}`,
          { headers }
        );
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          userAccounts.push(...(userData.data || []));
          allAccounts.push(...userAccounts);
          debugLogger.info('FacebookAdsService', 'User ad accounts found', {
            count: userAccounts.length,
            accounts: userAccounts.map(acc => ({ id: acc.id, name: acc.name }))
          });
        }
      } catch (error) {
        debugLogger.error('FacebookAdsService', 'Error fetching user accounts', error);
      }

      // 2. Get business managers and their accounts
      try {
        const businessesResponse = await FacebookAdsService.rateLimitedFetch(
          `${this.BASE_URL}/me/businesses?fields=id,name&access_token=${userToken}`,
          { headers }
        );
        
        if (businessesResponse.ok) {
          const businessesData = await businessesResponse.json();
          const businesses = businessesData.data || [];
          
          debugLogger.info('FacebookAdsService', 'Business managers found', {
            count: businesses.length,
            businesses: businesses.map((b: any) => ({ id: b.id, name: b.name }))
          });

          for (const business of businesses) {
            try {
              // Get owned accounts
              const ownedAccounts = await FacebookAdsService.fetchPaginatedAccounts(
                `${this.BASE_URL}/${business.id}/owned_ad_accounts?fields=id,name,account_status,currency,timezone_name&access_token=${userToken}`
              );
              businessAccounts.push(...ownedAccounts);
              
              // Get client accounts
              const clientAccounts = await FacebookAdsService.fetchPaginatedAccounts(
                `${this.BASE_URL}/${business.id}/client_ad_accounts?fields=id,name,account_status,currency,timezone_name&access_token=${userToken}`
              );
              businessAccounts.push(...clientAccounts);
              
              debugLogger.info('FacebookAdsService', `Business ${business.name} accounts`, {
                owned: ownedAccounts.length,
                client: clientAccounts.length,
                total: ownedAccounts.length + clientAccounts.length,
                accounts: [...ownedAccounts, ...clientAccounts].map(acc => ({ id: acc.id, name: acc.name }))
              });
            } catch (error) {
              debugLogger.error('FacebookAdsService', `Error fetching accounts for business ${business.name}`, error);
            }
          }
          
          allAccounts.push(...businessAccounts);
        }
      } catch (error) {
        debugLogger.error('FacebookAdsService', 'Error fetching business accounts', error);
      }

      // 3. Get system user accounts
      try {
        const sysUserAccounts = await FacebookAdsService.fetchSystemUserAccounts(userToken);
        systemUserAccounts.push(...sysUserAccounts);
        allAccounts.push(...systemUserAccounts);
        
        debugLogger.info('FacebookAdsService', 'System user accounts found', {
          count: systemUserAccounts.length,
          accounts: systemUserAccounts.map(acc => ({ id: acc.id, name: acc.name }))
        });
      } catch (error) {
        debugLogger.error('FacebookAdsService', 'Error fetching system user accounts', error);
      }

      // Remove duplicates
      const uniqueAccounts = allAccounts.filter((account, index, self) =>
        index === self.findIndex(a => a.id === account.id)
      );

      debugLogger.info('FacebookAdsService', 'Debug summary', {
        userAccounts: userAccounts.length,
        businessAccounts: businessAccounts.length,
        systemUserAccounts: systemUserAccounts.length,
        totalBeforeDedup: allAccounts.length,
        uniqueAccounts: uniqueAccounts.length,
        allAccountNames: uniqueAccounts.map(acc => acc.name)
      });

      return {
        userAccounts,
        businessAccounts,
        systemUserAccounts,
        allAccounts,
        uniqueAccounts
      };
    } catch (error) {
      debugLogger.error('FacebookAdsService', 'Error in debugAdAccounts', error);
      throw error;
    }
  }

  // Clear cached ad accounts to force fresh fetch
  static async clearAdAccountsCache(): Promise<void> {
    // No caching needed for direct token approach
    debugLogger.info('FacebookAdsService', 'Cache clear requested (no-op for direct token)');
  }

  // Clear metrics cache to force fresh fetch
  static clearMetricsCache(): void {
    this.requestCache.clear();
    debugLogger.info('FacebookAdsService', 'Metrics cache cleared');
  }

  // Cache ad accounts in Supabase integration
  private static async cacheAdAccounts(accounts: any[]): Promise<void> {
    // No caching needed for direct token approach
    debugLogger.debug('FacebookAdsService', 'Cache requested (no-op for direct token)', { count: accounts.length });
  }

  static async getPlatformBreakdown(adAccountId?: string, dateRange?: { start: string; end: string }): Promise<FacebookAdsMetrics['platformBreakdown']> {
    try {
      const accounts = await this.getAdAccounts();
      const accountId = adAccountId || accounts[0]?.id;

      if (!accountId) {
        throw new Error('No ad account found');
      }

      // Ensure account ID has 'act_' prefix
      const formattedAccountId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;

      // Fetch platform breakdown data
      const fields = [
        'impressions',
        'clicks',
        'spend',
        'actions'
      ].join(',');

      const params = new URLSearchParams({
        access_token: await this.getAccessToken(),
        fields,
        breakdowns: 'publisher_platform,platform_position',
        limit: '1000'
      });

      if (dateRange) {
        // Check if it's a preset period that Facebook API supports
        if ((dateRange as any).period === 'lastMonth') {
          params.append('date_preset', 'last_month');
        } else {
          // Facebook API expects dates in YYYY-MM-DD format
          const since = dateRange.start.includes('T') ? dateRange.start.split('T')[0] : dateRange.start;
          const until = dateRange.end.includes('T') ? dateRange.end.split('T')[0] : dateRange.end;
          
          params.append('time_range', JSON.stringify({
            since,
            until
          }));
        }
      }

      const response = await fetch(
        `${this.BASE_URL}/${formattedAccountId}/insights?${params}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        debugLogger.error('FacebookAdsService', 'Facebook platform API error details', errorData);
        throw new Error(`Facebook API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      debugLogger.debug('FacebookAdsService', 'Facebook platform API response', data);
      
      // Process platform data
      const platformBreakdown = this.processPlatformData(data.data || []);
      
      return platformBreakdown || undefined;
    } catch (error) {
      debugLogger.error('FacebookAdsService', 'Error fetching Facebook platform data', error);
      return null;
    }
  }

  static async getDemographicBreakdown(adAccountId?: string, dateRange?: { start: string; end: string }): Promise<FacebookAdsMetrics['demographics']> {
    try {
      const accounts = await this.getAdAccounts();
      const accountId = adAccountId || accounts[0]?.id;

      if (!accountId) {
        throw new Error('No ad account found');
      }

      // Ensure account ID has 'act_' prefix
      const formattedAccountId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;

      // Fetch demographic breakdown data
      const fields = [
        'impressions',
        'clicks',
        'spend',
        'actions'
      ].join(',');

      const params = new URLSearchParams({
        access_token: await this.getAccessToken(),
        fields,
        breakdowns: 'age,gender',
        limit: '1000'
      });

      if (dateRange) {
        // Check if it's a preset period that Facebook API supports
        if ((dateRange as any).period === 'lastMonth') {
          params.append('date_preset', 'last_month');
        } else {
          // Facebook API expects dates in YYYY-MM-DD format
          const since = dateRange.start.includes('T') ? dateRange.start.split('T')[0] : dateRange.start;
          const until = dateRange.end.includes('T') ? dateRange.end.split('T')[0] : dateRange.end;
          
          params.append('time_range', JSON.stringify({
            since,
            until
          }));
        }
      }

      const response = await fetch(
        `${this.BASE_URL}/${formattedAccountId}/insights?${params}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        debugLogger.error('FacebookAdsService', 'Facebook demographic API error details', errorData);
        throw new Error(`Facebook API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      debugLogger.debug('FacebookAdsService', 'Facebook demographic API response', data);
      
      // Process demographic data
      const demographics = this.processDemographicData(data.data || []);
      
      return demographics || undefined;
    } catch (error) {
      debugLogger.error('FacebookAdsService', 'Error fetching Facebook demographic data', error);
      return null;
    }
  }

  private static extractLeadsFromActions(actions: any[]): number {
    if (!actions || !Array.isArray(actions)) {
      return 0;
    }

    // Look for lead or purchase actions
    const leadAction = actions.find((action: any) => 
      action.action_type === 'lead' || action.action_type === 'purchase'
    );

    return leadAction ? parseInt(leadAction.value || '0') : 0;
  }

  private static processDemographicData(insightsData: any[]): FacebookAdsMetrics['demographics'] {
    const ageGroups = {
      '25-34': 0,
      '35-44': 0,
      '45-54': 0,
      '55+': 0
    };
    
    const gender = {
      female: 0,
      male: 0
    };

    let totalLeads = 0;

    insightsData.forEach((insight: any) => {
      const leads = FacebookAdsService.extractLeadsFromActions(insight.actions || []);
      totalLeads += leads;

      // Process age groups
      if (insight.age) {
        const ageRange = insight.age;
        if (ageRange === '25-34') {ageGroups['25-34'] += leads;}
        else if (ageRange === '35-44') {ageGroups['35-44'] += leads;}
        else if (ageRange === '45-54') {ageGroups['45-54'] += leads;}
        else if (ageRange === '55-64' || ageRange === '65+') {ageGroups['55+'] += leads;}
      }

      // Process gender
      if (insight.gender) {
        if (insight.gender === 'female') {gender.female += leads;}
        else if (insight.gender === 'male') {gender.male += leads;}
      }
    });

    // Convert to percentages
    if (totalLeads > 0) {
      Object.keys(ageGroups).forEach(key => {
        ageGroups[key as keyof typeof ageGroups] = Math.round((ageGroups[key as keyof typeof ageGroups] / totalLeads) * 100);
      });
      
      gender.female = Math.round((gender.female / totalLeads) * 100);
      gender.male = Math.round((gender.male / totalLeads) * 100);
    }

    return { ageGroups, gender };
  }

  private static processPlatformData(insightsData: any[]): FacebookAdsMetrics['platformBreakdown'] {
    const facebookVsInstagram = {
      facebook: 0,
      instagram: 0
    };
    
    const adPlacements = {
      feed: 0,
      stories: 0,
      reels: 0
    };

    let totalLeads = 0;

    insightsData.forEach((insight: any) => {
      const leads = FacebookAdsService.extractLeadsFromActions(insight.actions || []);
      totalLeads += leads;

      // Process publisher platform (Facebook vs Instagram)
      if (insight.publisher_platform) {
        if (insight.publisher_platform === 'facebook') {
          facebookVsInstagram.facebook += leads;
        } else if (insight.publisher_platform === 'instagram') {
          facebookVsInstagram.instagram += leads;
        }
      }

      // Process platform position (feed, stories, reels)
      if (insight.platform_position) {
        const position = insight.platform_position.toLowerCase();
        if (position.includes('feed')) {
          adPlacements.feed += leads;
        } else if (position.includes('story')) {
          adPlacements.stories += leads;
        } else if (position.includes('reel')) {
          adPlacements.reels += leads;
        }
      }
    });

    // Convert to percentages
    if (totalLeads > 0) {
      const facebookTotal = facebookVsInstagram.facebook + facebookVsInstagram.instagram;
      if (facebookTotal > 0) {
        facebookVsInstagram.facebook = Math.round((facebookVsInstagram.facebook / facebookTotal) * 100);
        facebookVsInstagram.instagram = Math.round((facebookVsInstagram.instagram / facebookTotal) * 100);
      }

      const placementsTotal = adPlacements.feed + adPlacements.stories + adPlacements.reels;
      if (placementsTotal > 0) {
        adPlacements.feed = Math.round((adPlacements.feed / placementsTotal) * 100);
        adPlacements.stories = Math.round((adPlacements.stories / placementsTotal) * 100);
        adPlacements.reels = Math.round((adPlacements.reels / placementsTotal) * 100);
      }
    }

    return { facebookVsInstagram, adPlacements };
  }

  static async getConversionActions(adAccountId: string): Promise<any[]> {
    try {
      const token = await this.getAccessToken();
      const formattedAccountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;

      debugLogger.debug('FacebookAdsService', 'Fetching conversion actions', { 
        accountId: formattedAccountId,
        tokenLength: token.length 
      });

      const response = await this.rateLimitedFetch(
        `${this.BASE_URL}/${formattedAccountId}/customconversions?fields=id,name,category,type,status`,
        { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );

      if (!response.ok) {
        const errorData = await response.json();
        debugLogger.error('FacebookAdsService', 'Facebook conversion actions API error', {
          status: response.status,
          error: errorData
        });
        throw new Error(`Facebook API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      debugLogger.debug('FacebookAdsService', 'Facebook conversion actions response', data);
      
      // Return fallback conversion actions if no custom conversions exist
      if (!data.data || data.data.length === 0) {
        debugLogger.info('FacebookAdsService', 'No custom conversions found, returning fallback actions');
        return [
          { id: 'lead', name: 'Lead', category: 'LEAD', type: 'WEBSITE', status: 'ACTIVE' },
          { id: 'purchase', name: 'Purchase', category: 'PURCHASE', type: 'WEBSITE', status: 'ACTIVE' },
          { id: 'add_to_cart', name: 'Add to Cart', category: 'PURCHASE', type: 'WEBSITE', status: 'ACTIVE' },
          { id: 'view_content', name: 'View Content', category: 'ENGAGEMENT', type: 'WEBSITE', status: 'ACTIVE' },
          { id: 'signup', name: 'Sign Up', category: 'LEAD', type: 'WEBSITE', status: 'ACTIVE' }
        ];
      }
      
      debugLogger.info('FacebookAdsService', 'Successfully loaded custom conversions', { 
        count: data.data.length 
      });
      return data.data || [];
    } catch (error) {
      debugLogger.error('FacebookAdsService', 'Error fetching Facebook conversion actions', error);
      // Return fallback conversion actions
      return [
        { id: 'lead', name: 'Lead', category: 'LEAD', type: 'WEBSITE', status: 'ACTIVE' },
        { id: 'purchase', name: 'Purchase', category: 'PURCHASE', type: 'WEBSITE', status: 'ACTIVE' },
        { id: 'add_to_cart', name: 'Add to Cart', category: 'PURCHASE', type: 'WEBSITE', status: 'ACTIVE' },
        { id: 'view_content', name: 'View Content', category: 'ENGAGEMENT', type: 'WEBSITE', status: 'ACTIVE' },
        { id: 'signup', name: 'Sign Up', category: 'LEAD', type: 'WEBSITE', status: 'ACTIVE' }
      ];
    }
  }

  static async getCampaigns(adAccountId?: string, dateRange?: { start: string; end: string }): Promise<FacebookAdsCampaign[]> {
    try {
      // Get ad accounts if no specific account ID provided
      const accounts = await this.getAdAccounts();
      const accountId = adAccountId || accounts[0]?.id;

      if (!accountId) {
        throw new Error('No ad account found');
      }

      const fields = [
        'id',
        'name',
        'status',
        'objective',
        'insights{impressions,clicks,spend,actions,ctr,cpc,cpm,reach,frequency}'
      ].join(',');

      const params = new URLSearchParams({
        access_token: await this.getAccessToken(),
        fields,
        limit: '100'
      });

      if (dateRange) {
        // Check if it's a preset period that Facebook API supports
        if ((dateRange as any).period === 'lastMonth') {
          params.append('date_preset', 'last_month');
        } else {
          // Facebook API expects dates in YYYY-MM-DD format
          const since = dateRange.start.includes('T') ? dateRange.start.split('T')[0] : dateRange.start;
          const until = dateRange.end.includes('T') ? dateRange.end.split('T')[0] : dateRange.end;
          
          params.append('time_range', JSON.stringify({
            since,
            until
          }));
        }
      }

      const response = await fetch(
        `${this.BASE_URL}/${accountId}/campaigns?${params}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Facebook API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();

      return data.data.map((campaign: any) => ({
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        objective: campaign.objective,
        metrics: this.parseMetrics(campaign.insights?.data?.[0] || {}),
        dateRange: dateRange || { start: '', end: '' }
      }));
    } catch (error) {
      debugLogger.error('FacebookAdsService', 'Error fetching Facebook campaigns', error);
      throw error;
    }
  }


  /**
   * Get monthly metrics for the previous 4 months (excluding current month)
   */
  static async getMonthlyMetrics(adAccountId?: string, conversionAction?: string): Promise<Array<{
    month: string;
    leads: number;
    spend: number;
    impressions: number;
    clicks: number;
  }>> {
    debugLogger.info('FacebookAdsService', 'Getting monthly metrics', { adAccountId, conversionAction });
    
    if (!adAccountId) {
      debugLogger.warn('FacebookAdsService', 'No ad account ID provided for monthly metrics');
      return [];
    }

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-11

    // Calculate date range for last 4 complete months (excluding current month)
    // Simple UTC approach - no timezone complications
    const endDate = new Date(currentYear, currentMonth, 0); // Last day of previous month
    const startDate = new Date(currentYear, currentMonth - 4, 1); // First day of 4 months ago
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    try {
      debugLogger.info('FacebookAdsService', 'Fetching monthly data with time_increment', { 
        startDateStr, 
        endDateStr, 
        adAccountId 
      });

      // Use Facebook Insights API with time_increment: 'monthly'
      const params = new URLSearchParams({
        time_range: JSON.stringify({
          since: startDateStr,
          until: endDateStr
        }),
        time_increment: 'monthly', // KEY PARAMETER for monthly breakdown
        level: 'account',
        fields: 'actions,date_start,date_stop,spend,impressions,clicks,outbound_clicks,cost_per_action_type'
      });

      const accessToken = await this.getAccessToken();
      // Ensure account ID has 'act_' prefix (don't double it)
      const formattedAccountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
      const url = `${this.BASE_URL}/${formattedAccountId}/insights?${params}`;
      
      const response = await this.rateLimitedFetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Facebook API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      debugLogger.info('FacebookAdsService', 'Facebook API response', result);

      // Process the response
      const monthlyData = result.data.map((row: any) => {
        // Extract leads from actions array - Use priority-based approach to avoid double-counting
        let leads = 0;
        if (row.actions) {
          // Priority order: most reliable first
          const leadActionPriority = [
            'lead', // Most direct lead action
            'offsite_conversion.fb_pixel_lead', // Facebook pixel lead
            'onsite_web_lead', // Onsite web lead
            'offsite_conversion.lead', // Generic offsite lead
            'onsite_conversion.lead', // Onsite conversion lead
            'offsite_conversion.fb_pixel_complete_registration', // Registration completion
            'offsite_conversion.fb_pixel_purchase' // Sometimes leads are tracked as purchases
          ];
          
          // Find the first (highest priority) lead action and use only that value
          for (const priorityAction of leadActionPriority) {
            const action = row.actions.find((a: any) => a.action_type === priorityAction);
            if (action) {
              leads = parseFloat(action.value || '0');
              break; // Use only the first (highest priority) lead action
            }
          }
        }
        
        return {
          month: row.date_start.substring(0, 7), // "YYYY-MM"
          leads: leads,
          spend: parseFloat(row.spend || 0),
          impressions: parseInt(row.impressions || 0),
          clicks: parseInt(row.clicks || 0)
        };
      });

      // Sort by month
      monthlyData.sort((a: any, b: any) => a.month.localeCompare(b.month));
      
      debugLogger.info('FacebookAdsService', 'Processed monthly data', monthlyData);
      return monthlyData;
    } catch (error) {
      debugLogger.error('FacebookAdsService', 'Error fetching monthly data', error);
      throw error;
    }
  }

  static async getAccountMetrics(adAccountId?: string, dateRange?: { start: string; end: string }, conversionAction?: string, includePreviousPeriod: boolean = false): Promise<FacebookAdsMetrics> {
    try {
      // Clear cache if includePreviousPeriod is true to ensure fresh data
      if (includePreviousPeriod) {
        this.clearMetricsCache();
      }
      
      // Create cache key for this request
      const cacheKey = `account-metrics-${adAccountId}-${dateRange?.start}-${dateRange?.end}-${conversionAction}-${includePreviousPeriod}`;
      
      // Check cache first (but skip cache if includePreviousPeriod is true)
      const cachedData = this.getCachedData(cacheKey);
      if (cachedData && !includePreviousPeriod) {
        debugLogger.debug('FacebookAdsService', 'Using cached account metrics', { cacheKey });
        return cachedData;
      }
      
      if (cachedData && includePreviousPeriod) {
        debugLogger.debug('FacebookAdsService', 'Skipping cache for previous period data', { cacheKey });
      }

      // Use provided account ID or get from integration config
      let accountId = adAccountId;
      
      if (!accountId) {
        // Get first account from API call
        if (!accountId) {
          const accounts = await this.getAdAccounts();
          accountId = accounts[0]?.id;
        }
      }

      if (!accountId) {
        throw new Error('No ad account found');
      }

      // Ensure account ID has 'act_' prefix
      const formattedAccountId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;

      const fields = 'impressions,clicks,spend,actions,ctr,cpc,cpm,reach,frequency,cost_per_link_click';
      const token = await this.getAccessToken();
      const params = new URLSearchParams({
        access_token: token,
        fields,
        level: 'account'
      });

      if (dateRange) {
        // Check if it's a preset period that Facebook API supports
        if ((dateRange as any).period === 'lastMonth') {
          params.append('date_preset', 'last_month');
        } else {
          // Facebook API expects dates in YYYY-MM-DD format
          const since = dateRange.start.includes('T') ? dateRange.start.split('T')[0] : dateRange.start;
          const until = dateRange.end.includes('T') ? dateRange.end.split('T')[0] : dateRange.end;
          
          params.append('time_range', JSON.stringify({
            since,
            until
          }));
        }
      }

      const url = `${this.BASE_URL}/${formattedAccountId}/insights?${params}`;
      debugLogger.debug('FacebookAdsService', 'Facebook API URL', url);

      const response = await FacebookAdsService.rateLimitedFetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        debugLogger.error('FacebookAdsService', 'Facebook API error', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          url: url.replace(/access_token=[^&]+/, 'access_token=***')
        });
        throw new Error(`Facebook API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      debugLogger.debug('FacebookAdsService', 'Facebook insights response', {
        dataCount: data.data?.length || 0,
        firstRecord: data.data?.[0] || null,
        paging: data.paging,
        rawResponse: data
      });
      
      // Log if we got empty data
      if (!data.data || data.data.length === 0) {
        debugLogger.warn('FacebookAdsService', 'Facebook API returned empty data array', {
          accountId: formattedAccountId,
          dateRange,
          response: data,
          url: url.replace(/access_token=[^&]+/, 'access_token=***')
        });
        
        // Return empty metrics instead of throwing error
        return {
          impressions: 0,
          clicks: 0,
          spend: 0,
          leads: 0,
          conversions: 0,
          ctr: 0,
          cpc: 0,
          cpm: 0,
          roas: 0,
          reach: 0,
          frequency: 0
        };
      }
      
      // Fetch demographic and platform breakdown data
      const demographics = await this.getDemographicBreakdown(accountId, dateRange);
      const platformBreakdown = await this.getPlatformBreakdown(accountId, dateRange);
      
      const metrics = this.parseMetrics(data.data?.[0] || {
        impressions: '0',
        clicks: '0',
        spend: '0',
        actions: [],
        ctr: '0',
        cpc: '0',
        cpm: '0',
        roas: '0',
        reach: '0',
        frequency: '0'
      }, conversionAction);
      // Include demographic and platform data
      metrics.demographics = demographics;
      metrics.platformBreakdown = platformBreakdown;
      
      // Fetch previous period data if requested
      debugLogger.debug('FacebookAdsService', 'Previous period check:', {
        includePreviousPeriod,
        hasDateRange: !!dateRange,
        dateRange,
        formattedAccountId,
        willFetch: includePreviousPeriod && !!dateRange
      });
      
      if (includePreviousPeriod && dateRange) {
        debugLogger.debug('FacebookAdsService', 'Fetching previous period data', {
          includePreviousPeriod,
          dateRange,
          formattedAccountId
        });
        try {
          const previousPeriodMetrics = await this.getPreviousPeriodMetrics(formattedAccountId, dateRange, conversionAction);
          metrics.previousPeriod = previousPeriodMetrics;
          debugLogger.debug('FacebookAdsService', 'Previous period data fetched successfully', {
            previousPeriodMetrics,
            hasPreviousPeriod: !!metrics.previousPeriod
          });
        } catch (error) {
          debugLogger.warn('FacebookAdsService', 'Failed to fetch previous period data', error);
          // Continue without previous period data
        }
      } else {
        debugLogger.debug('FacebookAdsService', 'Skipping previous period data', {
          includePreviousPeriod,
          hasDateRange: !!dateRange,
          reason: !includePreviousPeriod ? 'includePreviousPeriod is false' : 'dateRange is missing'
        });
      }
      
      // Cache the result
      this.setCachedData(cacheKey, metrics);
      
      return metrics;
    } catch (error) {
      debugLogger.error('FacebookAdsService', 'Error fetching Facebook account metrics', error);
      throw error;
    }
  }

  private static async getPreviousPeriodMetrics(accountId: string, currentDateRange: { start: string; end: string }, conversionAction?: string): Promise<FacebookAdsMetrics['previousPeriod']> {
    try {
      // Calculate previous period date range
      const currentStart = new Date(currentDateRange.start);
      const currentEnd = new Date(currentDateRange.end);
      const periodLength = currentEnd.getTime() - currentStart.getTime();
      
      const previousEnd = new Date(currentStart.getTime() - 1); // Day before current period starts
      const previousStart = new Date(previousEnd.getTime() - periodLength);
      
      const previousDateRange = {
        start: previousStart.toISOString().split('T')[0],
        end: previousEnd.toISOString().split('T')[0]
      };
      
      debugLogger.debug('FacebookAdsService', 'Previous period date range calculated:', {
        currentStart: currentDateRange.start,
        currentEnd: currentDateRange.end,
        periodLengthDays: Math.round(periodLength / (1000 * 60 * 60 * 24)),
        previousStart: previousDateRange.start,
        previousEnd: previousDateRange.end,
        previousPeriodLengthDays: Math.round((new Date(previousDateRange.end).getTime() - new Date(previousDateRange.start).getTime()) / (1000 * 60 * 60 * 24))
      });
      
      debugLogger.debug('FacebookAdsService', 'Fetching previous period data', {
        currentPeriod: currentDateRange,
        previousPeriod: previousDateRange
      });
      
      const fields = 'impressions,clicks,spend,actions,ctr,cpc,cpm,reach,frequency';
      const token = await this.getAccessToken();
      const params = new URLSearchParams({
        access_token: token,
        fields,
        level: 'account',
        time_range: JSON.stringify({
          since: previousDateRange.start,
          until: previousDateRange.end
        })
      });

      const url = `${this.BASE_URL}/${accountId}/insights?${params}`;
      
      const response = await FacebookAdsService.rateLimitedFetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        const _errorData = {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        };
        throw new Error(`Previous period API error: ${response.statusText}`);
      }

      const data = await response.json();
      debugLogger.debug('FacebookAdsService', 'Previous period insights response', {
        hasData: !!data.data,
        dataCount: data.data?.length || 0,
        firstRecord: data.data?.[0] || null,
        rawResponse: data
      });
      
      const previousMetrics = this.parseMetrics(data.data?.[0] || {}, conversionAction);
      
      debugLogger.debug('FacebookAdsService', 'Previous period metrics parsed', {
        previousMetrics,
        hasData: !!data.data?.[0]
      });
      
      return {
        impressions: previousMetrics.impressions,
        clicks: previousMetrics.clicks,
        spend: previousMetrics.spend,
        leads: previousMetrics.leads,
        conversions: previousMetrics.conversions,
        ctr: parseFloat(String(previousMetrics.ctr || '0')) / 100, // Convert percentage to decimal
        cpc: parseFloat(String(previousMetrics.cpc || '0')), // CPC is already in currency format
        cpm: previousMetrics.cpm,
        roas: previousMetrics.roas,
        reach: previousMetrics.reach,
        frequency: previousMetrics.frequency
      };
    } catch (error) {
      debugLogger.error('FacebookAdsService', 'Error fetching previous period metrics', error);
      throw error;
    }
  }

  private static parseMetrics(insights: any, conversionAction?: string): FacebookAdsMetrics {
    debugLogger.debug('FacebookAdsService', 'Parsing metrics from insights', {
      insights,
      conversionAction,
      hasActions: !!insights.actions,
      actionsCount: insights.actions?.length || 0
    });

    let leads = 0;

    if (conversionAction && insights.actions) {
      // Use specific conversion action
      const action = insights.actions.find((action: any) => action.action_type === conversionAction);
      leads = action?.value || 0;
      debugLogger.debug('FacebookAdsService', 'Using specific conversion action', {
        conversionAction,
        action,
        leads
      });
    } else {
      // Fallback to lead or purchase
      leads = insights.actions?.find((action: any) =>
        action.action_type === 'purchase' || action.action_type === 'lead'
      )?.value || 0;
      debugLogger.debug('FacebookAdsService', 'Using fallback conversion action', {
        actions: insights.actions,
        leads
      });
    }

    const metrics = {
      impressions: parseInt(insights.impressions || '0'),
      clicks: parseInt(insights.clicks || '0'),
      spend: parseFloat(insights.spend || '0'),
      leads: parseInt(leads.toString()),
      conversions: parseInt(leads.toString()), // Using leads as conversions for now
      ctr: parseFloat(insights.ctr || '0') / 100, // Convert percentage to decimal (Facebook returns CTR as percentage)
      cpc: parseFloat(insights.cost_per_link_click || insights.cpc || '0'), // Use cost_per_link_click if available, fallback to cpc
      cpm: parseFloat(insights.cpm || '0'),
      roas: parseFloat(insights.roas || '0'),
      reach: parseInt(insights.reach || '0'),
      frequency: parseFloat(insights.frequency || '0')
    };

    debugLogger.debug('FacebookAdsService', 'Parsed metrics result', metrics);
    return metrics;
  }

  static async testConnection(): Promise<{ success: boolean; error?: string; accountInfo?: any }> {
    debugService.call('FacebookAdsService', 'testConnection');
    try {
      // Check if we have a token
      let token: string;
      try {
        token = await this.getAccessToken();
      } catch (_error) {
        debugService.error('FacebookAdsService', 'testConnection', 'No access token found');
        return { success: false, error: 'No Facebook access token found. Please connect your Facebook account first.' };
      }

      // Test authentication
      const isValid = await this.authenticate();
      if (!isValid) {
        debugService.error('FacebookAdsService', 'testConnection', 'Invalid access token');
        return { success: false, error: 'Invalid access token. Please reconnect your Facebook account.' };
      }

      // Get user info
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      const userResponse = await FacebookAdsService.rateLimitedFetch(`${this.BASE_URL}/me`, { headers });
      if (!userResponse.ok) {
        const errorData = await userResponse.json();
        debugLogger.error('FacebookAdsService', 'Facebook user info error', errorData);
        debugService.error('FacebookAdsService', 'testConnection', errorData);
        
        if (errorData.error?.code === 4) {
          return { success: false, error: 'Facebook API rate limit reached. Please try again later.' };
        } else if (errorData.error?.code === 190) {
          return { success: false, error: 'Facebook access token has expired. Please reconnect your Facebook account.' };
        }
        
        return { success: false, error: `Failed to get user info: ${errorData.error?.message || 'Unknown error'}` };
      }
      const userData = await userResponse.json();
      debugService.success('FacebookAdsService', 'testConnection', userData);

      // Get ad accounts
      const accounts = await this.getAdAccounts();

      return {
        success: true,
        accountInfo: {
          user: userData,
          adAccounts: accounts
        }
      };
    } catch (error) {
      debugLogger.error('FacebookAdsService', 'Facebook connection test failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async disconnect(): Promise<void> {
    try {
      // Update database to mark as disconnected
      const { supabase } = await import('@/lib/supabase');
      const { error } = await supabase
        .from('integrations')
        .update({ 
          connected: false,
          config: {},
          updated_at: new Date().toISOString()
        })
        .eq('platform', 'facebookAds');

      if (error) {
        throw error;
      }

      debugLogger.info('FacebookAdsService', 'Facebook Ads disconnected');
    } catch (error) {
      debugLogger.error('FacebookAdsService', 'Error disconnecting Facebook Ads', error);
      throw error;
    }
  }
}
