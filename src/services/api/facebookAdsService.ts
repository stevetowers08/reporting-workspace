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
  roas: number;
  reach: number;
  frequency: number;
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

  // Get access token from database directly
  static async getAccessToken(): Promise<string> {
    try {
      // Get token directly from integrations table
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

      debugLogger.debug('FacebookAdsService', 'Using Facebook token from database');
      return config.accessToken;
    } catch (error) {
      debugLogger.error('FacebookAdsService', 'Error getting access token from database', error);
      throw error;
    }
  }

  // Rate limiting state
  private static lastRequestTime = 0;
  private static readonly MIN_REQUEST_INTERVAL = 100; // 100ms between requests (10 requests/second max)
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 1000; // 1 second base delay

  // Rate-limited fetch with retry logic
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
      const token = accessToken || await this.getAccessToken();

      // Validate token with Facebook Graph API using rate-limited fetch
      const response = await FacebookAdsService.rateLimitedFetch(`${this.BASE_URL}/me?access_token=${token}`);

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
      const token = await this.getAccessToken();
      if (!token) {
        return { hasBusinessManagement: false, scopes: [] };
      }

      // Try to access business management endpoint to check if permission is available
      const businessResponse = await FacebookAdsService.rateLimitedFetch(`${this.BASE_URL}/me/businesses?fields=id&access_token=${token}`);
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
          console.log('🔍 FacebookAdsService: Returning cached accounts:', integration.settings.adAccounts.length);
          return integration.settings.adAccounts;
        }
      } catch (error) {
        debugLogger.warn('FacebookAdsService', 'Could not get cached accounts from Supabase', error);
      }

      // Fallback to API call if no cached data
      debugLogger.debug('FacebookAdsService', 'No cached accounts found, fetching from Facebook API');
      
      const token = await this.getAccessToken();
      if (!token) {
        throw new Error('Facebook access token not found. Please authenticate first.');
      }

      // Debug token info (without exposing the token)
      debugLogger.debug('FacebookAdsService', 'Facebook token length', token.length);
      debugLogger.debug('FacebookAdsService', 'Facebook token starts with', token.substring(0, 10) + '...');

      const allAccounts: any[] = [];

      // Fetch user accounts, business accounts, and system user accounts in parallel for comprehensive coverage
      const [userAccounts, businessAccounts, systemUserAccounts] = await Promise.allSettled([
        // Get accounts directly associated with the user
        FacebookAdsService.rateLimitedFetch(`${this.BASE_URL}/me/adaccounts?fields=id,name,account_status,currency,timezone_name&access_token=${token}`)
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
                  `${this.BASE_URL}/${business.id}/owned_ad_accounts?fields=id,name,account_status,currency,timezone_name&access_token=${token}`
                );
                allBusinessAccounts.push(...ownedAccounts);
                debugLogger.debug('FacebookAdsService', `Business ${business.name} owned ad accounts`, ownedAccounts.length);
                
                // Fetch client ad accounts (accounts managed by this business) with pagination support
                const clientAccounts = await FacebookAdsService.fetchPaginatedAccounts(
                  `${this.BASE_URL}/${business.id}/client_ad_accounts?fields=id,name,account_status,currency,timezone_name&access_token=${token}`
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
        FacebookAdsService.fetchSystemUserAccounts(token)
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

      debugLogger.debug('FacebookAdsService', 'Total unique ad accounts from API', uniqueAccounts.length);
      debugLogger.info('FacebookAdsService', 'Comprehensive ad account fetch completed', {
        userAccounts: userAccounts.status === 'fulfilled' ? userAccounts.value.length : 0,
        businessAccounts: businessAccounts.status === 'fulfilled' ? businessAccounts.value.length : 0,
        systemUserAccounts: systemUserAccounts.status === 'fulfilled' ? systemUserAccounts.value.length : 0,
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
  private static async fetchPaginatedAccounts(url: string): Promise<any[]> {
    const allAccounts: any[] = [];
    let nextUrl: string | null = url;

    while (nextUrl) {
      try {
        const response = await FacebookAdsService.rateLimitedFetch(nextUrl);
        
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
  private static async fetchSystemUserAccounts(token: string): Promise<any[]> {
    try {
      debugLogger.debug('FacebookAdsService', 'Fetching ad accounts via system users');
      
      // Get all businesses first
      const businessesResponse = await FacebookAdsService.rateLimitedFetch(
        `${this.BASE_URL}/me/businesses?fields=id,name&access_token=${token}`
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
                `${this.BASE_URL}/${systemUser.id}/adaccounts?fields=id,name,account_status,currency,timezone_name&access_token=${token}`
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
      
      const token = await this.getAccessToken();
      if (!token) {
        throw new Error('Facebook access token not found. Please authenticate first.');
      }

      const allAccounts: any[] = [];

      // Fetch user accounts, business accounts, and system user accounts in parallel for comprehensive coverage
      const [userAccounts, businessAccounts, systemUserAccounts] = await Promise.allSettled([
        // Get accounts directly associated with the user
        FacebookAdsService.rateLimitedFetch(`${this.BASE_URL}/me/adaccounts?fields=id,name,account_status,currency,timezone_name&access_token=${token}`)
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
                  `${this.BASE_URL}/${business.id}/owned_ad_accounts?fields=id,name,account_status,currency,timezone_name&access_token=${token}`
                );
                allBusinessAccounts.push(...ownedAccounts);
                debugLogger.debug('FacebookAdsService', `Business ${business.name} owned ad accounts`, ownedAccounts.length);
                
                // Fetch client ad accounts (accounts managed by this business) with pagination support
                const clientAccounts = await FacebookAdsService.fetchPaginatedAccounts(
                  `${this.BASE_URL}/${business.id}/client_ad_accounts?fields=id,name,account_status,currency,timezone_name&access_token=${token}`
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
        FacebookAdsService.fetchSystemUserAccounts(token)
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
        businesses: businesses.map(b => ({ id: b.id, name: b.name }))
      });

      // Find Tulen Agency business manager
      const tulenAgency = businesses.find(b => 
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
          `${this.BASE_URL}/${tulenAgency.id}/owned_ad_accounts?fields=id,name,account_status,currency,timezone_name&access_token=${token}`
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
          `${this.BASE_URL}/${tulenAgency.id}/client_ad_accounts?fields=id,name,account_status,currency,timezone_name&access_token=${token}`
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
          `${this.BASE_URL}/me/adaccounts?fields=id,name,account_status,currency,timezone_name&access_token=${token}`
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
                `${this.BASE_URL}/${business.id}/owned_ad_accounts?fields=id,name,account_status,currency,timezone_name&access_token=${token}`
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
                `${this.BASE_URL}/${business.id}/client_ad_accounts?fields=id,name,account_status,currency,timezone_name&access_token=${token}`
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
        const sysUserAccounts = await FacebookAdsService.fetchSystemUserAccounts(token);
        
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
          `${this.BASE_URL}/me/adaccounts?fields=id,name,account_status,currency,timezone_name&access_token=${token}`
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
            businesses: businesses.map(b => ({ id: b.id, name: b.name }))
          });

          for (const business of businesses) {
            try {
              // Get owned accounts
              const ownedAccounts = await FacebookAdsService.fetchPaginatedAccounts(
                `${this.BASE_URL}/${business.id}/owned_ad_accounts?fields=id,name,account_status,currency,timezone_name&access_token=${token}`
              );
              businessAccounts.push(...ownedAccounts);
              
              // Get client accounts
              const clientAccounts = await FacebookAdsService.fetchPaginatedAccounts(
                `${this.BASE_URL}/${business.id}/client_ad_accounts?fields=id,name,account_status,currency,timezone_name&access_token=${token}`
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
        const sysUserAccounts = await FacebookAdsService.fetchSystemUserAccounts(token);
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
        debugLogger.error('FacebookAdsService', 'Facebook platform API error details', errorData);
        throw new Error(`Facebook API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      debugLogger.debug('FacebookAdsService', 'Facebook platform API response', data);
      
      // Process platform data
      const platformBreakdown = this.processPlatformData(data.data || []);
      
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

      const response = await fetch(
        `${this.BASE_URL}/${formattedAccountId}/customconversions?fields=id,name,category,type,status&access_token=${token}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Facebook API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      debugLogger.debug('FacebookAdsService', 'Facebook conversion actions response', data);
      
      // Return fallback conversion actions if no custom conversions exist
      if (!data.data || data.data.length === 0) {
        return [
          { id: 'lead', name: 'Lead', category: 'LEAD', type: 'WEBSITE', status: 'ACTIVE' },
          { id: 'purchase', name: 'Purchase', category: 'PURCHASE', type: 'WEBSITE', status: 'ACTIVE' },
          { id: 'add_to_cart', name: 'Add to Cart', category: 'PURCHASE', type: 'WEBSITE', status: 'ACTIVE' },
          { id: 'view_content', name: 'View Content', category: 'ENGAGEMENT', type: 'WEBSITE', status: 'ACTIVE' },
          { id: 'signup', name: 'Sign Up', category: 'LEAD', type: 'WEBSITE', status: 'ACTIVE' }
        ];
      }
      
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

  static async getAccountMetrics(adAccountId?: string, dateRange?: { start: string; end: string }, conversionAction?: string): Promise<FacebookAdsMetrics> {
    try {
      // Create cache key for this request
      const cacheKey = `account-metrics-${adAccountId}-${dateRange?.start}-${dateRange?.end}-${conversionAction}`;
      
      // Check cache first
      const cachedData = this.getCachedData(cacheKey);
      if (cachedData) {
        debugLogger.debug('FacebookAdsService', 'Using cached account metrics', { cacheKey });
        return cachedData;
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

      const fields = 'impressions,clicks,spend,actions,ctr,cpc,cpm,reach,frequency';
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
        paging: data.paging
      });
      
      // Fetch demographic and platform breakdown data
      const demographics = await this.getDemographicBreakdown(accountId, dateRange);
      const platformBreakdown = await this.getPlatformBreakdown(accountId, dateRange);
      
      const metrics = this.parseMetrics(data.data?.[0] || {}, conversionAction);
      // Include demographic and platform data
      metrics.demographics = demographics;
      metrics.platformBreakdown = platformBreakdown;
      
      // Cache the result
      this.setCachedData(cacheKey, metrics);
      
      return metrics;
    } catch (error) {
      debugLogger.error('FacebookAdsService', 'Error fetching Facebook account metrics', error);
      throw error;
    }
  }

  private static parseMetrics(insights: any, conversionAction?: string): FacebookAdsMetrics {
    let leads = 0;

    if (conversionAction && insights.actions) {
      // Use specific conversion action
      const action = insights.actions.find((action: any) => action.action_type === conversionAction);
      leads = action?.value || 0;
    } else {
      // Fallback to lead or purchase
      leads = insights.actions?.find((action: any) =>
        action.action_type === 'purchase' || action.action_type === 'lead'
      )?.value || 0;
    }

    return {
      impressions: parseInt(insights.impressions || '0'),
      clicks: parseInt(insights.clicks || '0'),
      spend: parseFloat(insights.spend || '0'),
      leads: parseInt(leads.toString()),
      conversions: parseInt(leads.toString()), // Using leads as conversions for now
      ctr: parseFloat(insights.ctr || '0'),
      cpc: parseFloat(insights.cpc || '0'),
      cpm: parseFloat(insights.cpm || '0'),
      roas: parseFloat(insights.roas || '0'),
      reach: parseInt(insights.reach || '0'),
      frequency: parseFloat(insights.frequency || '0')
    };
  }

  static async testConnection(): Promise<{ success: boolean; error?: string; accountInfo?: any }> {
    debugService.call('FacebookAdsService', 'testConnection');
    try {
      // Check if we have a token
      let token: string;
      try {
        token = await this.getAccessToken();
      } catch (error) {
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
