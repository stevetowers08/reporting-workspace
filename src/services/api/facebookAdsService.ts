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
  private static readonly API_VERSION = 'v19.0';
  private static readonly BASE_URL = `https://graph.facebook.com/${this.API_VERSION}`;

  // Get access token from unified credential service
  static async getAccessToken(): Promise<string> {
    try {
      // First try unified credential service
      const { UnifiedCredentialService } = await import('@/services/auth/unifiedCredentialService');
      const token = await UnifiedCredentialService.getAccessToken('facebookAds');
      
      if (token) {
        debugLogger.debug('FacebookAdsService', 'Using Facebook token from unified credential service');
        return token;
      }

      // Fallback to localStorage
      const oauthTokens = localStorage.getItem('oauth_tokens_facebook');
      if (oauthTokens) {
        try {
          const tokens = JSON.parse(oauthTokens);
          if (tokens.accessToken) {
            debugLogger.debug('FacebookAdsService', 'Using OAuth Facebook token from localStorage');
            return tokens.accessToken;
          }
        } catch (error) {
          debugLogger.warn('FacebookAdsService', 'Failed to parse OAuth Facebook tokens', error);
        }
      }

      // Fallback to environment variable
      const envToken = import.meta.env.VITE_FACEBOOK_ACCESS_TOKEN;
      if (envToken && envToken !== 'your_facebook_access_token') {
        debugLogger.debug('FacebookAdsService', 'Using environment Facebook token');
        return envToken;
      }

      // Debug: Check what's actually available
      debugLogger.debug('FacebookAdsService', 'Available localStorage keys', Object.keys(localStorage));
      debugLogger.debug('FacebookAdsService', 'OAuth tokens in localStorage', localStorage.getItem('oauth_tokens_facebook'));
      
      throw new Error('No Facebook access token found. Please authenticate through OAuth or set VITE_FACEBOOK_ACCESS_TOKEN environment variable.');
    } catch (error) {
      debugLogger.error('FacebookAdsService', 'Error getting access token', error);
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
    
    throw new Error('This should never be reached');
  }


  static async authenticate(accessToken?: string, adAccountId?: string): Promise<boolean> {
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
      const token = await this.getAccessToken();
      if (!token) {
        throw new Error('Facebook access token not found. Please authenticate first.');
      }

      // Debug token info (without exposing the token)
      debugLogger.debug('FacebookAdsService', 'Facebook token length', token.length);
      debugLogger.debug('FacebookAdsService', 'Facebook token starts with', token.substring(0, 10) + '...');

      const allAccounts: any[] = [];

      // Fetch user accounts and business accounts in parallel for better performance
      const [userAccounts, businessAccounts] = await Promise.allSettled([
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

            // Fetch ad accounts for all Business Managers in parallel
            const businessAccountPromises = businessData.data.map(async (business: any) => {
              try {
                const response = await FacebookAdsService.rateLimitedFetch(
                  `${this.BASE_URL}/${business.id}/owned_ad_accounts?fields=id,name,account_status,currency,timezone_name&access_token=${token}`
                );

                if (response.ok) {
                  const data = await response.json();
                  debugLogger.debug('FacebookAdsService', `Business ${business.name} ad accounts`, data.data?.length || 0);
                  return data.data || [];
                }
                return [];
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
          })
      ]);

      // Combine all accounts
      if (userAccounts.status === 'fulfilled') {
        allAccounts.push(...userAccounts.value);
      }
      if (businessAccounts.status === 'fulfilled') {
        allAccounts.push(...businessAccounts.value);
      }

      // Remove duplicates based on ID
      const uniqueAccounts = allAccounts.filter((account, index, self) =>
        index === self.findIndex(a => a.id === account.id)
      );

      debugLogger.debug('FacebookAdsService', 'Total unique ad accounts', uniqueAccounts.length);
      return uniqueAccounts;
    } catch (error) {
      debugLogger.error('FacebookAdsService', 'Error fetching Facebook ad accounts', error);
      throw error;
    }
  }

  static async getPlatformBreakdown(adAccountId?: string, dateRange?: { start: string; end: string }): Promise<FacebookAdsMetrics['platformBreakdown']> {
    try {
      const accounts = await this.getAdAccounts();
      const accountId = adAccountId || accounts[0]?.id;

      if (!accountId) {
        throw new Error('No ad account found');
      }

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
        params.append('time_range', JSON.stringify({
          since: dateRange.start,
          until: dateRange.end
        }));
      }

      const response = await fetch(
        `${this.BASE_URL}/${accountId}/insights?${params}`
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
        params.append('time_range', JSON.stringify({
          since: dateRange.start,
          until: dateRange.end
        }));
      }

      const response = await fetch(
        `${this.BASE_URL}/${accountId}/insights?${params}`
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
        params.append('time_range', JSON.stringify({
          since: dateRange.start,
          until: dateRange.end
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
      // Use provided account ID or get from integration config
      let accountId = adAccountId;
      
      if (!accountId) {
        // Try to get account ID from integration config instead of making API call
        try {
          const { UnifiedCredentialService } = await import('@/services/auth/unifiedCredentialService');
          const integration = await UnifiedCredentialService.getCredentials('facebookAds');
          if (integration?.config?.adAccounts?.[0]?.id) {
            accountId = integration.config.adAccounts[0].id;
          }
        } catch (error) {
          debugLogger.warn('FacebookAdsService', 'Could not get account from integration config', error);
        }
        
        // Fallback to API call only if needed
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
      
      // Skip demographic and platform data calls for performance
      // const demographics = await this.getDemographicBreakdown(accountId, dateRange);
      // const platformBreakdown = await this.getPlatformBreakdown(accountId, dateRange);
      
      const metrics = this.parseMetrics(data.data?.[0] || {}, conversionAction);
      // Skip demographic and platform data for now to improve performance
      // metrics.demographics = demographics;
      // metrics.platformBreakdown = platformBreakdown;
      
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

  static disconnect(): void {
    // Clear OAuth tokens
    localStorage.removeItem('oauth_tokens_facebook');
    debugLogger.info('FacebookAdsService', 'Facebook Ads disconnected');
  }
}
