import { API_BASE_URLS, API_VERSIONS } from '@/constants/apiVersions';
import { debugLogger, debugService } from '@/lib/debug';

export interface FacebookAdsMetrics {
  impressions: number;
  clicks: number;
  spend: number;
  leads: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpm: number;
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
    // Detailed placement metrics (spend and leads)
    placementMetrics?: {
      feed: { leads: number; spend: number };
      stories: { leads: number; spend: number };
      reels: { leads: number; spend: number };
    };
    creativeBreakdown: {
      image: number;
      video: number;
      carousel: number;
      other: number;
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
  private static requestCache = new Map<string, { data: any; timestamp: number }>();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Cache management methods
  private static getCachedData(key: string): any | null {
    const cached = this.requestCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  private static setCachedData(key: string, data: any): void {
    this.requestCache.set(key, { data, timestamp: Date.now() });
  }

  // Get developer token from environment variables or integrations table (DEPRECATED - not used) - CACHE BUST
  static async getDeveloperToken(): Promise<string> {
    try {
      // First try to get from environment variables
      const envToken = import.meta.env.VITE_FACEBOOK_DEVELOPER_TOKEN;
      if (envToken && envToken !== 'your_facebook_developer_token') {
        debugLogger.debug('FacebookAdsService', 'Using Facebook developer token from environment');
        return envToken;
      }

      // Fallback to database lookup
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase
        .from('facebook_ads_configs')
        .select('developer_token')
        .eq('is_active', true)
        .single();

      if (error) {
        debugLogger.error('FacebookAdsService', 'Error fetching Facebook developer token from database', error);
        throw new Error('No Facebook developer token found in database or environment');
      }

      if (!data?.developer_token) {
        throw new Error('No Facebook developer token found in database or environment');
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
  private static pendingRequests = new Map<string, Promise<any>>();

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

  // Helper method to build Facebook API URL with both tokens
  private static async buildApiUrl(endpoint: string, params: Record<string, string> = {}, userToken?: string): Promise<string> {
    const token = userToken || await this.getUserAccessToken();
    
    const urlParams = new URLSearchParams({
      ...params,
      access_token: token,
      // Note: Developer token is typically passed in headers, not URL params
    });
    
    return `${this.BASE_URL}/${endpoint}?${urlParams}`;
  }

  // Helper method to build Facebook API headers
  private static async buildApiHeaders(): Promise<Record<string, string>> {
    return {
      'Content-Type': 'application/json',
      'User-Agent': 'Marketing-Analytics-Dashboard/1.0'
    };
  }

  static async authenticate(accessToken?: string, _adAccountId?: string): Promise<boolean> {
    try {
      const userToken = accessToken || await this.getUserAccessToken();

      // Validate user token with Facebook Graph API
      const headers = await this.buildApiHeaders();
      const response = await FacebookAdsService.rateLimitedFetch(
        `${this.BASE_URL}/me?access_token=${userToken}`,
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
      const headers = await this.buildApiHeaders();
      const businessResponse = await FacebookAdsService.rateLimitedFetch(
        `${this.BASE_URL}/me/businesses?fields=id&access_token=${token}`,
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
        throw new Error('Facebook access token not found. Please authenticate first.');
      }

      // Debug token info (without exposing the tokens)
      debugLogger.debug('FacebookAdsService', 'Facebook user token length', userToken.length);

      const token = userToken; // Use userToken as token for API calls
      const allAccounts: any[] = [];

      // Get all ad accounts accessible to the user (most comprehensive approach)
      debugLogger.debug('FacebookAdsService', 'Fetching ad accounts via /me/adaccounts endpoint');
      
      const response = await FacebookAdsService.rateLimitedFetch(
        `${this.BASE_URL}/me/adaccounts?fields=id,name,account_status,currency,timezone_name&limit=200&access_token=${token}`
      );

      if (!response.ok) {
        throw new Error(`Facebook API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      debugLogger.debug('FacebookAdsService', 'User ad accounts found', data.data?.length || 0);
      
      allAccounts.push(...(data.data || []));

      // Remove duplicates based on ID
      const uniqueAccounts = allAccounts.filter((account, index, self) =>
        index === self.findIndex(a => a.id === account.id)
      );

      debugLogger.debug('FacebookAdsService', 'Total unique ad accounts from API', uniqueAccounts.length);
      debugLogger.info('FacebookAdsService', 'Ad account fetch completed', {
        totalUnique: uniqueAccounts.length
      });
      
      // Cache the results in Supabase for future use
      try {
        await this.cacheAdAccounts(uniqueAccounts);
      } catch (error) {
        debugLogger.warn('FacebookAdsService', 'Failed to cache ad accounts', error);
      }
      
      return uniqueAccounts;
    } catch (error) {
      debugLogger.error('FacebookAdsService', 'Error fetching Facebook ad accounts', error);
      throw error;
    }
  }

  // Fetch paginated accounts to handle large numbers of ad accounts
  private static async fetchPaginatedAccounts(url: string, _userToken?: string): Promise<any[]> {
    const allAccounts: any[] = [];
    let nextUrl: string | null = url;

    while (nextUrl) {
      try {
        // Don't add headers if the URL already contains access_token
        const hasAccessToken = nextUrl.includes('access_token=');
        const options: RequestInit = hasAccessToken ? {} : { headers: await this.buildApiHeaders() };
        
        const response = await FacebookAdsService.rateLimitedFetch(nextUrl, options);
        
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
      
      // Get all businesses first
      const businessesResponse = await FacebookAdsService.rateLimitedFetch(
        `${this.BASE_URL}/me/businesses?fields=id,name&access_token=${userToken}`
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
            `${this.BASE_URL}/${business.id}/system_users?fields=id,name&access_token=${token}`
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
                `${this.BASE_URL}/${systemUser.id}/adaccounts?fields=id,name,account_status,currency,timezone_name&limit=200&access_token=${token}`
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
      
      const userToken = await this.getAccessToken();
      if (!userToken) {
        throw new Error('Facebook access token not found. Please authenticate first.');
      }

      const allAccounts: any[] = [];

      // Fetch user accounts, business accounts, and system user accounts in parallel for comprehensive coverage
      const [userAccounts, businessAccounts, systemUserAccounts] = await Promise.allSettled([
        // Get accounts directly associated with the user
        FacebookAdsService.rateLimitedFetch(`${this.BASE_URL}/me/adaccounts?fields=id,name,account_status,currency,timezone_name&limit=200&access_token=${token}`)
          .then(response => response.ok ? response.json() : { data: [] })
          .then(data => {
            debugLogger.debug('FacebookAdsService', 'User ad accounts', data.data?.length || 0);
            return data.data || [];
          })
          .catch(error => {
            debugLogger.error('FacebookAdsService', 'Error fetching user ad accounts', error);
            return [];
          }),

        // Get accounts from Business Managers
        FacebookAdsService.rateLimitedFetch(`${this.BASE_URL}/me/businesses?fields=id,name&access_token=${token}`)
          .then(response => {
            if (!response.ok) {
              if (response.status === 403) {
                debugLogger.warn('FacebookAdsService', 'Business Management permission not available or not granted. Skipping business accounts.');
                return { data: [] };
              }
              throw new Error(`Facebook API error: ${response.status} ${response.statusText}`);
            }
            return response.json();
          })
          .then(async businessData => {
            debugLogger.debug('FacebookAdsService', 'Business Managers found', businessData.data?.length || 0);

            if (!businessData.data?.length) {return [];}

            // Fetch ALL ad accounts for all Business Managers in parallel
            // This includes both owned_ad_accounts AND client_ad_accounts
            const businessAccountPromises = businessData.data.map(async (business: any) => {
              try {
                const allBusinessAccounts: any[] = [];
                
                // Fetch owned ad accounts with pagination support
                const ownedAccounts = await FacebookAdsService.fetchPaginatedAccounts(
                  `${this.BASE_URL}/${business.id}/owned_ad_accounts?fields=id,name,account_status,currency,timezone_name&limit=200&access_token=${token}`
                );
                allBusinessAccounts.push(...ownedAccounts);
                debugLogger.debug('FacebookAdsService', `Business ${business.name} owned ad accounts`, ownedAccounts.length);
                
                // Fetch client ad accounts (accounts managed by this business) with pagination support
                const clientAccounts = await FacebookAdsService.fetchPaginatedAccounts(
                  `${this.BASE_URL}/${business.id}/client_ad_accounts?fields=id,name,account_status,currency,timezone_name&limit=200&access_token=${token}`
                );
                allBusinessAccounts.push(...clientAccounts);
                debugLogger.debug('FacebookAdsService', `Business ${business.name} client ad accounts`, clientAccounts.length);
                
                debugLogger.debug('FacebookAdsService', `Business ${business.name} total ad accounts`, allBusinessAccounts.length);
                return allBusinessAccounts;
              } catch (error) {
                debugLogger.error('FacebookAdsService', `Error fetching accounts for business ${business.name}`, error);
                return [];
              }
            });

            const businessAccountResults = await Promise.allSettled(businessAccountPromises);
            return businessAccountResults
              .filter(result => result.status === 'fulfilled')
              .flatMap(result => (result as PromiseFulfilledResult<any[]>).value);
          })
          .catch(error => {
            debugLogger.error('FacebookAdsService', 'Error fetching Business Managers', error);
            return [];
          }),

        // Get accounts via system users (additional method to ensure comprehensive coverage)
        FacebookAdsService.fetchSystemUserAccounts(userToken)
          .catch(error => {
            debugLogger.warn('FacebookAdsService', 'Error fetching system user accounts', error);
            return [];
          })
      ]);

      // Combine all accounts
      if (userAccounts.status === 'fulfilled') {
        allAccounts.push(...userAccounts.value);
      }
      if (businessAccounts.status === 'fulfilled') {
        allAccounts.push(...businessAccounts.value);
      }
      if (systemUserAccounts.status === 'fulfilled') {
        allAccounts.push(...systemUserAccounts.value);
      }

      // Remove duplicates based on ID
      const uniqueAccounts = allAccounts.filter((account, index, self) =>
        index === self.findIndex(a => a.id === account.id)
      );

      debugLogger.debug('FacebookAdsService', 'Total unique ad accounts from API (refresh)', uniqueAccounts.length);
      debugLogger.info('FacebookAdsService', 'Comprehensive ad account refresh completed', {
        userAccounts: userAccounts.status === 'fulfilled' ? userAccounts.value.length : 0,
        businessAccounts: businessAccounts.status === 'fulfilled' ? businessAccounts.value.length : 0,
        systemUserAccounts: systemUserAccounts.status === 'fulfilled' ? systemUserAccounts.value.length : 0,
        totalUnique: uniqueAccounts.length
      });
      
      // Always cache the refreshed results
      try {
        await this.cacheAdAccounts(uniqueAccounts);
      } catch (error) {
        debugLogger.warn('FacebookAdsService', 'Failed to cache refreshed ad accounts', error);
      }
      
      return uniqueAccounts;
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
      const token = await this.getAccessToken();
      if (!token) {
        throw new Error('Facebook access token not found. Please authenticate first.');
      }

      debugLogger.info('FacebookAdsService', 'Checking access to Tulen Agency business manager');

      // Get all businesses
      const businessesResponse = await FacebookAdsService.rateLimitedFetch(
        `${this.BASE_URL}/me/businesses?fields=id,name&access_token=${token}`
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
          `${this.BASE_URL}/${tulenAgency.id}/owned_ad_accounts?fields=id,name,account_status,currency,timezone_name&limit=200&access_token=${token}`
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
          `${this.BASE_URL}/${tulenAgency.id}/client_ad_accounts?fields=id,name,account_status,currency,timezone_name&limit=200&access_token=${token}`
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
      const token = await this.getAccessToken();
      if (!token) {
        throw new Error('Facebook access token not found. Please authenticate first.');
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
      try {
        const userResponse = await FacebookAdsService.rateLimitedFetch(
          `${this.BASE_URL}/me/adaccounts?fields=id,name,account_status,currency,timezone_name&limit=200&access_token=${token}`
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
          `${this.BASE_URL}/me/businesses?fields=id,name&access_token=${token}`
        );
        
        if (businessesResponse.ok) {
          const businessesData = await businessesResponse.json();
          const businesses = businessesData.data || [];
          
          for (const business of businesses) {
            try {
              // Search owned accounts
              const ownedAccounts = await FacebookAdsService.fetchPaginatedAccounts(
                `${this.BASE_URL}/${business.id}/owned_ad_accounts?fields=id,name,account_status,currency,timezone_name&limit=200&access_token=${token}`
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
                `${this.BASE_URL}/${business.id}/client_ad_accounts?fields=id,name,account_status,currency,timezone_name&limit=200&access_token=${token}`
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
      const token = await this.getAccessToken();
      if (!token) {
        throw new Error('Facebook access token not found. Please authenticate first.');
      }

      debugLogger.info('FacebookAdsService', 'Starting detailed debug of ad accounts');

      const allAccounts: any[] = [];
      const userAccounts: any[] = [];
      const businessAccounts: any[] = [];
      const systemUserAccounts: any[] = [];

      // 1. Get user accounts
      try {
        const userResponse = await FacebookAdsService.rateLimitedFetch(
          `${this.BASE_URL}/me/adaccounts?fields=id,name,account_status,currency,timezone_name&limit=200&access_token=${token}`
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
          `${this.BASE_URL}/me/businesses?fields=id,name&access_token=${token}`
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
                `${this.BASE_URL}/${business.id}/owned_ad_accounts?fields=id,name,account_status,currency,timezone_name&limit=200&access_token=${token}`
              );
              businessAccounts.push(...ownedAccounts);
              
              // Get client accounts
              const clientAccounts = await FacebookAdsService.fetchPaginatedAccounts(
                `${this.BASE_URL}/${business.id}/client_ad_accounts?fields=id,name,account_status,currency,timezone_name&limit=200&access_token=${token}`
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

  // Try multiple approaches to get placement data using platform_position breakdown
  static async tryPlacementBreakdowns(accountId: string, dateRange?: { start: string; end: string }): Promise<any[]> {
    // Try platform_position breakdown (the correct approach for placement data)
    const approaches = [
      // Approach 1: Standard platform_position breakdown
      {
        name: 'platform_position_standard',
        fields: 'spend,impressions,clicks,actions',
        breakdowns: 'platform_position'
      },
      // Approach 2: platform_position with additional fields
      {
        name: 'platform_position_extended',
        fields: 'spend,impressions,clicks,actions,conversions',
        breakdowns: 'platform_position'
      },
      // Approach 3: Combined publisher_platform and platform_position
      {
        name: 'combined_breakdown',
        fields: 'spend,impressions,clicks,actions',
        breakdowns: 'publisher_platform,platform_position'
      },
      // Approach 4: platform_position at ad level
      {
        name: 'platform_position_ad_level',
        fields: 'spend,impressions,clicks,actions',
        breakdowns: 'platform_position',
        level: 'ad'
      },
      // Approach 5: platform_position at adset level
      {
        name: 'platform_position_adset_level',
        fields: 'spend,impressions,clicks,actions',
        breakdowns: 'platform_position',
        level: 'adset'
      }
    ];
    
    for (const approach of approaches) {
      try {
        debugLogger.debug('FacebookAdsService', `Trying placement approach: ${approach.name}`);
        
        const params = new URLSearchParams({
          access_token: await this.getAccessToken(),
          fields: approach.fields,
          breakdowns: approach.breakdowns,
          limit: '1000'
        });

        if (approach.level) {
          params.append('level', approach.level);
        }

        if (dateRange) {
          const since = dateRange.start.includes('T') ? dateRange.start.split('T')[0] : dateRange.start;
          const until = dateRange.end.includes('T') ? dateRange.end.split('T')[0] : dateRange.end;
          params.append('time_range', JSON.stringify({ since, until }));
        }

        const url = `${this.BASE_URL}/${accountId}/insights?${params}`;
        debugLogger.debug('FacebookAdsService', `Making request to: ${url}`);
        
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          debugLogger.debug('FacebookAdsService', `Placement approach ${approach.name} succeeded`, data);
          return data.data || [];
        } else {
          const errorData = await response.json();
          debugLogger.warn('FacebookAdsService', `Placement approach ${approach.name} failed`, errorData);
        }
      } catch (error) {
        debugLogger.warn('FacebookAdsService', `Placement approach ${approach.name} error`, error);
      }
    }

    debugLogger.warn('FacebookAdsService', 'All placement approaches failed, trying ad set level data');
    
    // Fallback: Try to get placement data from ad sets
    try {
      const adSetData = await this.getAdSetPlacementData(accountId, dateRange);
      if (adSetData.length > 0) {
        debugLogger.debug('FacebookAdsService', 'Got placement data from ad sets', adSetData);
        return adSetData;
      }
    } catch (error) {
      debugLogger.warn('FacebookAdsService', 'Ad set placement data failed', error);
    }
    
    return [];
  }

  // Get placement data from ad sets (manual placement tracking)
  static async getAdSetPlacementData(accountId: string, dateRange?: { start: string; end: string }): Promise<any[]> {
    try {
      const fields = [
        'impressions',
        'clicks', 
        'spend',
        'actions',
        'name',
        'targeting'
      ].join(',');

      const params = new URLSearchParams({
        access_token: await this.getAccessToken(),
        fields,
        limit: '1000'
      });

      if (dateRange) {
        const since = dateRange.start.includes('T') ? dateRange.start.split('T')[0] : dateRange.start;
        const until = dateRange.end.includes('T') ? dateRange.end.split('T')[0] : dateRange.end;
        params.append('time_range', JSON.stringify({ since, until }));
      }

      const response = await fetch(`${this.BASE_URL}/${accountId}/adsets?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        debugLogger.warn('FacebookAdsService', 'Ad set API error', errorData);
        return [];
      }

      const data = await response.json();
      debugLogger.debug('FacebookAdsService', 'Ad set data retrieved', data);
      
      // Process ad sets to extract placement information
      const placementData = [];
      
      for (const adSet of data.data || []) {
        if (adSet.targeting && adSet.targeting.publisher_platforms) {
          const platforms = adSet.targeting.publisher_platforms;
          const placements = adSet.targeting.publisher_platforms || [];
          
          // Extract placement info from targeting
          const placementInfo = {
            platform_position: platforms.join(','),
            impressions: adSet.impressions || 0,
            clicks: adSet.clicks || 0,
            spend: adSet.spend || 0,
            actions: adSet.actions || [],
            adset_name: adSet.name
          };
          
          placementData.push(placementInfo);
        }
      }
      
      return placementData;
    } catch (error) {
      debugLogger.error('FacebookAdsService', 'Error fetching ad set placement data', error);
      return [];
    }
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

      // Fetch platform breakdown data - separate calls for publisher_platform and placement
      const fields = [
        'impressions',
        'clicks',
        'spend',
        'actions',
        'conversions'
      ].join(',');

      // Get publisher platform data (Facebook vs Instagram)
      const publisherParams = new URLSearchParams({
        access_token: await this.getAccessToken(),
        fields,
        breakdowns: 'publisher_platform',
        limit: '1000'
      });

      // Try to get placement data using multiple approaches
      const placementData = await this.tryPlacementBreakdowns(formattedAccountId, dateRange);
      
      // Get creative breakdown data (Image, Video, Carousel, etc.)
      const creativeParams = new URLSearchParams({
        access_token: await this.getAccessToken(),
        fields,
        breakdowns: 'ad_format_asset', // Try different breakdown
        limit: '1000'
      });

      if (dateRange) {
        // Facebook API expects dates in YYYY-MM-DD format
        const since = dateRange.start.includes('T') ? dateRange.start.split('T')[0] : dateRange.start;
        const until = dateRange.end.includes('T') ? dateRange.end.split('T')[0] : dateRange.end;
        
        publisherParams.append('time_range', JSON.stringify({ since, until }));
        creativeParams.append('time_range', JSON.stringify({ since, until }));
      }

      // Make parallel requests for publisher platform and creative breakdown
      const [publisherResponse, creativeResponse] = await Promise.all([
        fetch(`${this.BASE_URL}/${formattedAccountId}/insights?${publisherParams}`),
        fetch(`${this.BASE_URL}/${formattedAccountId}/insights?${creativeParams}`)
      ]);

      if (!publisherResponse.ok) {
        const errorData = await publisherResponse.json();
        debugLogger.error('FacebookAdsService', 'Facebook publisher platform API error details', errorData);
        throw new Error(`Facebook API error: ${errorData.error?.message || publisherResponse.statusText}`);
      }

      const publisherData = await publisherResponse.json();
      let creativeData = { data: [] };
      
      if (creativeResponse.ok) {
        creativeData = await creativeResponse.json();
        debugLogger.debug('FacebookAdsService', 'Creative breakdown data', creativeData);
      } else {
        debugLogger.warn('FacebookAdsService', 'Creative breakdown failed, using empty data');
      }

      debugLogger.debug('FacebookAdsService', 'Facebook platform API responses', {
        publisher: publisherData,
        placement: placementData,
        creative: creativeData
      });
      
      // Process platform data
      const platformBreakdown = this.processPlatformData(
        publisherData.data || [],
        placementData,
        creativeData.data || []
      );
      
      return platformBreakdown;
    } catch (error) {
      debugLogger.error('FacebookAdsService', 'Error fetching Facebook platform data', error);
      // Return empty data instead of mock data
      return {
        facebookVsInstagram: {
          facebook: 0,
          instagram: 0
        },
        adPlacements: {
          feed: 0,
          stories: 0,
          reels: 0
        },
        creativeBreakdown: {
          image: 0,
          video: 0,
          carousel: 0,
          other: 0
        }
      };
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
        // Facebook API expects dates in YYYY-MM-DD format
        const since = dateRange.start.includes('T') ? dateRange.start.split('T')[0] : dateRange.start;
        const until = dateRange.end.includes('T') ? dateRange.end.split('T')[0] : dateRange.end;
        
        params.append('time_range', JSON.stringify({
          since,
          until
        }));
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
      
      return demographics;
    } catch (error) {
      debugLogger.error('FacebookAdsService', 'Error fetching Facebook demographic data', error);
      // Return empty data instead of mock data
      return {
        ageGroups: {
          '25-34': 0,
          '35-44': 0,
          '45-54': 0,
          '55+': 0
        },
        gender: {
          female: 0,
          male: 0
        }
      };
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

  private static processPlatformData(publisherData: any[], placementData: any[], creativeData: any[]): FacebookAdsMetrics['platformBreakdown'] {
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

    // Process publisher platform data (Facebook vs Instagram)
    publisherData.forEach((insight: any) => {
      const leads = FacebookAdsService.extractLeadsFromActions(insight.actions || []);
      totalLeads += leads;

      if (insight.publisher_platform) {
        const platform = insight.publisher_platform.toLowerCase();
        if (platform === 'facebook') {
          facebookVsInstagram.facebook += leads;
        } else if (platform === 'instagram') {
          facebookVsInstagram.instagram += leads;
        }
      }
    });

    // Process placement data (Feed, Stories, Reels) using platform_position breakdown
    // Track both leads and spend for each placement
    const placementMetrics = {
      feed: { leads: 0, spend: 0 },
      stories: { leads: 0, spend: 0 },
      reels: { leads: 0, spend: 0 }
    };

    placementData.forEach((insight: any) => {
      const leads = FacebookAdsService.extractLeadsFromActions(insight.actions || []);
      const spend = parseFloat(insight.spend || '0');

      if (insight.platform_position) {
        // Process platform_position breakdown (the correct approach for placement data)
        const position = insight.platform_position.toLowerCase();
        
        debugLogger.debug('FacebookAdsService', 'Processing platform_position', { 
          position, 
          leads, 
          spend,
          insight 
        });
        
        // Map platform_position values to placements based on Facebook API documentation
        // Feed placements
        if (position.includes('feed') || 
            position === 'facebook_feed' || 
            position === 'instagram_feed' ||
            position === 'facebook_mobile_feed' ||
            position === 'instagram_mobile_feed') {
          placementMetrics.feed.leads += leads;
          placementMetrics.feed.spend += spend;
        }
        // Stories placements
        else if (position.includes('story') || 
                 position === 'instagram_story' || 
                 position === 'instagram_stories' ||
                 position === 'facebook_story' ||
                 position === 'facebook_stories' ||
                 position === 'instagram_mobile_story') {
          placementMetrics.stories.leads += leads;
          placementMetrics.stories.spend += spend;
        }
        // Reels placements
        else if (position.includes('reel') || 
                 position === 'instagram_reels' || 
                 position === 'facebook_reels' ||
                 position === 'facebook_reels_overlay' ||
                 position === 'instagram_mobile_reels') {
          placementMetrics.reels.leads += leads;
          placementMetrics.reels.spend += spend;
        }
        // Other placements - map to closest equivalent
        else if (position.includes('right_hand_column') || 
                 position.includes('marketplace') ||
                 position.includes('desktop_feed')) {
          placementMetrics.feed.leads += leads; // Map to feed as closest equivalent
          placementMetrics.feed.spend += spend;
        }
        else if (position.includes('video_feeds') ||
                 position.includes('video')) {
          placementMetrics.reels.leads += leads; // Map to reels as closest equivalent
          placementMetrics.reels.spend += spend;
        }
        else {
          debugLogger.debug('FacebookAdsService', 'Unknown platform_position', { position, leads, spend });
        }
      } else if (insight.placement) {
        // Fallback to old placement field if available
        const placement = insight.placement.toLowerCase();
        if (placement === 'facebook_feed' || placement === 'instagram_feed') {
          placementMetrics.feed.leads += leads;
          placementMetrics.feed.spend += spend;
        } else if (placement === 'instagram_story' || placement === 'facebook_story') {
          placementMetrics.stories.leads += leads;
          placementMetrics.stories.spend += spend;
        } else if (placement === 'instagram_reels' || placement === 'facebook_reels') {
          placementMetrics.reels.leads += leads;
          placementMetrics.reels.spend += spend;
        }
      }
    });

    // Calculate percentages based on spend (more meaningful for ad placements)
    const totalSpend = placementMetrics.feed.spend + placementMetrics.stories.spend + placementMetrics.reels.spend;
    
    if (totalSpend > 0) {
      adPlacements.feed = Math.round((placementMetrics.feed.spend / totalSpend) * 100);
      adPlacements.stories = Math.round((placementMetrics.stories.spend / totalSpend) * 100);
      adPlacements.reels = Math.round((placementMetrics.reels.spend / totalSpend) * 100);
    }

    debugLogger.debug('FacebookAdsService', 'Placement metrics calculated', {
      placementMetrics,
      adPlacements,
      totalSpend
    });

    // Process creative data (Image, Video, Carousel, etc.)
    const creativeBreakdown = {
      image: 0,
      video: 0,
      carousel: 0,
      other: 0
    };

    creativeData.forEach((insight: any) => {
      const leads = FacebookAdsService.extractLeadsFromActions(insight.actions || []);

      if (insight.media_format) {
        const format = insight.media_format.toLowerCase();
        if (format === 'image') {
          creativeBreakdown.image += leads;
        } else if (format === 'video') {
          creativeBreakdown.video += leads;
        } else if (format === 'carousel') {
          creativeBreakdown.carousel += leads;
        } else {
          creativeBreakdown.other += leads;
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

    return { 
      facebookVsInstagram, 
      adPlacements, 
      placementMetrics, // Include detailed metrics (spend and leads)
      creativeBreakdown 
    };
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
        `${this.BASE_URL}/${formattedAccountId}/customconversions?fields=id,name,category,type,status&access_token=${token}`
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
        // Facebook API expects dates in YYYY-MM-DD format
        const since = dateRange.start.includes('T') ? dateRange.start.split('T')[0] : dateRange.start;
        const until = dateRange.end.includes('T') ? dateRange.end.split('T')[0] : dateRange.end;
        
        params.append('time_range', JSON.stringify({
          since,
          until
        }));
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
   * Get monthly historical metrics for the last 12 months using lead form insights
   */
  static async getMonthlyHistoricalMetrics(adAccountId?: string): Promise<Array<{ month: string; leads: number; spend: number; impressions: number; clicks: number }>> {
    try {
      debugLogger.debug('FacebookAdsService', 'Fetching monthly historical metrics', { adAccountId });
      
      // Use provided account ID or get from integration config
      let accountId = adAccountId;
      
      if (!accountId) {
        const accounts = await this.getAdAccounts();
        accountId = accounts[0]?.id;
      }

      if (!accountId) {
        throw new Error('No ad account found');
      }

      // Ensure account ID has 'act_' prefix
      const formattedAccountId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;

      const token = await this.getAccessToken();
      
      // Get data for the last 12 months using monthly time ranges
      const monthlyData = [];
      const currentDate = new Date();
      
      for (let i = 12; i >= 1; i--) {
        const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
        const endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0); // Last day of month
        
        const monthKey = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
        
        try {
          const params = new URLSearchParams({
            access_token: token,
            fields: 'impressions,clicks,spend,actions',
            level: 'account',
            time_range: JSON.stringify({
              since: startDate.toISOString().split('T')[0],
              until: endDate.toISOString().split('T')[0]
            })
          });

          const response = await fetch(
            `${this.BASE_URL}/${formattedAccountId}/insights?${params}`
          );

          if (response.ok) {
            const data = await response.json();
            const insights = data.data?.[0];
            
            if (insights) {
              const actions = insights.actions || [];
              const leadAction = actions.find((action: any) => 
                action.action_type === 'lead_gen.lead' || 
                action.action_type === 'lead' || 
                action.action_type === 'onsite_conversion.lead_grouped' ||
                action.action_type === 'onsite_conversion.lead'
              );
              
              monthlyData.push({
                month: monthKey,
                leads: leadAction ? parseInt(leadAction.value) : 0,
                spend: parseFloat(insights.spend || 0),
                impressions: parseInt(insights.impressions || 0),
                clicks: parseInt(insights.clicks || 0)
              });
            } else {
              monthlyData.push({
                month: monthKey,
                leads: 0,
                spend: 0,
                impressions: 0,
                clicks: 0
              });
            }
          } else {
            debugLogger.warn('FacebookAdsService', `Failed to fetch data for ${monthKey}`, await response.text());
            monthlyData.push({
              month: monthKey,
              leads: 0,
              spend: 0,
              impressions: 0,
              clicks: 0
            });
          }
        } catch (error) {
          debugLogger.warn('FacebookAdsService', `Error fetching data for ${monthKey}`, error);
          monthlyData.push({
            month: monthKey,
            leads: 0,
            spend: 0,
            impressions: 0,
            clicks: 0
          });
        }
      }

      debugLogger.debug('FacebookAdsService', 'Processed monthly data', { monthlyData });
      return monthlyData;

    } catch (error) {
      debugLogger.error('FacebookAdsService', 'Error fetching monthly historical metrics', error);
      return [];
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
        // Facebook API expects dates in YYYY-MM-DD format
        const since = dateRange.start.includes('T') ? dateRange.start.split('T')[0] : dateRange.start;
        const until = dateRange.end.includes('T') ? dateRange.end.split('T')[0] : dateRange.end;
        
        params.append('time_range', JSON.stringify({
          since,
          until
        }));
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
          response: data
        });
      }
      
      // Fetch breakdown data for demographics and platform analysis
      const demographics = await this.getDemographicBreakdown(accountId, dateRange);
      const platformBreakdown = await this.getPlatformBreakdown(accountId, dateRange);
      
      const metrics = this.parseMetrics(data.data?.[0] || {}, conversionAction);
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
          console.error('🔍 FacebookAdsService: Failed to fetch previous period data:', error);
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
        console.error('🔍 Facebook Previous Period API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
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
        ctr: parseFloat(previousMetrics.ctr || '0'), // Facebook already returns CTR as percentage
        cpc: parseFloat(previousMetrics.cpc || '0'), // CPC is already in currency format
        cpm: previousMetrics.cpm,
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

    // Debug CTR calculation
    const rawCtr = insights.ctr || '0';
    const calculatedCtr = parseFloat(rawCtr); // Facebook already returns CTR as percentage
    const manualCtr = insights.clicks && insights.impressions ? 
      (parseInt(insights.clicks) / parseInt(insights.impressions)) * 100 : 0;
    
    debugLogger.debug('FacebookAdsService', 'CTR calculation debug', {
      rawCtr,
      calculatedCtr,
      manualCtr,
      clicks: insights.clicks,
      impressions: insights.impressions,
      ctrField: insights.ctr
    });

    const metrics = {
      impressions: parseInt(insights.impressions || '0'),
      clicks: parseInt(insights.clicks || '0'),
      spend: parseFloat(insights.spend || '0'),
      leads: parseInt(leads.toString()),
      conversions: parseInt(leads.toString()), // Using leads as conversions for now
      ctr: calculatedCtr, // Convert percentage to decimal (Facebook returns CTR as percentage)
      cpc: parseFloat(insights.cost_per_link_click || insights.cpc || '0'), // Use cost_per_link_click if available, fallback to cpc
      cpm: parseFloat(insights.cpm || '0'),
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
      const userResponse = await FacebookAdsService.rateLimitedFetch(`${this.BASE_URL}/me?access_token=${token}`);
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
