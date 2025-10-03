import { debugService } from '@/lib/debug';

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

  // Get access token - use the Marketing API token directly
  private static getAccessToken(): string {
    // Use the Marketing API access token directly
    return 'EAAph81SWZC4YBPg05wHDwacBOutmohwqY3CykQJlIDNuJKF9rb00FOKcLKCcPG423hOJ4pHu5racSuZBnLBwsrld2QPW2ReW5rjpKoGYfMT1eVWrsdCnNLDxb4ZBU8n3dFxd94rxJk3eVYRWEr8YwfZBscgi2z9J0dZBwSSq01WPPu3nMmI6PiZAKAy1SzWwH9ZAZAkZD';
  }

  static async authenticate(accessToken?: string, adAccountId?: string): Promise<boolean> {
    try {
      const token = accessToken || this.getAccessToken();

      // Validate token with Facebook Graph API
      const response = await fetch(`${this.BASE_URL}/me?access_token=${token}`);

      if (response.ok) {
        const userData = await response.json();
        console.log('Facebook authentication successful:', userData);
        return true;
      } else {
        const errorData = await response.json();
        console.error('Facebook authentication failed:', errorData);
        return false;
      }
    } catch (error) {
      console.error('Facebook Ads authentication error:', error);
      return false;
    }
  }

  static async getAdAccounts(): Promise<any[]> {
    try {
      const token = this.getAccessToken();
      const allAccounts: any[] = [];

      // Fetch user accounts and business accounts in parallel for better performance
      const [userAccounts, businessAccounts] = await Promise.allSettled([
        // Get accounts directly associated with the user
        fetch(`${this.BASE_URL}/me/adaccounts?fields=id,name,account_status,currency,timezone_name&access_token=${token}`)
          .then(response => response.ok ? response.json() : { data: [] })
          .then(data => {
            console.log('User ad accounts:', data.data?.length || 0);
            return data.data || [];
          })
          .catch(error => {
            console.error('Error fetching user ad accounts:', error);
            return [];
          }),

        // Get accounts from Business Managers
        fetch(`${this.BASE_URL}/me/businesses?fields=id,name&access_token=${token}`)
          .then(response => response.ok ? response.json() : { data: [] })
          .then(async businessData => {
            console.log('Business Managers found:', businessData.data?.length || 0);

            if (!businessData.data?.length) return [];

            // Fetch ad accounts for all Business Managers in parallel
            const businessAccountPromises = businessData.data.map(async (business: any) => {
              try {
                const response = await fetch(
                  `${this.BASE_URL}/${business.id}/owned_ad_accounts?fields=id,name,account_status,currency,timezone_name&access_token=${token}`
                );

                if (response.ok) {
                  const data = await response.json();
                  console.log(`Business ${business.name} ad accounts:`, data.data?.length || 0);
                  return data.data || [];
                }
                return [];
              } catch (error) {
                console.error(`Error fetching accounts for business ${business.name}:`, error);
                return [];
              }
            });

            const businessAccountResults = await Promise.allSettled(businessAccountPromises);
            return businessAccountResults
              .filter(result => result.status === 'fulfilled')
              .flatMap(result => (result as PromiseFulfilledResult<any[]>).value);
          })
          .catch(error => {
            console.error('Error fetching Business Managers:', error);
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

      console.log('Total unique ad accounts:', uniqueAccounts.length);
      return uniqueAccounts;
    } catch (error) {
      console.error('Error fetching Facebook ad accounts:', error);
      throw error;
    }
  }

  static async getConversionActions(adAccountId: string): Promise<any[]> {
    try {
      const token = this.getAccessToken();
      const formattedAccountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;

      const response = await fetch(
        `${this.BASE_URL}/${formattedAccountId}/conversion_actions?fields=id,name,category,type,status&access_token=${token}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Facebook API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      console.log('Facebook conversion actions response:', data);
      return data.data || [];
    } catch (error) {
      console.error('Error fetching Facebook conversion actions:', error);
      // Return common conversion actions as fallback
      return [
        { id: 'lead', name: 'Lead', category: 'LEAD', type: 'LEAD', status: 'ACTIVE' },
        { id: 'purchase', name: 'Purchase', category: 'CONVERSION', type: 'PURCHASE', status: 'ACTIVE' },
        { id: 'add_to_cart', name: 'Add to Cart', category: 'CONVERSION', type: 'ADD_TO_CART', status: 'ACTIVE' },
        { id: 'complete_registration', name: 'Complete Registration', category: 'CONVERSION', type: 'COMPLETE_REGISTRATION', status: 'ACTIVE' },
        { id: 'contact', name: 'Contact', category: 'LEAD', type: 'CONTACT', status: 'ACTIVE' },
        { id: 'customize_product', name: 'Customize Product', category: 'CONVERSION', type: 'CUSTOMIZE_PRODUCT', status: 'ACTIVE' },
        { id: 'donate', name: 'Donate', category: 'CONVERSION', type: 'DONATE', status: 'ACTIVE' },
        { id: 'find_location', name: 'Find Location', category: 'LEAD', type: 'FIND_LOCATION', status: 'ACTIVE' },
        { id: 'initiate_checkout', name: 'Initiate Checkout', category: 'CONVERSION', type: 'INITIATE_CHECKOUT', status: 'ACTIVE' },
        { id: 'other', name: 'Other', category: 'CONVERSION', type: 'OTHER', status: 'ACTIVE' },
        { id: 'schedule', name: 'Schedule', category: 'LEAD', type: 'SCHEDULE', status: 'ACTIVE' },
        { id: 'search', name: 'Search', category: 'CONVERSION', type: 'SEARCH', status: 'ACTIVE' },
        { id: 'start_trial', name: 'Start Trial', category: 'CONVERSION', type: 'START_TRIAL', status: 'ACTIVE' },
        { id: 'submit_application', name: 'Submit Application', category: 'LEAD', type: 'SUBMIT_APPLICATION', status: 'ACTIVE' },
        { id: 'subscribe', name: 'Subscribe', category: 'CONVERSION', type: 'SUBSCRIBE', status: 'ACTIVE' },
        { id: 'view_content', name: 'View Content', category: 'CONVERSION', type: 'VIEW_CONTENT', status: 'ACTIVE' }
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
        access_token: this.getAccessToken(),
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
      console.error('Error fetching Facebook campaigns:', error);
      throw error;
    }
  }

  static async getAccountMetrics(adAccountId?: string, dateRange?: { start: string; end: string }, conversionAction?: string): Promise<FacebookAdsMetrics> {
    try {
      // Get ad accounts if no specific account ID provided
      const accounts = await this.getAdAccounts();
      const accountId = adAccountId || accounts[0]?.id;

      if (!accountId) {
        throw new Error('No ad account found');
      }

      // Ensure account ID has 'act_' prefix
      const formattedAccountId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;

      const fields = 'impressions,clicks,spend,actions,ctr,cpc,cpm,reach,frequency';
      const params = new URLSearchParams({
        access_token: this.getAccessToken(),
        fields,
        level: 'account'
      });

      if (dateRange) {
        params.append('time_range', JSON.stringify({
          since: dateRange.start,
          until: dateRange.end
        }));
      }

      const url = `${this.BASE_URL}/${formattedAccountId}/insights?${params}`;
      console.log('Facebook API URL:', url);

      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Facebook API error:', errorData);
        throw new Error(`Facebook API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      console.log('Facebook insights response:', data);
      return this.parseMetrics(data.data?.[0] || {}, conversionAction);
    } catch (error) {
      console.error('Error fetching Facebook account metrics:', error);
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
      leads: parseInt(leads),
      ctr: parseFloat(insights.ctr || '0'),
      cpc: parseFloat(insights.cpc || '0'),
      cpm: parseFloat(insights.cpm || '0'),
      reach: parseInt(insights.reach || '0'),
      frequency: parseFloat(insights.frequency || '0')
    };
  }

  static async testConnection(): Promise<{ success: boolean; error?: string; accountInfo?: any }> {
    debugService.call('FacebookAdsService', 'testConnection');
    try {
      // Test authentication
      const isValid = await this.authenticate();
      if (!isValid) {
        debugService.error('FacebookAdsService', 'testConnection', 'Invalid access token');
        return { success: false, error: 'Invalid access token' };
      }

      // Get user info
      const userResponse = await fetch(`${this.BASE_URL}/me?access_token=${this.getAccessToken()}`);
      if (!userResponse.ok) {
        const errorData = await userResponse.json();
        console.error('Facebook user info error:', errorData);
        debugService.error('FacebookAdsService', 'testConnection', errorData);
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
      console.error('Facebook connection test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static disconnect(): void {
    // Clear OAuth tokens
    localStorage.removeItem('oauth_tokens_facebook');
    console.log('Facebook Ads disconnected');
  }
}
