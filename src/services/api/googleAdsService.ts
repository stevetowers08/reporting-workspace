import { debugLogger } from '@/lib/debug';
import { GoogleAdsErrorHandler } from '@/lib/googleAdsErrorHandler';
import { SecureLogger } from '@/lib/secureLogger';
import { supabase } from '@/lib/supabase';
import { TokenManager } from '@/services/auth/TokenManager';

export interface GoogleAdsAccount {
  id: string;
  name: string;
  status: string;
  currency: string;
  timezone: string;
}

export class GoogleAdsService {
  private static readonly API_VERSION = 'v21';
  private static readonly BASE_URL = `https://googleads.googleapis.com/${this.API_VERSION}`;
  
  // Enhanced rate limiter with dynamic quota adaptation
  private static tokens = 10; // Start with higher limit - Google allows much more than 5 req/s
  private static lastRefill = Date.now();
  private static readonly MAX_TOKENS = 50; // Increased from 5 to 50 based on Google's actual limits
  private static readonly REFILL_RATE = 1000; // 1 second
  private static readonly MIN_TOKENS = 5; // Minimum tokens to maintain
  private static readonly QUOTA_CHECK_INTERVAL = 30000; // Check quota every 30 seconds
  private static lastQuotaCheck = 0;

  // Exponential backoff configuration
  private static readonly MAX_RETRIES = 3;
  private static readonly BASE_DELAY = 1000; // 1 second
  private static readonly MAX_DELAY = 30000; // 30 seconds

  /**
   * Normalize customer ID by removing all non-digit characters
   */
  private static normalizeCid(id: string | number): string {
    return String(id).replace(/\D/g, '');
  }

  /**
   * Parse Google Ads searchStream response - CORRECTED for NDJSON format
   */
  private static parseSearchStreamText(text: string): unknown[] {
    const trimmed = text?.trim();
    if (!trimmed) {
      return [];
    }

    // Google Ads API searchStream returns NDJSON format (newline-delimited JSON)
    // Each line is a separate JSON object
    return trimmed.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => {
        try {
          return JSON.parse(line);
        } catch (error) {
          debugLogger.warn('GoogleAdsService', 'Failed to parse NDJSON line', { line: line.substring(0, 100), error });
          return null;
        }
      })
      .filter(item => item !== null);
  }

  /**
   * Enhanced token bucket rate limiter with dynamic quota adaptation
   */
  private static async waitForToken(): Promise<void> {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    
    // Refill tokens based on time passed
    if (timePassed >= this.REFILL_RATE) {
      this.tokens = Math.min(this.MAX_TOKENS, this.tokens + Math.floor(timePassed / this.REFILL_RATE));
      this.lastRefill = now;
    }
    
    // Check quota headers periodically to adapt rate limiting
    if (now - this.lastQuotaCheck > this.QUOTA_CHECK_INTERVAL) {
      await this.adaptRateLimit();
      this.lastQuotaCheck = now;
    }
    
    // Wait if no tokens available
    if (this.tokens <= 0) {
      const waitTime = this.REFILL_RATE - (now - this.lastRefill);
      if (waitTime > 0) {
        SecureLogger.logRateLimit('GoogleAdsService', 'Waiting for token refill', waitTime);
        await new Promise(resolve => globalThis.setTimeout(resolve, waitTime));
        return this.waitForToken();
      }
    }
    
    this.tokens--;
  }

  /**
   * Adapt rate limiting based on quota headers
   */
  private static async adaptRateLimit(): Promise<void> {
    try {
      // This would be called after API responses to check quota headers
      // For now, we'll implement a basic adaptation strategy
      const currentTokens = this.tokens;
      
      if (currentTokens < this.MIN_TOKENS) {
        // Increase token limit if we're hitting limits frequently
        this.MAX_TOKENS = Math.min(100, this.MAX_TOKENS + 10);
        SecureLogger.info('GoogleAdsService', 'Increased rate limit', { 
          newMaxTokens: this.MAX_TOKENS,
          currentTokens 
        });
      } else if (currentTokens > this.MAX_TOKENS * 0.8) {
        // Decrease token limit if we're not using capacity
        this.MAX_TOKENS = Math.max(this.MIN_TOKENS, this.MAX_TOKENS - 5);
        SecureLogger.info('GoogleAdsService', 'Decreased rate limit', { 
          newMaxTokens: this.MAX_TOKENS,
          currentTokens 
        });
      }
    } catch (error) {
      SecureLogger.error('GoogleAdsService', 'Failed to adapt rate limit', error);
    }
  }

  /**
   * Calculate exponential backoff delay
   */
  private static calculateBackoffDelay(attempt: number): number {
    const delay = this.BASE_DELAY * Math.pow(2, attempt - 1);
    return Math.min(delay, this.MAX_DELAY);
  }

  /**
   * Make Google Ads API request with proper rate limiting, exponential backoff, and required headers
   */
  private static async makeApiRequest({
    accessToken,
    developerToken,
    customerId,
    managerId,
    gaql
  }: {
    accessToken: string;
    developerToken: string;
    customerId: string | number;
    managerId?: string | number;
    gaql: string;
  }, retryCount = 0): Promise<unknown[]> {
    // Use token bucket rate limiter
    await this.waitForToken();
    
    const pathCid = this.normalizeCid(customerId);
    const loginCid = managerId ? this.normalizeCid(managerId) : undefined;

    // REQUIRED: All Google Ads API calls must include these headers
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,
      'developer-token': developerToken, // REQUIRED: Google Ads developer token
      'Content-Type': 'application/json'
    };
    
    // REQUIRED: login-customer-id header when calling on behalf of a client
    if (loginCid) {
      headers['login-customer-id'] = loginCid;
    }

    const url = `${this.BASE_URL}/customers/${pathCid}/googleAds:searchStream`;
    
    try {
      SecureLogger.logGoogleAdsApiCall('GoogleAdsService', 'searchStream', pathCid, {
        url,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': developerToken,
          'login-customer-id': loginCid,
          'Content-Type': 'application/json'
        },
        customerId: pathCid,
        managerId: loginCid,
        retryCount
      });

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: gaql })
      });

      const text = await response.text();
      
      if (!response.ok) {
        // Handle rate limiting with exponential backoff
        if (response.status === 429) {
          if (retryCount < this.MAX_RETRIES) {
            const retryAfter = response.headers.get('Retry-After');
            const waitTime = retryAfter 
              ? parseInt(retryAfter) * 1000 
              : this.calculateBackoffDelay(retryCount + 1);
            
            SecureLogger.logRateLimit('GoogleAdsService', 'Rate limited - retrying', {
              retryCount: retryCount + 1,
              waitTime,
              maxRetries: this.MAX_RETRIES
            });
            
            await new Promise(resolve => globalThis.setTimeout(resolve, waitTime));
            return this.makeApiRequest({ accessToken, developerToken, customerId, managerId, gaql }, retryCount + 1);
          } else {
            SecureLogger.error('GoogleAdsService', 'Rate limit exceeded max retries', { retryCount });
            throw new Error('Google Ads API rate limit exceeded. Please try again later.');
          }
        }
        
        // Handle quota exhaustion
        if (response.status === 403) {
          const errorText = await response.text();
          if (errorText.includes('RESOURCE_EXHAUSTED')) {
            SecureLogger.error('GoogleAdsService', 'Daily quota exhausted', { status: response.status, text: errorText });
            throw new Error('Google Ads API daily quota exhausted. Please try again tomorrow.');
          }
          if (errorText.includes('AUTHENTICATION_ERROR')) {
            SecureLogger.logSecurityEvent('GoogleAdsService', 'Authentication error - missing required headers', { 
              status: response.status, 
              text: errorText 
            });
            throw new Error('Google Ads API authentication failed. Please check your developer token and login-customer-id.');
          }
        }
        
        const errorInfo = GoogleAdsErrorHandler.handleApiError({
          status: response.status,
          message: text
        }, 'makeApiRequest');
        
        SecureLogger.error('GoogleAdsService', 'API request failed', {
          errorCode: errorInfo.errorCode,
          technicalMessage: errorInfo.technicalMessage,
          canRetry: errorInfo.canRetry,
          requiresReauth: errorInfo.requiresReauth
        });
        
        throw new Error(errorInfo.userMessage);
      }
      
      // Check quota headers for rate limit adaptation
      const quotaHeaders = this.extractQuotaHeaders(response);
      if (quotaHeaders) {
        await this.adaptRateLimitFromHeaders(quotaHeaders);
      }
      
      return this.parseSearchStreamText(text);
    } catch (error) {
      SecureLogger.error('GoogleAdsService', 'API request failed', { 
        error: error instanceof Error ? error.message : String(error),
        retryCount 
      });
      throw error;
    }
  }

  /**
   * Extract quota information from response headers
   */
  private static extractQuotaHeaders(response: Response): any {
    try {
      const quotaInfoHeader = response.headers.get('x-googleads-response-headers-json');
      if (quotaInfoHeader) {
        return JSON.parse(quotaInfoHeader);
      }
    } catch (error) {
      SecureLogger.warn('GoogleAdsService', 'Failed to parse quota headers', error);
    }
    return null;
  }

  /**
   * Adapt rate limiting based on quota headers from Google
   */
  private static async adaptRateLimitFromHeaders(quotaHeaders: any): Promise<void> {
    try {
      // Google provides quota information in response headers
      // This allows us to dynamically adjust our rate limiting
      if (quotaHeaders.quotaInfo) {
        const quotaInfo = quotaHeaders.quotaInfo;
        SecureLogger.info('GoogleAdsService', 'Quota information received', {
          quotaInfo: quotaInfo
        });
        
        // Adjust rate limiting based on quota usage
        if (quotaInfo.quotaUsed && quotaInfo.quotaLimit) {
          const usageRatio = quotaInfo.quotaUsed / quotaInfo.quotaLimit;
          if (usageRatio > 0.8) {
            // Reduce rate limit if approaching quota
            this.MAX_TOKENS = Math.max(this.MIN_TOKENS, Math.floor(this.MAX_TOKENS * 0.8));
            SecureLogger.warn('GoogleAdsService', 'Reduced rate limit due to high quota usage', {
              usageRatio,
              newMaxTokens: this.MAX_TOKENS
            });
          }
        }
      }
    } catch (error) {
      SecureLogger.error('GoogleAdsService', 'Failed to adapt rate limit from headers', error);
    }
  }

  /**
   * Discover and store manager account ID
   */
  private static async discoverManagerAccount(accessToken: string, developerToken: string): Promise<string | null> {
    try {
      // Get accessible customers
      const response = await fetch(`${this.BASE_URL}/customers:listAccessibleCustomers`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'developer-token': developerToken,
        },
      });

      if (!response.ok) {
        throw new Error(`listAccessibleCustomers failed: ${response.status}`);
      }

      const data = await response.json();
      const customerIds = (data.resourceNames || []).map((name: string) => name.replace('customers/', ''));

      // Find manager account
      for (const id of customerIds) {
        const cid = this.normalizeCid(id);
        const gaql = `SELECT customer.id, customer.manager FROM customer LIMIT 1`;
        
        try {
          const blocks = await this.makeApiRequest({
            accessToken,
            developerToken,
            customerId: cid,
            managerId: cid,
            gaql
          });

          const results = blocks.flatMap(b => (b as { results?: unknown[] }).results || []);
          if (results.length > 0 && (results[0] as { customer?: { manager?: boolean } }).customer?.manager) {
            // Store manager account
            await supabase
              .from('integrations')
              .upsert({
                platform: 'googleAds',
                connected: true,
                account_id: cid,
              }, { onConflict: 'platform' });
            
            return cid;
          }
        } catch {
          continue;
        }
      }

      return customerIds[0] || null;
    } catch (error) {
      debugLogger.error('GoogleAdsService', 'Error discovering manager account', error);
      return null;
    }
  }
  /**
   * Get Google Ads accounts - simplified
   */
  static async getAdAccounts(): Promise<GoogleAdsAccount[]> {
    try {
      const accessToken = await this.ensureValidToken();
      const developerToken = await this.getDeveloperToken();

      if (!accessToken || !developerToken) {
        return [];
      }

      let managerAccountId = await this.getManagerAccountId();
      if (!managerAccountId) {
        managerAccountId = await this.discoverManagerAccount(accessToken, developerToken);
        if (!managerAccountId) {
          return [];
        }
      }

      const gaql = `SELECT customer_client.id, customer_client.descriptive_name, customer_client.status, customer_client.manager FROM customer_client`;
      const blocks = await this.makeApiRequest({
        accessToken,
        developerToken,
        customerId: managerAccountId,
        managerId: managerAccountId,
        gaql
      });

      const accounts: GoogleAdsAccount[] = [];
      const seenIds = new Set<string>();

      for (const block of blocks) {
        const results = (block as { results?: unknown[] }).results || [];
        for (const result of results) {
          const cc = (result as { customerClient?: { id?: string; descriptiveName?: string; manager?: boolean; status?: string } }).customerClient;
          if (!cc?.id || cc.manager) {
            continue;
          }
          
          const id = this.normalizeCid(cc.id);
          if (seenIds.has(id)) {
            continue;
          }
          
          seenIds.add(id);
          accounts.push({
            id,
            name: cc.descriptiveName || `Ad Account ${id}`,
            status: (cc.status || 'ENABLED').toLowerCase(),
            currency: 'USD',
            timezone: 'UTC'
          });
        }
      }

      return accounts;
    } catch (error) {
      debugLogger.error('GoogleAdsService', 'Error getting accounts', error);
      return [];
    }
  }

  /**
   * Ensure we have a valid access token
   */
  private static async ensureValidToken(): Promise<string | null> {
    try {
      const accessToken = await TokenManager.getAccessToken('googleAds');
      if (!accessToken) {
        debugLogger.warn('GoogleAdsService', 'No access token available');
        return null;
      }

      debugLogger.debug('GoogleAdsService', 'Valid access token obtained');
      return accessToken;

    } catch (error) {
      debugLogger.error('GoogleAdsService', 'Failed to ensure valid token', error);
      return null;
    }
  }

  /**
   * Get developer token from secure backend endpoint
   */
  private static async getDeveloperToken(): Promise<string | null> {
    try {
      // Get developer token from backend to avoid exposing it in frontend
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-ads-config`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        debugLogger.warn('GoogleAdsService', 'Failed to get developer token from backend', { 
          status: response.status,
          statusText: response.statusText 
        });
        return null;
      }

      const config = await response.json();
      if (!config.success || !config.developerToken) {
        debugLogger.warn('GoogleAdsService', 'No developer token in backend config');
        return null;
      }

      debugLogger.debug('GoogleAdsService', 'Developer token retrieved from backend', { 
        hasToken: !!config.developerToken, 
        tokenLength: config.developerToken.length 
      });
      return config.developerToken;
    } catch (error) {
      debugLogger.error('GoogleAdsService', 'Failed to get developer token from backend', error);
      return null;
    }
  }

  /**
   * Get manager account ID from database
   */
  private static async getManagerAccountId(): Promise<string | null> {
    try {
      const { data: integration } = await supabase
        .from('integrations')
        .select('account_id')
        .eq('platform', 'googleAds')
        .eq('connected', true)
        .single();

      if (!integration?.account_id) {
        return null;
      }

      const normalizedId = this.normalizeCid(String(integration.account_id));
      return normalizedId.length >= 10 ? normalizedId : null;
    } catch (error) {
      debugLogger.error('GoogleAdsService', 'Failed to get manager account ID', error);
      return null;
    }
  }

  /**
   * Get account metrics - simplified
   */
  static async getAccountMetrics(customerId: string, dateRange: { start: string; end: string }): Promise<{
    impressions: number;
    clicks: number;
    cost: number;
    leads: number;
    ctr: number;
    averageCpc: number;
    conversions: number;
  }> {
    try {
      const accessToken = await this.ensureValidToken();
      const developerToken = await this.getDeveloperToken();
      const managerAccountId = await this.getManagerAccountId();

      if (!accessToken || !developerToken || !managerAccountId) {
        return this.getEmptyMetrics();
      }

      const gaql = `SELECT metrics.conversions, metrics.cost_micros, metrics.impressions, metrics.clicks FROM customer WHERE segments.date BETWEEN '${dateRange.start}' AND '${dateRange.end}'`;
      const blocks = await this.makeApiRequest({
        accessToken,
        developerToken,
        customerId: customerId,
        managerId: managerAccountId,
        gaql
      });

      let impressions = 0, clicks = 0, costMicros = 0, conversions = 0;
      for (const block of blocks) {
        const results = (block as { results?: unknown[] }).results || [];
        for (const result of results) {
          const m = (result as { metrics?: { impressions?: string | number; clicks?: string | number; costMicros?: string | number; conversions?: string | number } }).metrics || {};
          impressions += Number(m.impressions || 0);
          clicks += Number(m.clicks || 0);
          costMicros += Number(m.costMicros || 0);
          conversions += Number(m.conversions || 0);
        }
      }

      const cost = costMicros / 1e6;
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      const averageCpc = clicks > 0 ? (costMicros / clicks) / 1e6 : 0;

      return { impressions, clicks, cost, leads: conversions, ctr, averageCpc, conversions };
    } catch (error) {
      debugLogger.error('GoogleAdsService', 'Error getting metrics', error);
      return this.getEmptyMetrics();
    }
  }

  /**
   * Get conversion actions - simplified
   */
  static async getConversionActions(customerId: string): Promise<Array<{
    id: string;
    name: string;
    status: string;
    type: string;
  }>> {
    try {
      const accessToken = await this.ensureValidToken();
      const developerToken = await this.getDeveloperToken();
      const managerAccountId = await this.getManagerAccountId();

      if (!accessToken || !developerToken || !managerAccountId) {
        return [];
      }

      const gaql = `SELECT conversion_action.id, conversion_action.name, conversion_action.status, conversion_action.type FROM conversion_action WHERE conversion_action.status = ENABLED`;
      const blocks = await this.makeApiRequest({
        accessToken,
        developerToken,
        customerId: customerId,
        managerId: managerAccountId,
        gaql
      });

      const actions: Array<{ id: string; name: string; status: string; type: string }> = [];
      for (const block of blocks) {
        const results = (block as { results?: unknown[] }).results || [];
        for (const result of results) {
          const ca = (result as { conversionAction?: { id?: string | number; name?: string; status?: string; type?: string } }).conversionAction;
          if (ca?.id) {
            actions.push({
              id: String(ca.id),
              name: ca.name || '',
              status: ca.status || '',
              type: ca.type || ''
            });
          }
        }
      }

      return actions;
    } catch (error) {
      debugLogger.error('GoogleAdsService', 'Error getting conversion actions', error);
      return [];
    }
  }

  /**
   * Test connection - simplified
   */
  static async testConnection(): Promise<{ success: boolean; error?: string; accountInfo?: {
    managerAccountId: string;
    hasAccessToken: boolean;
    hasDeveloperToken: boolean;
  } }> {
    try {
      const accessToken = await this.ensureValidToken();
      const developerToken = await this.getDeveloperToken();
      const managerAccountId = await this.getManagerAccountId();

      if (!accessToken || !developerToken || !managerAccountId) {
        return { success: false, error: 'Missing tokens or manager account' };
      }

      const query = `SELECT customer.id, customer.descriptive_name FROM customer LIMIT 1`;
      const response = await fetch(`${this.BASE_URL}/customers/${this.normalizeCid(managerAccountId)}/googleAds:searchStream`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': developerToken,
          'login-customer-id': this.normalizeCid(managerAccountId),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `API request failed: ${response.status} - ${errorText}` };
      }

      return {
        success: true,
        accountInfo: { managerAccountId, hasAccessToken: !!accessToken, hasDeveloperToken: !!developerToken }
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Authenticate - simplified
   */
  static async authenticate(accessToken?: string): Promise<boolean> {
    try {
      const token = accessToken || await TokenManager.getAccessToken('googleAds');
      const developerToken = await this.getDeveloperToken();

      if (!token || !developerToken) {
        return false;
      }

      const testResult = await this.testConnection();
      return testResult.success;
    } catch (error) {
      debugLogger.error('GoogleAdsService', 'Authentication error', error);
      return false;
    }
  }

  /**
   * Get empty metrics structure
   */
  private static getEmptyMetrics() {
    return {
      impressions: 0,
      clicks: 0,
      cost: 0,
      leads: 0,
      ctr: 0,
      averageCpc: 0,
      conversions: 0
    };
  }
}