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
  private static readonly API_VERSION = 'v22';
  private static readonly BASE_URL = `https://googleads.googleapis.com/${this.API_VERSION}`;
  
  // Enhanced rate limiter with dynamic quota adaptation
  private static tokens = 10; // Start with higher limit - Google allows much more than 5 req/s
  private static lastRefill = Date.now();
  private static MAX_TOKENS = 50; // Increased from 5 to 50 based on Google's actual limits
  private static readonly REFILL_RATE = 1000; // 1 second
  private static readonly MIN_TOKENS = 5; // Minimum tokens to maintain
  private static readonly QUOTA_CHECK_INTERVAL = 30000; // Check quota every 30 seconds
  private static lastQuotaCheck = 0;

  // Caching system
  private static cache = new Map<string, { data: any; expiry: number }>();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Exponential backoff configuration
  private static readonly MAX_RETRIES = 3;
  private static readonly BASE_DELAY = 1000; // 1 second
  private static readonly MAX_DELAY = 30000; // 30 seconds

  /**
   * Cache helper methods
   */
  private static getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && cached.expiry > Date.now()) {
      debugLogger.debug('GoogleAdsService', 'Cache hit', { key });
      return cached.data;
    }
    if (cached) {
      this.cache.delete(key);
    }
    return null;
  }

  private static setCachedData<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + this.CACHE_DURATION
    });
    debugLogger.debug('GoogleAdsService', 'Cache set', { key, expiry: this.CACHE_DURATION });
  }

  private static clearCache(): void {
    this.cache.clear();
    debugLogger.debug('GoogleAdsService', 'Cache cleared');
  }

  /**
   * Normalize customer ID by removing all non-digit characters
   */
  private static normalizeCid(id: string | number): string {
    return String(id).replace(/\D/g, '');
  }

  /**
   * Parse Google Ads searchStream response - CORRECTED for JSON array format
   */
  private static parseSearchStreamText(text: string): unknown[] {
    const trimmed = text?.trim();
    if (!trimmed) {
      return [];
    }

    try {
      // SearchStream returns a JSON array of result objects
      const parsed = JSON.parse(trimmed);
      // parsed is already an array like [{ results: [...] }]
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (error) {
      debugLogger.warn('GoogleAdsService', 'Failed to parse searchStream response', { 
        text: trimmed.substring(0, 100), 
        error 
      });
      return [];
    }
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
    // Validate accessToken is a string
    if (!accessToken || typeof accessToken !== 'string') {
      const error = new Error(`Invalid access token: expected string, got ${typeof accessToken}`);
      debugLogger.error('GoogleAdsService', 'Invalid access token type', { 
        accessTokenType: typeof accessToken,
        accessTokenValue: accessToken 
      });
      throw error;
    }

    // Validate developerToken is a string
    if (!developerToken || typeof developerToken !== 'string') {
      const error = new Error(`Invalid developer token: expected string, got ${typeof developerToken}`);
      debugLogger.error('GoogleAdsService', 'Invalid developer token type', { 
        developerTokenType: typeof developerToken 
      });
      throw error;
    }

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
            
            SecureLogger.logRateLimit('GoogleAdsService', 'Rate limited - retrying', waitTime);
            
            await new Promise(resolve => globalThis.setTimeout(resolve, waitTime));
            return this.makeApiRequest({ accessToken, developerToken, customerId, managerId, gaql }, retryCount + 1);
          } else {
            SecureLogger.error('GoogleAdsService', 'Rate limit exceeded max retries', { retryCount });
            throw new Error('Google Ads API rate limit exceeded. Please try again later.');
          }
        }
        
        // Handle authentication errors (401)
        if (response.status === 401) {
          // Use the already-read text instead of reading response.text() again
          const errorText = text;
          
          // Parse JSON error response if available
          let parsedError: any = null;
          let errorMessage = 'Unknown authentication error';
          try {
            parsedError = JSON.parse(errorText);
            if (parsedError?.error?.message) {
              errorMessage = parsedError.error.message;
            } else if (parsedError?.error?.code) {
              errorMessage = `Error code: ${parsedError.error.code}`;
            }
          } catch {
            // Not JSON, use raw text
            errorMessage = errorText.substring(0, 200);
          }
          
          const errorDetails = {
            status: response.status,
            errorMessage,
            rawError: errorText.substring(0, 500),
            url,
            customerId: pathCid,
            managerId: loginCid,
            hasAccessToken: !!accessToken,
            hasDeveloperToken: !!developerToken,
            accessTokenType: typeof accessToken,
            accessTokenLength: (typeof accessToken === 'string' ? accessToken.length : 0),
            accessTokenPrefix: (typeof accessToken === 'string' && accessToken) ? `${accessToken.substring(0, 20)}...` : 'N/A',
            developerTokenLength: (typeof developerToken === 'string' ? developerToken.length : 0),
            developerTokenPrefix: (typeof developerToken === 'string' && developerToken) ? `${developerToken.substring(0, 10)}...` : 'N/A',
            parsedError
          };
          
          console.error('❌ Google Ads API 401 Authentication Error:', errorDetails);
          
          SecureLogger.logSecurityEvent('GoogleAdsService', 'Authentication error - 401 Unauthorized', { 
            status: response.status, 
            errorMessage,
            text: errorText.substring(0, 500),
            url,
            customerId: pathCid
          });
          
          debugLogger.error('GoogleAdsService', 'Google Ads API 401 Authentication Error', errorDetails);
          
          // Provide more specific error message
          let userFriendlyError = `Google Ads API authentication failed (401). `;
          if (errorMessage.includes('invalid') || errorMessage.includes('expired')) {
            userFriendlyError += `Token may be expired or invalid. Please reconnect your Google Ads account.`;
          } else if (errorMessage.includes('developer-token')) {
            userFriendlyError += `Developer token issue. Please check your Google Ads API configuration.`;
          } else if (errorMessage.includes('login-customer-id')) {
            userFriendlyError += `Manager account ID issue. Please check your account configuration.`;
          } else {
            userFriendlyError += `Error: ${errorMessage}`;
          }
          
          throw new Error(userFriendlyError);
        }
        
        // Handle quota exhaustion and other 403 errors
        if (response.status === 403) {
          // Use the already-read text instead of reading response.text() again
          const errorText = text;
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
        
        // Log the actual error response for debugging
        debugLogger.error('GoogleAdsService', 'Google Ads API Error Details', {
          status: response.status,
          statusText: response.statusText,
          responseText: text,
          url: url,
          customerId: pathCid,
          managerId: loginCid,
          gaql: gaql
        });
        
        const errorInfo = GoogleAdsErrorHandler.handleApiError({
          status: response.status,
          message: text
        }, 'makeApiRequest');
        
        SecureLogger.error('GoogleAdsService', 'API request failed', {
          errorCode: errorInfo.errorCode,
          technicalMessage: errorInfo.technicalMessage,
          canRetry: errorInfo.canRetry,
          requiresReauth: errorInfo.requiresReauth,
          actualResponse: text
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
  private static extractQuotaHeaders(response: Response): Record<string, unknown> | null {
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
  private static async adaptRateLimitFromHeaders(quotaHeaders: Record<string, unknown>): Promise<void> {
    try {
      // Google provides quota information in response headers
      // This allows us to dynamically adjust our rate limiting
      if (quotaHeaders.quotaInfo) {
        const quotaInfo = quotaHeaders.quotaInfo as { quotaUsed?: number; quotaLimit?: number };
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
   * Get Google Ads accounts - using new accounts service
   */
  static async getAdAccounts(): Promise<GoogleAdsAccount[]> {
    const cacheKey = 'googleAds_accounts';
    
    // Check cache first
    const cachedData = this.getCachedData<GoogleAdsAccount[]>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    try {
      debugLogger.debug('GoogleAdsService', 'Fetching accounts using new service');
      
      // Import the new accounts service
      const { listAccessibleCustomers } = await import('@/services/googleAds/accountsService');
      
      // Get accounts using the new service
      const accounts = await listAccessibleCustomers();
      
      debugLogger.debug('GoogleAdsService', 'Successfully fetched accounts', { 
        accountCount: accounts.length 
      });

      // Convert to our interface format
      const formattedAccounts = accounts.map(account => ({
        id: account.id,
        name: account.name || account.descriptiveName || `Account ${account.id}`,
        status: 'enabled',
        currency: 'USD',
        timezone: 'UTC'
      }));

      // Cache the results
      this.setCachedData(cacheKey, formattedAccounts);
      
      return formattedAccounts;
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
   * Get developer token from environment (like V1 implementation)
   */
  private static async getDeveloperToken(): Promise<string | null> {
    try {
      // Get developer token from environment variable (V1 approach)
      const developerToken = import.meta.env.VITE_GOOGLE_ADS_DEVELOPER_TOKEN;
      
      if (!developerToken) {
        debugLogger.warn('GoogleAdsService', 'Google Ads developer token not configured in environment');
        return null;
      }

      debugLogger.debug('GoogleAdsService', 'Developer token retrieved from environment', { 
        hasToken: !!developerToken, 
        tokenLength: developerToken.length 
      });
      return developerToken;
    } catch (error) {
      debugLogger.error('GoogleAdsService', 'Failed to get developer token from environment', error);
      return null;
    }
  }

  // Cache for manager account ID to prevent duplicate queries
  private static managerAccountIdCache: { id: string | null; timestamp: number } | null = null;
  private static readonly MANAGER_ID_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get manager account ID from database (with caching)
   */
  private static async getManagerAccountId(): Promise<string | null> {
    // Check cache first
    const now = Date.now();
    if (this.managerAccountIdCache && (now - this.managerAccountIdCache.timestamp) < this.MANAGER_ID_CACHE_DURATION) {
      debugLogger.debug('GoogleAdsService', 'Returning cached manager account ID');
      return this.managerAccountIdCache.id;
    }

    try {
      const { data: integration } = await supabase
        .from('integrations')
        .select('account_id')
        .eq('platform', 'googleAds')
        .eq('connected', true)
        .single();

      if (!integration?.account_id) {
        this.managerAccountIdCache = { id: null, timestamp: now };
        return null;
      }

      const normalizedId = this.normalizeCid(String(integration.account_id));
      const result = normalizedId.length >= 10 ? normalizedId : null;
      
      // Cache the result
      this.managerAccountIdCache = { id: result, timestamp: now };
      
      return result;
    } catch (error) {
      debugLogger.error('GoogleAdsService', 'Failed to get manager account ID', error);
      // Cache null result to prevent repeated failed queries
      this.managerAccountIdCache = { id: null, timestamp: now };
      return null;
    }
  }

  /**
   * Get monthly metrics for the previous 4 months (excluding current month)
   */
  static async getMonthlyMetrics(customerId: string): Promise<Array<{
    month: string;
    leads: number;
    cost: number;
    impressions: number;
    clicks: number;
  }>> {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-11

    // Calculate date range for last 4 complete months (excluding current month)
    // Use UTC for Google Ads API (Google Ads API uses UTC by default)
    const endDate = new Date(currentYear, currentMonth, 0); // Last day of previous month
    const startDate = new Date(currentYear, currentMonth - 4, 1); // First day of 4 months ago

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    try {
      debugLogger.info('GoogleAdsService', 'Fetching monthly data with segments.month', { 
        startDateStr, 
        endDateStr, 
        customerId 
      });

      // Use Google Ads API with segments.month for monthly data
      // Based on 2025 API documentation - query campaigns with monthly segmentation
      const gaql = `
        SELECT 
          segments.month,
          metrics.conversions,
          metrics.cost_micros,
          metrics.impressions,
          metrics.clicks
        FROM campaign
        WHERE segments.date BETWEEN '${startDateStr}' AND '${endDateStr}'
        AND campaign.status = 'ENABLED'
        ORDER BY segments.month
      `;

      // OPTIMIZED: Fetch credentials in parallel (best practice)
      const [accessToken, developerToken, managerAccountId] = await Promise.all([
        this.ensureValidToken(),
        this.getDeveloperToken(),
        this.getManagerAccountId()
      ]);

      if (!accessToken || !developerToken || !managerAccountId) {
        debugLogger.warn('GoogleAdsService', 'Missing required credentials for monthly metrics');
        return [];
      }

      const blocks = await this.makeApiRequest({
        accessToken,
        developerToken,
        customerId: this.normalizeCid(customerId),
        managerId: managerAccountId,
        gaql
      });

      debugLogger.info('GoogleAdsService', 'Monthly metrics API request completed', {
        blockCount: blocks.length,
        totalResults: blocks.reduce((sum: number, block) => sum + ((block as { results?: unknown[] }).results || []).length, 0)
      });

      // Group results by month using segments.month
      const leadsByMonth: Record<string, {
        leads: number;
        cost: number;
        impressions: number;
        clicks: number;
      }> = {};

      for (const block of blocks) {
        const results = (block as { results?: unknown[] }).results || [];
        for (const result of results) {
          const segments = (result as { segments?: { month?: string } }).segments;
          const metrics = (result as { 
            metrics?: { 
              conversions?: string | number; 
              costMicros?: string | number; 
              impressions?: string | number; 
              clicks?: string | number;
            } 
          }).metrics;

          const month = segments?.month;
          if (month && metrics) {
            // Convert Google's "2025-09-01" format to "2025-09" format to match Facebook
            const normalizedMonth = month.substring(0, 7); // "2025-09-01" -> "2025-09"
            
            if (!leadsByMonth[normalizedMonth]) {
              leadsByMonth[normalizedMonth] = {
                leads: 0,
                cost: 0,
                impressions: 0,
                clicks: 0
              };
            }
            
            leadsByMonth[normalizedMonth].leads += parseFloat(String(metrics.conversions || '0'));
            leadsByMonth[normalizedMonth].cost += parseFloat(String(metrics.costMicros || '0')) / 1000000; // Convert micros to dollars
            leadsByMonth[normalizedMonth].impressions += parseInt(String(metrics.impressions || '0'));
            leadsByMonth[normalizedMonth].clicks += parseInt(String(metrics.clicks || '0'));
          }
        }
      }

      // Convert to array format
      const monthlyData = Object.entries(leadsByMonth).map(([month, data]) => ({
        month,
        leads: data.leads,
        cost: data.cost,
        impressions: data.impressions,
        clicks: data.clicks
      }));

      // Sort by month
      monthlyData.sort((a, b) => a.month.localeCompare(b.month));
      
      debugLogger.info('GoogleAdsService', 'Processed monthly data', monthlyData);
      return monthlyData;
    } catch (error) {
      debugLogger.error('GoogleAdsService', 'Error fetching 4-month data', error);
      throw error;
    }
  }

  /**
   * Get account metrics - simplified
   */
  static async getAccountMetrics(customerId: string, dateRange: { start: string; end: string; period?: string }, includePreviousPeriod: boolean = false): Promise<{
    impressions: number;
    clicks: number;
    cost: number;
    leads: number;
    ctr: number;
    averageCpc: number;
    conversions: number;
    conversionRate: number;
    // Previous period data for comparison
    previousPeriod?: {
      impressions: number;
      clicks: number;
      cost: number;
      leads: number;
      ctr: number;
      averageCpc: number;
      conversions: number;
      conversionRate: number;
    };
  } | null> {
    try {
      // OPTIMIZED: Fetch credentials in parallel (best practice)
      const [accessToken, developerToken, managerAccountId] = await Promise.all([
        this.ensureValidToken(),
        this.getDeveloperToken(),
        this.getManagerAccountId()
      ]);

      if (!accessToken || !developerToken || !managerAccountId) {
        debugLogger.warn('GoogleAdsService', 'Missing required credentials for metrics');
        return null;
      }

      let gaql: string;
      
      // OPTIMIZED: Use customer resource for account-level aggregated metrics (faster, single query)
      // This is the recommended approach per Google Ads API documentation for account-level metrics
      // NOTE: If customer resource returns no data, we'll fallback to campaign aggregation
      if (dateRange.period === 'lastMonth') {
        // Use API preset for last month (more reliable than manual calculation)
        gaql = `SELECT metrics.conversions, metrics.cost_micros, metrics.impressions, metrics.clicks FROM customer WHERE segments.date DURING LAST_MONTH`;
      } else if (dateRange.period === '30d') {
        // Use API preset for last 30 days
        gaql = `SELECT metrics.conversions, metrics.cost_micros, metrics.impressions, metrics.clicks FROM customer WHERE segments.date DURING LAST_30_DAYS`;
      } else {
        // For custom date ranges, use BETWEEN with customer resource
        gaql = `SELECT metrics.conversions, metrics.cost_micros, metrics.impressions, metrics.clicks FROM customer WHERE segments.date BETWEEN '${dateRange.start}' AND '${dateRange.end}'`;
      }
      
      debugLogger.info('GoogleAdsService', 'Using GAQL query for account metrics', {
        customerId: this.normalizeCid(customerId),
        gaql,
        dateRange,
        period: dateRange.period
      });
      const blocks = await this.makeApiRequest({
        accessToken,
        developerToken,
        customerId: this.normalizeCid(customerId),
        managerId: managerAccountId,
        gaql
      });

      let impressions = 0, clicks = 0, costMicros = 0, conversions = 0;
      
      debugLogger.info('GoogleAdsService', 'Processing API blocks', {
        blockCount: blocks.length,
        blocks: blocks.map(block => ({
          hasResults: !!(block as { results?: unknown[] }).results,
          resultCount: ((block as { results?: unknown[] }).results || []).length,
          firstResult: ((block as { results?: unknown[] }).results || [])[0] || null
        }))
      });
      
      // OPTIMIZED: Customer resource returns aggregated data, so we typically get 1 result per date
      // Aggregate all results (in case there are multiple dates)
      for (const block of blocks) {
        const results = (block as { results?: unknown[] }).results || [];
        for (const result of results) {
          const m = (result as { 
            metrics?: { 
              impressions?: string | number; 
              clicks?: string | number; 
              costMicros?: string | number; 
              cost_micros?: string | number; // API may return with underscore
              conversions?: string | number;
              conversionsFromInteractionsRate?: string | number;
              averageCpc?: string | number;
            } 
          }).metrics || {};
          
          // Handle both camelCase and snake_case field names from API
          const costMicrosValue = (m as any).cost_micros || m.costMicros || 0;
          
          debugLogger.debug('GoogleAdsService', 'Processing customer result', {
            impressions: m.impressions,
            clicks: m.clicks,
            costMicros: costMicrosValue,
            conversions: m.conversions,
            rawMetrics: m
          });
          
          impressions += Number(m.impressions || 0);
          clicks += Number(m.clicks || 0);
          costMicros += Number(costMicrosValue);
          conversions += Number(m.conversions || 0);
        }
      }
      
      debugLogger.info('GoogleAdsService', 'Aggregated raw data', {
        impressions,
        clicks,
        costMicros,
        conversions,
        resultCount: blocks.reduce((sum: number, block) => sum + ((block as { results?: unknown[] }).results || []).length, 0)
      });
      
      // Debug: Log customer-level impressions for comparison with campaign breakdown
      console.log('📊 Customer Resource Query Results:');
      console.log('  Total impressions (customer level):', impressions.toLocaleString());
      console.log('  Total clicks:', clicks.toLocaleString());
      console.log('  Total conversions:', conversions.toLocaleString());
      console.log('  Note: Customer resource includes ALL campaigns (no status filter)');

      // OPTIMIZED: Only try fallback if we got zero results AND it's a custom date range
      // For API presets, trust the API response (it's more reliable)
      const shouldTryFallback = impressions === 0 && clicks === 0 && costMicros === 0 && conversions === 0 
        && !dateRange.period; // Only for custom date ranges, not presets
      
      if (shouldTryFallback) {
        debugLogger.warn('GoogleAdsService', 'Customer resource returned no data, trying campaign-level aggregation');
        
        // Fallback to campaign-level query with timeout
        const fallbackGaql = `SELECT metrics.conversions, metrics.cost_micros, metrics.impressions, metrics.clicks FROM campaign WHERE segments.date BETWEEN '${dateRange.start}' AND '${dateRange.end}' AND campaign.status = 'ENABLED'`;
        
        try {
          // Add timeout to prevent hanging
          const fallbackPromise = this.makeApiRequest({
            accessToken,
            developerToken,
            customerId: this.normalizeCid(customerId),
            managerId: managerAccountId,
            gaql: fallbackGaql
          });

          const timeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Fallback query timeout')), 5000)
          );

          const fallbackBlocks = await Promise.race([fallbackPromise, timeoutPromise]);

          // Reset counters
          impressions = 0;
          clicks = 0;
          costMicros = 0;
          conversions = 0;

          for (const block of fallbackBlocks) {
            const results = (block as { results?: unknown[] }).results || [];
            for (const result of results) {
              const m = (result as { 
                metrics?: { 
                  impressions?: string | number; 
                  clicks?: string | number; 
                  costMicros?: string | number; 
                  cost_micros?: string | number;
                  conversions?: string | number;
                } 
              }).metrics || {};
              
              const costMicrosValue = (m as any).cost_micros || m.costMicros || 0;
              
              impressions += Number(m.impressions || 0);
              clicks += Number(m.clicks || 0);
              costMicros += Number(costMicrosValue);
              conversions += Number(m.conversions || 0);
            }
          }

          debugLogger.info('GoogleAdsService', 'Campaign-level fallback aggregated data', {
            impressions,
            clicks,
            costMicros,
            conversions
          });
        } catch (fallbackError) {
          debugLogger.debug('GoogleAdsService', 'Campaign-level fallback failed or timed out', fallbackError);
          // Continue with zeros - better than hanging
        }
      }

      // Convert cost from micros to dollars
      const cost = costMicros / 1e6;
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      
      // Calculate conversion rate: conversions / clicks * 100 (not conversions / impressions)
      const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
      
      // Calculate average CPC: cost / clicks (already in dollars)
      const averageCpc = clicks > 0 ? cost / clicks : 0;

      const hasData = impressions > 0 || clicks > 0 || cost > 0 || conversions > 0;
      
      debugLogger.info('GoogleAdsService', 'Final metrics being returned', {
        impressions,
        clicks,
        cost,
        leads: conversions, // Using conversions as leads
        conversions,
        ctr,
        averageCpc,
        conversionRate,
        hasData,
        usedFallback: shouldTryFallback && hasData
      });

      // OPTIMIZED: Early return if we have data - no need to fetch previous period if not requested
      if (!includePreviousPeriod) {
        return { 
          impressions, 
          clicks, 
          cost, 
          leads: conversions, 
          ctr, 
          averageCpc, 
          conversions,
          conversionRate,
          previousPeriod: undefined
        };
      }

      // Fetch previous period data if requested
      let previousPeriod;
      try {
        const { getPreviousDateRange } = await import('@/lib/dateUtils');
        const previousDateRange = getPreviousDateRange('30d'); // Default to 30d for now
        
        // OPTIMIZED: Use customer resource for previous period (faster, aggregated)
        const previousGaql = `SELECT 
          metrics.conversions, 
          metrics.cost_micros, 
          metrics.impressions, 
          metrics.clicks 
        FROM customer 
        WHERE segments.date BETWEEN '${previousDateRange.start}' AND '${previousDateRange.end}'`;
        const previousBlocks = await this.makeApiRequest({
          accessToken,
          developerToken,
          customerId: this.normalizeCid(customerId),
          managerId: managerAccountId,
          gaql: previousGaql
        });

        let prevImpressions = 0, prevClicks = 0, prevCostMicros = 0, prevConversions = 0;
        
        for (const block of previousBlocks) {
          const results = (block as { results?: unknown[] }).results || [];
          for (const result of results) {
            const m = (result as { 
              metrics?: { 
                impressions?: string | number; 
                clicks?: string | number; 
                costMicros?: string | number;
                cost_micros?: string | number; // API returns with underscore
                conversions?: string | number;
              } 
            }).metrics || {};
            
            // Google Ads API returns fields with underscores, check both formats
            const costMicrosValue = (m as any).cost_micros || m.costMicros || 0;
            
            prevImpressions += Number(m.impressions || 0);
            prevClicks += Number(m.clicks || 0);
            prevCostMicros += Number(costMicrosValue);
            prevConversions += Number(m.conversions || 0);
          }
        }

        const prevCost = Math.round(prevCostMicros / 1e6);
        const prevCtr = prevImpressions > 0 ? (prevClicks / prevImpressions) * 100 : 0;
        const prevConversionRate = prevClicks > 0 ? (prevConversions / prevClicks) * 100 : 0;
        const prevAverageCpc = prevClicks > 0 ? prevCost / prevClicks : 0;

        previousPeriod = {
          impressions: prevImpressions,
          clicks: prevClicks,
          cost: prevCost,
          leads: prevConversions,
          ctr: prevCtr,
          averageCpc: prevAverageCpc,
          conversions: prevConversions,
          conversionRate: prevConversionRate
        };
      } catch (error) {
        debugLogger.warn('GoogleAdsService', 'Failed to fetch previous period data', error);
        // Continue without previous period data
      }

      return { 
        impressions, 
        clicks, 
        cost, 
        leads: conversions, 
        ctr, 
        averageCpc, 
        conversions,
        conversionRate,
        previousPeriod
      };
    } catch (error) {
      debugLogger.error('GoogleAdsService', 'Error getting metrics', error);
      return null;
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
      // OPTIMIZED: Fetch credentials in parallel (best practice)
      const [accessToken, developerToken, managerAccountId] = await Promise.all([
        this.ensureValidToken(),
        this.getDeveloperToken(),
        this.getManagerAccountId()
      ]);

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
   * Get demographic breakdown data from Google Ads
   * Uses separate queries for gender and age due to API limitations
   */
  static async getDemographicBreakdown(customerId: string, dateRange: { start: string; end: string }): Promise<{
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
  } | null> {
    try {
      debugLogger.info('GoogleAdsService', 'Fetching demographic breakdown data', {
        customerId,
        dateRange
      });

      // OPTIMIZED: Fetch credentials in parallel (best practice)
      const [accessToken, developerToken, managerAccountId] = await Promise.all([
        this.ensureValidToken(),
        this.getDeveloperToken(),
        this.getManagerAccountId()
      ]);

      if (!accessToken || !developerToken || !managerAccountId) {
        debugLogger.warn('GoogleAdsService', 'Missing required credentials for demographics');
        return null;
      }

      // Run separate queries for gender and age due to API limitations
      const [genderData, ageData] = await Promise.all([
        this.getGenderBreakdown(customerId, dateRange, accessToken, developerToken, managerAccountId),
        this.getAgeBreakdown(customerId, dateRange, accessToken, developerToken, managerAccountId)
      ]);

      debugLogger.info('GoogleAdsService', 'Demographics data fetched', {
        hasGenderData: !!genderData,
        hasAgeData: !!ageData
      });

      return {
        ageGroups: ageData,
        gender: genderData
      };
    } catch (error) {
      debugLogger.error('GoogleAdsService', 'Failed to fetch demographics data', error);
      return null;
    }
  }

  /**
   * Get gender breakdown using gender_view (Google Ads API v21)
   */
  private static async getGenderBreakdown(
    customerId: string, 
    dateRange: { start: string; end: string },
    accessToken: string,
    developerToken: string,
    managerAccountId: string
  ): Promise<{ female: number; male: number }> {
    try {
      // Use gender_view for demographics (correct approach for v21)
      const gaql = `
        SELECT 
          ad_group_criterion.gender.type,
          metrics.conversions,
          metrics.cost_micros,
          metrics.impressions,
          metrics.clicks
        FROM gender_view 
        WHERE segments.date BETWEEN '${dateRange.start}' AND '${dateRange.end}'
        AND ad_group_criterion.status = 'ENABLED'
      `;

      debugLogger.info('GoogleAdsService', 'Fetching gender data with gender_view', {
        customerId,
        dateRange,
        gaql: gaql.replace(/\s+/g, ' ').trim()
      });

      const blocks = await this.makeApiRequest({
        accessToken,
        developerToken,
        customerId: this.normalizeCid(customerId),
        managerId: managerAccountId,
        gaql
      });

      return this.processGenderDataCriterionInfo(blocks);
    } catch (error) {
      debugLogger.error('GoogleAdsService', 'Gender view approach failed, trying ad_group_criterion fallback', error);
      
      // Fallback to ad_group_criterion approach
      try {
        const fallbackGaql = `
          SELECT 
            ad_group_criterion.gender.type,
            metrics.conversions,
            metrics.cost_micros
          FROM ad_group_criterion 
          WHERE segments.date BETWEEN '${dateRange.start}' AND '${dateRange.end}'
          AND ad_group_criterion.type = 'GENDER'
          AND ad_group_criterion.status = 'ENABLED'
        `;

        debugLogger.info('GoogleAdsService', 'Trying ad_group_criterion fallback for gender', {
          customerId,
          dateRange,
          gaql: fallbackGaql.replace(/\s+/g, ' ').trim()
        });

        const blocks = await this.makeApiRequest({
          accessToken,
          developerToken,
          customerId: this.normalizeCid(customerId),
          managerId: managerAccountId,
          gaql: fallbackGaql
        });

        return this.processGenderDataCriterionInfo(blocks);
      } catch (fallbackError) {
        debugLogger.error('GoogleAdsService', 'Both gender approaches failed', fallbackError);
        return { female: 0, male: 0 };
      }
    }
  }

  /**
   * Get age breakdown using age_range_view (Google Ads API v21)
   */
  private static async getAgeBreakdown(
    customerId: string, 
    dateRange: { start: string; end: string },
    accessToken: string,
    developerToken: string,
    managerAccountId: string
  ): Promise<{ '25-34': number; '35-44': number; '45-54': number; '55+': number }> {
    try {
      // Use age_range_view for demographics (correct approach for v21)
      const gaql = `
        SELECT 
          ad_group_criterion.age_range.type,
          metrics.conversions,
          metrics.cost_micros,
          metrics.impressions,
          metrics.clicks
        FROM age_range_view 
        WHERE segments.date BETWEEN '${dateRange.start}' AND '${dateRange.end}'
        AND ad_group_criterion.status = 'ENABLED'
      `;

      debugLogger.info('GoogleAdsService', 'Fetching age data with age_range_view', {
        customerId,
        dateRange,
        gaql: gaql.replace(/\s+/g, ' ').trim()
      });

      const blocks = await this.makeApiRequest({
        accessToken,
        developerToken,
        customerId: this.normalizeCid(customerId),
        managerId: managerAccountId,
        gaql
      });

      return this.processAgeDataCriterionInfo(blocks);
    } catch (error) {
      debugLogger.error('GoogleAdsService', 'Age range view approach failed, trying ad_group_criterion fallback', error);
      
      // Fallback to ad_group_criterion approach
      try {
        const fallbackGaql = `
          SELECT 
            ad_group_criterion.age_range.type,
            metrics.conversions,
            metrics.cost_micros
          FROM ad_group_criterion 
          WHERE segments.date BETWEEN '${dateRange.start}' AND '${dateRange.end}'
          AND ad_group_criterion.type = 'AGE_RANGE'
          AND ad_group_criterion.status = 'ENABLED'
        `;

        debugLogger.info('GoogleAdsService', 'Trying ad_group_criterion fallback for age', {
          customerId,
          dateRange,
          gaql: fallbackGaql.replace(/\s+/g, ' ').trim()
        });

        const blocks = await this.makeApiRequest({
          accessToken,
          developerToken,
          customerId: this.normalizeCid(customerId),
          managerId: managerAccountId,
          gaql: fallbackGaql
        });

        return this.processAgeDataCriterionInfo(blocks);
      } catch (fallbackError) {
        debugLogger.error('GoogleAdsService', 'Both age approaches failed', fallbackError);
        return { '25-34': 0, '35-44': 0, '45-54': 0, '55+': 0 };
      }
    }
  }

  /**
   * Get campaign breakdown data from Google Ads
   * OPTIMIZED: This is optional and non-blocking - can be loaded separately
   * Uses simplified GAQL query to avoid segments issues
   */
  static async getCampaignBreakdown(customerId: string, dateRange: { start: string; end: string; period?: string }): Promise<{
    campaignTypes: {
      search: { conversions: number; impressions: number; conversionRate: number };
      display: { conversions: number; impressions: number; conversionRate: number };
      youtube: { conversions: number; impressions: number; conversionRate: number };
      performanceMax: { conversions: number; impressions: number; conversionRate: number };
    };
    adFormats: {
      textAds: { conversions: number; impressions: number; conversionRate: number };
      responsiveDisplay: { conversions: number; impressions: number; conversionRate: number };
      videoAds: { conversions: number; impressions: number; conversionRate: number };
      assetTypes: Record<string, { conversions: number; impressions: number; conversionRate: number }>;
    };
  } | null> {
    try {
      debugLogger.info('GoogleAdsService', 'Fetching campaign breakdown data', {
        customerId,
        dateRange,
        hasPeriod: !!dateRange.period,
        period: dateRange.period,
        start: dateRange.start,
        end: dateRange.end
      });

      // OPTIMIZED: Fetch credentials in parallel (best practice)
      const [accessToken, developerToken, managerAccountId] = await Promise.all([
        this.ensureValidToken(),
        this.getDeveloperToken(),
        this.getManagerAccountId()
      ]);

      if (!accessToken || !developerToken || !managerAccountId) {
        debugLogger.warn('GoogleAdsService', 'Missing required credentials for campaign breakdown', {
          hasAccessToken: !!accessToken,
          accessTokenType: typeof accessToken,
          hasDeveloperToken: !!developerToken,
          developerTokenType: typeof developerToken,
          hasManagerAccountId: !!managerAccountId
        });
        return null;
      }

      // Validate accessToken is a string
      if (typeof accessToken !== 'string') {
        debugLogger.error('GoogleAdsService', 'Invalid access token type for campaign breakdown', {
          accessTokenType: typeof accessToken,
          accessTokenValue: accessToken
        });
        return null;
      }

      // Validate developerToken is a string
      if (typeof developerToken !== 'string') {
        debugLogger.error('GoogleAdsService', 'Invalid developer token type for campaign breakdown', {
          developerTokenType: typeof developerToken
        });
        return null;
      }

      // Handle preset periods using Google Ads API v22 presets
      let dateClause: string;
      if (dateRange.period === 'lastMonth') {
        dateClause = `segments.date DURING LAST_MONTH`;
      } else if (dateRange.period === 'last30Days') {
        dateClause = `segments.date DURING LAST_30_DAYS`;
      } else {
        // For all other periods, use BETWEEN with calculated dates
        dateClause = `segments.date BETWEEN '${dateRange.start}' AND '${dateRange.end}'`;
      }
      
      // GAQL queries for campaign breakdown - MUST use separate queries
      // Google Ads API v22 does NOT support nested paths like ad_group_ad.ad_group.campaign.advertising_channel_type
      // Query 1: Get campaign types from campaign resource
      const campaignTypesQuery = `
        SELECT
          segments.date,
          campaign.advertising_channel_type,
          metrics.impressions,
          metrics.clicks,
          metrics.conversions,
          metrics.cost_micros
        FROM campaign
        WHERE ${dateClause}
          AND campaign.status != 'REMOVED'
        ORDER BY metrics.conversions DESC
      `.trim();
      
      // Query 2: Get ad formats from ad_group_ad resource for Search campaigns only
      // This gets traditional ad formats (Text Ads, Responsive Search Ads, etc.) from Search campaigns
      const searchAdFormatsQuery = `
        SELECT
          segments.date,
          ad_group_ad.ad.type,
          campaign.advertising_channel_type,
          metrics.impressions,
          metrics.clicks,
          metrics.conversions,
          metrics.cost_micros
        FROM ad_group_ad
        WHERE ${dateClause}
          AND campaign.advertising_channel_type = 'SEARCH'
          AND campaign.status != 'REMOVED'
        ORDER BY metrics.conversions DESC
      `.trim();
      
      // Query 3: Get Performance Max asset-level data with channel breakdown
      // Uses asset_group_asset resource to get asset-level metrics
      // IMPORTANT: This data is "non-summable" - multiple assets in same ad will inflate totals
      // Use asset.type to categorize ad formats (TEXT, IMAGE, VIDEO)
      // Use segments.ad_network_type for channel insights (SEARCH, YOUTUBE, DISPLAY)
      // For ad formats breakdown, we use asset.type to map to our categories
      const performanceMaxAdFormatsQuery = `
        SELECT
          segments.date,
          segments.ad_network_type,
          campaign.id,
          asset_group.id,
          asset.id,
          asset.name,
          asset.type,
          metrics.impressions,
          metrics.clicks,
          metrics.conversions,
          metrics.cost_micros
        FROM asset_group_asset
        WHERE ${dateClause}
          AND campaign.advertising_channel_type = 'PERFORMANCE_MAX'
          AND campaign.status != 'REMOVED'
        ORDER BY metrics.conversions DESC
      `.trim();

      const normalizedCustomerId = this.normalizeCid(customerId);
      const apiUrl = `${this.BASE_URL}/customers/${normalizedCustomerId}/googleAds:searchStream`;
      
      debugLogger.info('GoogleAdsService', 'Campaign breakdown - Using separate queries', {
        method: 'POST',
        url: apiUrl,
        customerId: normalizedCustomerId,
        managerId: managerAccountId,
        dateClause: dateClause,
        dateRange: dateRange
      });

      // Execute queries in parallel: Campaign Types, Search Ad Formats, Performance Max Asset Groups
      // Add performance monitoring
      const startTime = Date.now();
      
      const [campaignBlocks, searchAdFormatBlocks, performanceMaxAdFormatBlocks] = await Promise.allSettled([
        (async () => {
          const queryStart = Date.now();
          try {
            const result = await this.makeApiRequest({
              accessToken,
              developerToken,
              customerId: normalizedCustomerId,
              managerId: managerAccountId,
              gaql: campaignTypesQuery
            });
            return result;
          } catch (error) {
            debugLogger.error('GoogleAdsService', `Campaign Types query failed after ${Date.now() - queryStart}ms`, error);
            throw error;
          }
        })(),
        (async () => {
          const queryStart = Date.now();
          try {
            const result = await this.makeApiRequest({
              accessToken,
              developerToken,
              customerId: normalizedCustomerId,
              managerId: managerAccountId,
              gaql: searchAdFormatsQuery
            });
            return result;
          } catch (error) {
            debugLogger.error('GoogleAdsService', `Search Ad Formats query failed after ${Date.now() - queryStart}ms`, error);
            throw error;
          }
        })(),
        (async () => {
          const queryStart = Date.now();
          try {
            const result = await this.makeApiRequest({
              accessToken,
              developerToken,
              customerId: normalizedCustomerId,
              managerId: managerAccountId,
              gaql: performanceMaxAdFormatsQuery
            });
            return result;
          } catch (error) {
            debugLogger.error('GoogleAdsService', `Performance Max Assets query failed after ${Date.now() - queryStart}ms`, error);
            throw error;
          }
        })()
      ]);
      
      const totalTime = Date.now() - startTime;
      debugLogger.info('GoogleAdsService', `Campaign breakdown queries completed in ${totalTime}ms`);

      const campaignResults = campaignBlocks.status === 'fulfilled' ? campaignBlocks.value : [];
      const searchAdFormatResults = searchAdFormatBlocks.status === 'fulfilled' ? searchAdFormatBlocks.value : [];
      const performanceMaxAdFormatResults = performanceMaxAdFormatBlocks.status === 'fulfilled' ? performanceMaxAdFormatBlocks.value : [];
      
      // Log query results summary (reduced logging for performance)
      if (campaignBlocks.status === 'rejected') {
        debugLogger.error('GoogleAdsService', 'Campaign blocks query rejected', campaignBlocks.reason);
      }
      if (searchAdFormatBlocks.status === 'rejected') {
        debugLogger.error('GoogleAdsService', 'Search ad format blocks query rejected', searchAdFormatBlocks.reason);
      }
      if (performanceMaxAdFormatBlocks.status === 'rejected') {
        debugLogger.error('GoogleAdsService', 'Performance Max blocks query rejected', performanceMaxAdFormatBlocks.reason);
      }

      if (campaignBlocks.status === 'rejected') {
        debugLogger.warn('GoogleAdsService', 'Campaign types query failed', campaignBlocks.reason);
      }
      if (searchAdFormatBlocks.status === 'rejected') {
        debugLogger.warn('GoogleAdsService', 'Search ad formats query failed', searchAdFormatBlocks.reason);
      }
      if (performanceMaxAdFormatBlocks.status === 'rejected') {
        debugLogger.debug('GoogleAdsService', 'Performance Max asset group query failed', performanceMaxAdFormatBlocks.reason);
      }

      // Check if we have Performance Max campaigns
      const hasPerformanceMax = campaignResults.some((block: any) => {
        const results = block?.results || [];
        return results.some((result: any) => 
          result.campaign?.advertisingChannelType === 'PERFORMANCE_MAX' ||
          result.campaign?.advertising_channel_type === 'PERFORMANCE_MAX'
        );
      });

      debugLogger.info('GoogleAdsService', 'Campaign breakdown API response', {
        campaignBlocksCount: campaignResults.length,
        searchAdFormatBlocksCount: searchAdFormatResults.length,
        performanceMaxAdFormatBlocksCount: performanceMaxAdFormatResults.length,
        campaignHasData: campaignResults.length > 0,
        searchAdFormatHasData: searchAdFormatResults.length > 0,
        performanceMaxAdFormatHasData: performanceMaxAdFormatResults.length > 0,
        hasPerformanceMax,
        campaignBlocksStatus: campaignBlocks.status,
        searchAdFormatBlocksStatus: searchAdFormatBlocks.status,
        performanceMaxAdFormatBlocksStatus: performanceMaxAdFormatBlocks.status,
        campaignBlocksError: campaignBlocks.status === 'rejected' ? String(campaignBlocks.reason) : null,
        searchAdFormatBlocksError: searchAdFormatBlocks.status === 'rejected' ? String(searchAdFormatBlocks.reason) : null,
        performanceMaxAdFormatBlocksError: performanceMaxAdFormatBlocks.status === 'rejected' ? String(performanceMaxAdFormatBlocks.reason) : null,
        note: 'Performance Max uses asset_group_asset resource with segments.ad_network_type for channel breakdown'
      });

      // BEST PRACTICE: Graceful degradation - return partial data if some queries succeed
      // Only return null if ALL critical queries fail
      const hasCampaignTypes = campaignBlocks.status === 'fulfilled';
      const hasSearchAdFormats = searchAdFormatBlocks.status === 'fulfilled';
      const hasPerformanceMaxData = performanceMaxAdFormatBlocks.status === 'fulfilled';
      
      // Log what we got
      console.log('[GoogleAdsService] Breakdown query results:', {
        campaignBlocksStatus: campaignBlocks.status,
        campaignBlocksCount: hasCampaignTypes ? ((campaignBlocks as PromiseFulfilledResult<unknown[]>).value?.length || 0) : 0,
        searchAdFormatBlocksStatus: searchAdFormatBlocks.status,
        searchAdFormatBlocksCount: hasSearchAdFormats ? ((searchAdFormatBlocks as PromiseFulfilledResult<unknown[]>).value?.length || 0) : 0,
        performanceMaxAdFormatBlocksStatus: performanceMaxAdFormatBlocks.status,
        performanceMaxAdFormatBlocksCount: hasPerformanceMaxData ? ((performanceMaxAdFormatBlocks as PromiseFulfilledResult<unknown[]>).value?.length || 0) : 0,
        hasAnyData: hasCampaignTypes || hasSearchAdFormats || hasPerformanceMaxData
      });
      
      // Log failures but continue with partial data
      if (campaignBlocks.status === 'rejected') {
        console.warn('[GoogleAdsService] Campaign types query failed (non-critical, will use empty data):', campaignBlocks.reason);
        debugLogger.warn('GoogleAdsService', 'Campaign types query failed - using empty data for graceful degradation', {
          reason: campaignBlocks.reason
        });
      }
      if (searchAdFormatBlocks.status === 'rejected') {
        console.warn('[GoogleAdsService] Search ad formats query failed (non-critical, will use empty data):', searchAdFormatBlocks.reason);
        debugLogger.warn('GoogleAdsService', 'Search ad formats query failed - using empty data for graceful degradation', {
          reason: searchAdFormatBlocks.reason
        });
      }
      if (performanceMaxAdFormatBlocks.status === 'rejected') {
        console.warn('[GoogleAdsService] Performance Max query failed (non-critical, will use empty data):', performanceMaxAdFormatBlocks.reason);
        debugLogger.warn('GoogleAdsService', 'Performance Max query failed - using empty data for graceful degradation', {
          reason: performanceMaxAdFormatBlocks.reason
        });
      }
      
      // Only return null if ALL queries failed (no data at all)
      if (!hasCampaignTypes && !hasSearchAdFormats && !hasPerformanceMaxData) {
        console.error('[GoogleAdsService] All breakdown queries failed - returning null');
        debugLogger.error('GoogleAdsService', 'All breakdown queries failed', {
          campaignBlocksReason: campaignBlocks.status === 'rejected' ? campaignBlocks.reason : null,
          searchAdFormatBlocksReason: searchAdFormatBlocks.status === 'rejected' ? searchAdFormatBlocks.reason : null,
          performanceMaxAdFormatBlocksReason: performanceMaxAdFormatBlocks.status === 'rejected' ? performanceMaxAdFormatBlocks.reason : null
        });
        return null;
      }

      // Process and combine the separate query results (use empty arrays for failed queries)
      // Search ad formats from ad_group_ad, Performance Max from asset_group
      const processedData = this.processCampaignBreakdownDataSeparate(
        campaignResults, 
        searchAdFormatResults,
        performanceMaxAdFormatResults
      );
      
      // Log the processed data to see what we're returning
      debugLogger.info('GoogleAdsService', 'Campaign breakdown processed data summary', {
        searchConversions: processedData.campaignTypes.search.conversions,
        searchImpressions: processedData.campaignTypes.search.impressions,
        displayConversions: processedData.campaignTypes.display.conversions,
        displayImpressions: processedData.campaignTypes.display.impressions,
        youtubeConversions: processedData.campaignTypes.youtube.conversions,
        youtubeImpressions: processedData.campaignTypes.youtube.impressions,
        performanceMaxConversions: processedData.campaignTypes.performanceMax.conversions,
        performanceMaxImpressions: processedData.campaignTypes.performanceMax.impressions,
        textAdsConversions: processedData.adFormats.textAds.conversions,
        textAdsImpressions: processedData.adFormats.textAds.impressions,
        responsiveDisplayConversions: processedData.adFormats.responsiveDisplay.conversions,
        responsiveDisplayImpressions: processedData.adFormats.responsiveDisplay.impressions,
        videoAdsConversions: processedData.adFormats.videoAds.conversions,
        videoAdsImpressions: processedData.adFormats.videoAds.impressions
      });
      
      // Log summary only (reduced logging for performance)
      debugLogger.info('GoogleAdsService', 'Campaign breakdown processed successfully');
      
      return processedData;
    } catch (error) {
      console.error('[GoogleAdsService] getCampaignBreakdown - ERROR CAUGHT:', error);
      debugLogger.error('GoogleAdsService', 'Failed to fetch campaign breakdown data', {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined
      });
      return null;
    }
  }

  /**
   * Process gender data from segments API response (preferred approach)
   */
  private static processGenderData(blocks: any[]): { female: number; male: number } {
    const gender = { female: 0, male: 0 };
    let totalConversions = 0;

    for (const block of blocks) {
      const results = (block as { results?: unknown[] }).results || [];
      for (const result of results) {
        const data = result as any;
        const conversions = parseInt(data.metrics?.conversions || '0');
        totalConversions += conversions;

        // Handle segments approach
        const genderValue = data.segments?.gender;
        if (genderValue) {
          if (genderValue === 'GENDER_FEMALE') {
            gender.female += conversions;
          } else if (genderValue === 'GENDER_MALE') {
            gender.male += conversions;
          }
        }
      }
    }

    // Convert to percentages
    if (totalConversions > 0) {
      gender.female = Math.round((gender.female / totalConversions) * 100);
      gender.male = Math.round((gender.male / totalConversions) * 100);
    }

    debugLogger.info('GoogleAdsService', 'Processed gender data', {
      totalConversions,
      gender,
      blocksProcessed: blocks.length
    });

    return gender;
  }

  /**
   * Process gender data from CriterionInfo API response (fallback approach)
   */
  private static processGenderDataCriterionInfo(blocks: any[]): { female: number; male: number } {
    const gender = { female: 0, male: 0 };
    let totalConversions = 0;

    for (const block of blocks) {
      const results = (block as { results?: unknown[] }).results || [];
      for (const result of results) {
        const data = result as any;
        const conversions = parseInt(data.metrics?.conversions || '0');
        totalConversions += conversions;

        // Handle CriterionInfo approach
        const genderValue = data.ad_group_criterion?.gender?.type;
        if (genderValue) {
          if (genderValue === 'GENDER_FEMALE') {
            gender.female += conversions;
          } else if (genderValue === 'GENDER_MALE') {
            gender.male += conversions;
          }
        }
      }
    }

    // Convert to percentages
    if (totalConversions > 0) {
      gender.female = Math.round((gender.female / totalConversions) * 100);
      gender.male = Math.round((gender.male / totalConversions) * 100);
    }

    debugLogger.info('GoogleAdsService', 'Processed gender data (CriterionInfo)', {
      totalConversions,
      gender,
      blocksProcessed: blocks.length
    });

    return gender;
  }

  /**
   * Process age data from segments API response (preferred approach)
   */
  private static processAgeData(blocks: any[]): { '25-34': number; '35-44': number; '45-54': number; '55+': number } {
    const ageGroups = { '25-34': 0, '35-44': 0, '45-54': 0, '55+': 0 };
    let totalConversions = 0;

    for (const block of blocks) {
      const results = (block as { results?: unknown[] }).results || [];
      for (const result of results) {
        const data = result as any;
        const conversions = parseInt(data.metrics?.conversions || '0');
        totalConversions += conversions;

        // Handle segments approach
        const ageRange = data.segments?.age_range;
        if (ageRange) {
          if (ageRange === 'AGE_RANGE_25_34') {
            ageGroups['25-34'] += conversions;
          } else if (ageRange === 'AGE_RANGE_35_44') {
            ageGroups['35-44'] += conversions;
          } else if (ageRange === 'AGE_RANGE_45_54') {
            ageGroups['45-54'] += conversions;
          } else if (ageRange === 'AGE_RANGE_55_64' || ageRange === 'AGE_RANGE_65_UP') {
            ageGroups['55+'] += conversions;
          }
        }
      }
    }

    // Convert to percentages
    if (totalConversions > 0) {
      Object.keys(ageGroups).forEach(key => {
        ageGroups[key as keyof typeof ageGroups] = Math.round(
          (ageGroups[key as keyof typeof ageGroups] / totalConversions) * 100
        );
      });
    }

    debugLogger.info('GoogleAdsService', 'Processed age data', {
      totalConversions,
      ageGroups,
      blocksProcessed: blocks.length
    });

    return ageGroups;
  }

  /**
   * Process age data from CriterionInfo API response (fallback approach)
   */
  private static processAgeDataCriterionInfo(blocks: any[]): { '25-34': number; '35-44': number; '45-54': number; '55+': number } {
    const ageGroups = { '25-34': 0, '35-44': 0, '45-54': 0, '55+': 0 };
    let totalConversions = 0;

    for (const block of blocks) {
      const results = (block as { results?: unknown[] }).results || [];
      for (const result of results) {
        const data = result as any;
        const conversions = parseInt(data.metrics?.conversions || '0');
        totalConversions += conversions;

        // Handle CriterionInfo approach
        const ageRange = data.ad_group_criterion?.age_range?.type;
        if (ageRange) {
          if (ageRange === 'AGE_RANGE_25_34') {
            ageGroups['25-34'] += conversions;
          } else if (ageRange === 'AGE_RANGE_35_44') {
            ageGroups['35-44'] += conversions;
          } else if (ageRange === 'AGE_RANGE_45_54') {
            ageGroups['45-54'] += conversions;
          } else if (ageRange === 'AGE_RANGE_55_64' || ageRange === 'AGE_RANGE_65_UP') {
            ageGroups['55+'] += conversions;
          }
        }
      }
    }

    // Convert to percentages
    if (totalConversions > 0) {
      Object.keys(ageGroups).forEach(key => {
        ageGroups[key as keyof typeof ageGroups] = Math.round(
          (ageGroups[key as keyof typeof ageGroups] / totalConversions) * 100
        );
      });
    }

    debugLogger.info('GoogleAdsService', 'Processed age data (CriterionInfo)', {
      totalConversions,
      ageGroups,
      blocksProcessed: blocks.length
    });

    return ageGroups;
  }

  /**
   * Process campaign breakdown data from API response
   * Based on Google Ads API v22 documentation
   */
  private static processCampaignBreakdownData(blocks: any[]): {
    campaignTypes: {
      search: { conversions: number; impressions: number; conversionRate: number };
      display: { conversions: number; impressions: number; conversionRate: number };
      youtube: { conversions: number; impressions: number; conversionRate: number };
    };
    adFormats: {
      textAds: { conversions: number; impressions: number; conversionRate: number };
      responsiveDisplay: { conversions: number; impressions: number; conversionRate: number };
      videoAds: { conversions: number; impressions: number; conversionRate: number };
    };
  } {
    const campaignTypes = {
      search: { conversions: 0, impressions: 0, clicks: 0, conversionRate: 0 },
      display: { conversions: 0, impressions: 0, clicks: 0, conversionRate: 0 },
      youtube: { conversions: 0, impressions: 0, clicks: 0, conversionRate: 0 }
    };
    const adFormats = {
      textAds: { conversions: 0, impressions: 0, clicks: 0, conversionRate: 0 },
      responsiveDisplay: { conversions: 0, impressions: 0, clicks: 0, conversionRate: 0 },
      videoAds: { conversions: 0, impressions: 0, clicks: 0, conversionRate: 0 }
    };

    // Ad type mapping (v22)
    // Maps Google Ads ad types to our ad format categories
    const adTypeMapping: Record<string, 'textAds' | 'responsiveDisplay' | 'videoAds'> = {
      'RESPONSIVE_SEARCH_AD': 'textAds',
      'EXPANDED_TEXT_AD': 'textAds',
      'TEXT_AD': 'textAds', // Legacy text ads
      'RESPONSIVE_DISPLAY_AD': 'responsiveDisplay',
      'IMAGE_AD': 'responsiveDisplay', // Image ads from Display campaigns
      'VIDEO_RESPONSIVE_AD': 'videoAds',
      'VIDEO_AD': 'videoAds'
    };

    // Debug: Log first result structure to console for browser inspection
    if (blocks.length > 0 && blocks[0]) {
      const firstBlock = blocks[0] as any;
      const firstResults = firstBlock.results || [];
      
      if (firstResults.length > 0) {
        const logData = {
          totalBlocks: blocks.length,
          resultsInFirstBlock: firstResults.length,
          hasCampaign: !!firstResults[0].campaign,
          hasAdGroupAd: !!(firstResults[0].adGroupAd || firstResults[0].ad_group_ad),
          hasMetrics: !!firstResults[0].metrics,
          campaignKeys: firstResults[0].campaign ? Object.keys(firstResults[0].campaign) : [],
          adGroupAdKeys: (firstResults[0].adGroupAd || firstResults[0].ad_group_ad) ? Object.keys(firstResults[0].adGroupAd || firstResults[0].ad_group_ad || {}) : [],
          metricsKeys: firstResults[0].metrics ? Object.keys(firstResults[0].metrics) : [],
          sampleData: JSON.stringify(firstResults[0]).substring(0, 500),
          fullFirstResult: JSON.stringify(firstResults[0], null, 2)
        };
        debugLogger.info('GoogleAdsService', 'Campaign breakdown - First result structure', logData);
      } else {
        debugLogger.warn('GoogleAdsService', 'Campaign breakdown - First block has no results', {
          blockCount: blocks.length,
          firstBlockKeys: Object.keys(firstBlock),
          firstBlockSample: JSON.stringify(firstBlock).substring(0, 500)
        });
      }
    } else {
      debugLogger.warn('GoogleAdsService', 'Campaign breakdown - No blocks received', {
        blockCount: blocks.length
      });
    }

    let processedCount = 0;
    const skippedCount = 0;
    
    for (const block of blocks) {
      const results = (block as { results?: unknown[] }).results || [];
      for (const result of results) {
        const data = result as any;
        const conversions = parseInt(data.metrics?.conversions || '0');
        const impressions = parseInt(data.metrics?.impressions || '0');
        const clicks = parseInt(data.metrics?.clicks || '0');
        
        processedCount++;
        
        // Log first few results for debugging
        if (processedCount <= 3) {
          debugLogger.debug('GoogleAdsService', `Campaign breakdown - Processing result #${processedCount}`, {
            conversions,
            impressions,
            hasCampaign: !!data.campaign,
            hasAdGroupAd: !!(data.adGroupAd || data.ad_group_ad),
            hasAdGroup: !!(data.adGroupAd?.adGroup || data.ad_group_ad?.ad_group),
            rawChannelType: 
              data.adGroupAd?.adGroup?.campaign?.advertisingChannelType ||
              data.adGroupAd?.adGroup?.campaign?.advertising_channel_type ||
              data.ad_group_ad?.ad_group?.campaign?.advertisingChannelType ||
              data.ad_group_ad?.ad_group?.campaign?.advertising_channel_type ||
              data.campaign?.advertisingChannelType ||
              data.campaign?.advertising_channel_type,
            rawAdType: (data.adGroupAd || data.ad_group_ad)?.ad?.type || (data.adGroupAd || data.ad_group_ad)?.ad?.type_,
            fullData: JSON.stringify(data).substring(0, 500)
          });
        }

        // Process campaign types from advertising_channel_type
        // When querying FROM ad_group_ad, the path is: ad_group_ad.ad_group.campaign.advertising_channel_type
        // Handle both camelCase (advertisingChannelType) and snake_case (advertising_channel_type)
        // Also handle both string and enum object formats
        // Try multiple possible paths for compatibility
        let channelType: string | undefined;
        const rawChannelType = 
          data.adGroupAd?.adGroup?.campaign?.advertisingChannelType ||
          data.adGroupAd?.adGroup?.campaign?.advertising_channel_type ||
          data.ad_group_ad?.ad_group?.campaign?.advertisingChannelType ||
          data.ad_group_ad?.ad_group?.campaign?.advertising_channel_type ||
          data.campaign?.advertisingChannelType ||
          data.campaign?.advertising_channel_type;
        
        if (typeof rawChannelType === 'string') {
          channelType = rawChannelType;
        } else if (rawChannelType?.name) {
          channelType = rawChannelType.name;
        } else if (rawChannelType) {
          channelType = String(rawChannelType);
        }

        // Debug log for first few entries
        if (conversions > 0 && !channelType) {
          debugLogger.warn('GoogleAdsService', 'Campaign breakdown - Missing channel type', {
            conversions,
            hasCampaign: !!data.campaign,
            hasAdGroupAd: !!(data.adGroupAd || data.ad_group_ad),
            hasAdGroup: !!(data.adGroupAd?.adGroup || data.ad_group_ad?.ad_group),
            campaignKeys: data.campaign ? Object.keys(data.campaign) : [],
            adGroupAdKeys: (data.adGroupAd || data.ad_group_ad) ? Object.keys(data.adGroupAd || data.ad_group_ad || {}) : [],
            rawChannelType,
            sampleData: JSON.stringify(data).substring(0, 500)
          });
        }

        if (channelType) {
          if (channelType === 'SEARCH' || channelType === 'SEARCH_MOBILE_APP') {
            campaignTypes.search.conversions += conversions;
            campaignTypes.search.impressions += impressions;
            campaignTypes.search.clicks += clicks;
          } else if (channelType === 'DISPLAY' || channelType === 'DISPLAY_MOBILE_APP') {
            campaignTypes.display.conversions += conversions;
            campaignTypes.display.impressions += impressions;
            campaignTypes.display.clicks += clicks;
          } else if (channelType === 'VIDEO' || channelType === 'VIDEO_MOBILE_APP') {
            campaignTypes.youtube.conversions += conversions;
            campaignTypes.youtube.impressions += impressions;
            campaignTypes.youtube.clicks += clicks;
          } else {
            debugLogger.warn('GoogleAdsService', 'Campaign breakdown - Unknown channel type', {
              channelType,
              conversions
            });
          }
        }

        // Process ad formats from ad_group_ad.ad.type
        // Handle both camelCase (adGroupAd) and snake_case (ad_group_ad)
        // Also handle both string and enum object formats
        // Use impressions for ad formats (reach/visibility metric)
        let adType: string | undefined;
        const adGroupAd = data.adGroupAd || data.ad_group_ad;
        const rawAdType = adGroupAd?.ad?.type || adGroupAd?.ad?.type_;
        
        if (typeof rawAdType === 'string') {
          adType = rawAdType;
        } else if (rawAdType?.name) {
          adType = rawAdType.name;
        } else if (rawAdType) {
          adType = String(rawAdType);
        }

        if (adType) {
          const mappedFormat = adTypeMapping[adType];
          if (mappedFormat) {
            adFormats[mappedFormat].conversions += conversions;
            adFormats[mappedFormat].impressions += impressions;
            adFormats[mappedFormat].clicks += clicks;
          } else {
            debugLogger.warn('GoogleAdsService', 'Campaign breakdown - Unknown ad type', {
              adType,
              impressions,
              availableTypes: Object.keys(adTypeMapping)
            });
          }
        }
      }
    }

    // Calculate conversion rates for campaign types
    // Conversion rate = (conversions / clicks) * 100 (Google Ads standard)
    if (campaignTypes.search.clicks > 0) {
      campaignTypes.search.conversionRate = (campaignTypes.search.conversions / campaignTypes.search.clicks) * 100;
    }
    if (campaignTypes.display.clicks > 0) {
      campaignTypes.display.conversionRate = (campaignTypes.display.conversions / campaignTypes.display.clicks) * 100;
    }
    if (campaignTypes.youtube.clicks > 0) {
      campaignTypes.youtube.conversionRate = (campaignTypes.youtube.conversions / campaignTypes.youtube.clicks) * 100;
    }

    // Calculate conversion rates for ad formats
    // Conversion rate = (conversions / clicks) * 100 (Google Ads standard)
    if (adFormats.textAds.clicks > 0) {
      adFormats.textAds.conversionRate = (adFormats.textAds.conversions / adFormats.textAds.clicks) * 100;
    }
    if (adFormats.responsiveDisplay.clicks > 0) {
      adFormats.responsiveDisplay.conversionRate = (adFormats.responsiveDisplay.conversions / adFormats.responsiveDisplay.clicks) * 100;
    }
    if (adFormats.videoAds.clicks > 0) {
      adFormats.videoAds.conversionRate = (adFormats.videoAds.conversions / adFormats.videoAds.clicks) * 100;
    }

    const finalData = {
      campaignTypes,
      adFormats,
      blocksProcessed: blocks.length,
      totalResults: blocks.reduce((sum, block) => sum + ((block as { results?: unknown[] }).results || []).length, 0),
      processedCount,
      skippedCount
    };
    
    debugLogger.info('GoogleAdsService', 'Processed campaign breakdown data', finalData);

    // Warn if no data was processed
    if (processedCount === 0) {
      debugLogger.warn('GoogleAdsService', 'Campaign breakdown - No results processed from API response', {
        blockCount: blocks.length,
        totalResults: finalData.totalResults,
        firstBlockSample: blocks.length > 0 ? JSON.stringify(blocks[0]).substring(0, 500) : 'No blocks'
      });
    }

    // Remove clicks from return (only used for calculation)
    const returnCampaignTypes = {
      search: { conversions: campaignTypes.search.conversions, impressions: campaignTypes.search.impressions, conversionRate: campaignTypes.search.conversionRate },
      display: { conversions: campaignTypes.display.conversions, impressions: campaignTypes.display.impressions, conversionRate: campaignTypes.display.conversionRate },
      youtube: { conversions: campaignTypes.youtube.conversions, impressions: campaignTypes.youtube.impressions, conversionRate: campaignTypes.youtube.conversionRate }
    };
    const returnAdFormats = {
      textAds: { conversions: adFormats.textAds.conversions, impressions: adFormats.textAds.impressions, conversionRate: adFormats.textAds.conversionRate },
      responsiveDisplay: { conversions: adFormats.responsiveDisplay.conversions, impressions: adFormats.responsiveDisplay.impressions, conversionRate: adFormats.responsiveDisplay.conversionRate },
      videoAds: { conversions: adFormats.videoAds.conversions, impressions: adFormats.videoAds.impressions, conversionRate: adFormats.videoAds.conversionRate }
    };
    
    return { campaignTypes: returnCampaignTypes, adFormats: returnAdFormats };
  }

  /**
   * Process campaign breakdown data from separate queries
   * Combines data from:
   * - campaign (campaign types)
   * - ad_group_ad (Search ad formats)
   * - asset_group (Performance Max ad formats)
   */
  private static processCampaignBreakdownDataSeparate(
    campaignBlocks: any[],
    searchAdFormatBlocks: any[],
    performanceMaxAdFormatBlocks: any[] = []
  ): {
    campaignTypes: {
      search: { conversions: number; impressions: number; conversionRate: number; cost: number; costPerLead: number };
      display: { conversions: number; impressions: number; conversionRate: number; cost: number; costPerLead: number };
      youtube: { conversions: number; impressions: number; conversionRate: number; cost: number; costPerLead: number };
      performanceMax: { conversions: number; impressions: number; conversionRate: number; cost: number; costPerLead: number };
    };
    adFormats: {
      textAds: { conversions: number; impressions: number; conversionRate: number };
      responsiveDisplay: { conversions: number; impressions: number; conversionRate: number };
      videoAds: { conversions: number; impressions: number; conversionRate: number };
      assetTypes: Record<string, { conversions: number; impressions: number; conversionRate: number }>;
      networkBreakdown: Record<string, { conversions: number; impressions: number; conversionRate: number }>;
      individualAssets: Record<string, { name: string; type: string; conversions: number; impressions: number; conversionRate: number }>;
      assetTypeNetworkCombos: Record<string, { conversions: number; impressions: number; conversionRate: number }>;
    };
  } {
    const campaignTypes = {
      search: { conversions: 0, impressions: 0, clicks: 0, cost: 0, conversionRate: 0, costPerLead: 0 },
      display: { conversions: 0, impressions: 0, clicks: 0, cost: 0, conversionRate: 0, costPerLead: 0 },
      youtube: { conversions: 0, impressions: 0, clicks: 0, cost: 0, conversionRate: 0, costPerLead: 0 },
      performanceMax: { conversions: 0, impressions: 0, clicks: 0, cost: 0, conversionRate: 0, costPerLead: 0 }
    };
    const adFormats = {
      textAds: { conversions: 0, impressions: 0, clicks: 0, conversionRate: 0 },
      responsiveDisplay: { conversions: 0, impressions: 0, clicks: 0, conversionRate: 0 },
      videoAds: { conversions: 0, impressions: 0, clicks: 0, conversionRate: 0 }
    };
    
    // Track actual asset types from Performance Max (raw API output)
    // This will contain the actual asset.type values from the API (TEXT, IMAGE, VIDEO, etc.)
    const assetTypes: Record<string, { conversions: number; impressions: number; clicks: number; conversionRate: number }> = {};
    
    // Track network breakdown for Performance Max assets (SEARCH, YOUTUBE, DISPLAY, etc.)
    // This shows which networks each asset type is performing on
    const networkBreakdown: Record<string, { conversions: number; impressions: number; clicks: number; conversionRate: number }> = {};
    
    // Track individual assets (asset vs asset comparison)
    // Key: assetId, Value: { name, type, conversions, impressions, clicks, conversionRate }
    const individualAssets: Record<string, { name: string; type: string; conversions: number; impressions: number; clicks: number; conversionRate: number }> = {};
    
    // Track asset type × network combinations (e.g., IMAGE on DISCOVER vs IMAGE on DISPLAY)
    // Key: assetType_network (e.g., "IMAGE_DISCOVER"), Value: { conversions, impressions, clicks, conversionRate }
    const assetTypeNetworkCombos: Record<string, { conversions: number; impressions: number; clicks: number; conversionRate: number }> = {};

    // Ad type mapping (v22)
    // Maps Google Ads ad types to our ad format categories
    const adTypeMapping: Record<string, 'textAds' | 'responsiveDisplay' | 'videoAds'> = {
      'RESPONSIVE_SEARCH_AD': 'textAds',
      'EXPANDED_TEXT_AD': 'textAds',
      'TEXT_AD': 'textAds', // Legacy text ads
      'RESPONSIVE_DISPLAY_AD': 'responsiveDisplay',
      'IMAGE_AD': 'responsiveDisplay', // Image ads from Display campaigns
      'VIDEO_RESPONSIVE_AD': 'videoAds',
      'VIDEO_AD': 'videoAds'
    };

    // Process campaign types from campaign blocks
    for (const block of campaignBlocks) {
      const results = (block as { results?: unknown[] }).results || [];
      for (const result of results) {
        const data = result as any;
        const conversions = parseInt(data.metrics?.conversions || '0');
        const impressions = parseInt(data.metrics?.impressions || '0');
        const clicks = parseInt(data.metrics?.clicks || '0');
        const costMicros = parseFloat(data.metrics?.costMicros || data.metrics?.cost_micros || '0');
        const cost = costMicros / 1e6; // Convert micros to dollars
        
        let channelType: string | undefined;
        // API returns advertisingChannelType in camelCase (e.g., "PERFORMANCE_MAX")
        // Handle both camelCase and snake_case field names
        const rawChannelType = data.campaign?.advertisingChannelType || 
                               data.campaign?.advertising_channel_type ||
                               data.campaign?.advertisingChannelType?.name ||
                               data.campaign?.advertising_channel_type?.name;
        
        if (typeof rawChannelType === 'string') {
          channelType = rawChannelType;
        } else if (rawChannelType?.name) {
          channelType = rawChannelType.name;
        } else if (rawChannelType) {
          channelType = String(rawChannelType);
        }
        
        // Debug log to verify we're reading the channel type correctly
        if (conversions > 0 || impressions > 0) {
          debugLogger.debug('GoogleAdsService', 'Processing campaign type', {
            rawChannelType,
            channelType,
            conversions,
            impressions,
            campaignId: data.campaign?.id,
            campaignName: data.campaign?.name,
            fullCampaignData: JSON.stringify(data.campaign)
          });
          
        }

        if (channelType) {
          // Map Google Ads API channel types to our categories
          // IMPORTANT: Check PERFORMANCE_MAX FIRST before other types
          if (channelType === 'PERFORMANCE_MAX') {
            // Performance Max campaigns are their own category
            campaignTypes.performanceMax.conversions += conversions;
            campaignTypes.performanceMax.impressions += impressions;
            campaignTypes.performanceMax.clicks += clicks;
            campaignTypes.performanceMax.cost += cost;
          } else if (channelType === 'SEARCH' || channelType === 'SEARCH_MOBILE_APP') {
            campaignTypes.search.conversions += conversions;
            campaignTypes.search.impressions += impressions;
            campaignTypes.search.clicks += clicks;
            campaignTypes.search.cost += cost;
          } else if (channelType === 'DISPLAY' || channelType === 'DISPLAY_MOBILE_APP') {
            campaignTypes.display.conversions += conversions;
            campaignTypes.display.impressions += impressions;
            campaignTypes.display.clicks += clicks;
            campaignTypes.display.cost += cost;
          } else if (channelType === 'VIDEO' || channelType === 'VIDEO_MOBILE_APP') {
            campaignTypes.youtube.conversions += conversions;
            campaignTypes.youtube.impressions += impressions;
            campaignTypes.youtube.clicks += clicks;
            campaignTypes.youtube.cost += cost;
          } else {
            console.warn('⚠️ Unmapped channel type:', { channelType, conversions, impressions });
            debugLogger.debug('GoogleAdsService', 'Campaign breakdown - Unmapped channel type', {
              channelType,
              conversions,
              impressions
            });
          }
        } else {
          console.warn('⚠️ No channel type found for campaign:', {
            conversions,
            impressions,
            campaignId: data.campaign?.id,
            campaignData: data.campaign
          });
        }
      }
    }

    // Process ad formats from Search campaigns (ad_group_ad resource)
    // This gets traditional ad formats like RESPONSIVE_SEARCH_AD, EXPANDED_TEXT_AD, etc.
    for (const block of searchAdFormatBlocks) {
      const results = (block as { results?: unknown[] }).results || [];
      for (const result of results) {
        const data = result as any;
        const conversions = parseInt(data.metrics?.conversions || '0');
        const impressions = parseInt(data.metrics?.impressions || '0');
        const clicks = parseInt(data.metrics?.clicks || '0');
        
        let adType: string | undefined;
        const adGroupAd = data.adGroupAd || data.ad_group_ad;
        const rawAdType = adGroupAd?.ad?.type || adGroupAd?.ad?.type_;
        
        if (typeof rawAdType === 'string') {
          adType = rawAdType;
        } else if (rawAdType?.name) {
          adType = rawAdType.name;
        } else if (rawAdType) {
          adType = String(rawAdType);
        }

        if (adType) {
          const mappedFormat = adTypeMapping[adType];
          if (mappedFormat) {
            adFormats[mappedFormat].conversions += conversions;
            adFormats[mappedFormat].impressions += impressions;
            adFormats[mappedFormat].clicks += clicks;
            debugLogger.debug('GoogleAdsService', 'Processed Search ad format', {
              adType,
              mappedFormat,
              conversions,
              impressions,
              clicks
            });
          } else {
            // Log unmapped ad types to help identify missing mappings
            if (conversions > 0 || impressions > 0) {
              console.warn(`⚠️ Unmapped Search ad type: ${adType} (${conversions} conversions, ${impressions} impressions)`);
              debugLogger.debug('GoogleAdsService', 'Campaign breakdown - Unmapped Search ad type', {
                adType,
                conversions,
                impressions,
                availableTypes: Object.keys(adTypeMapping)
              });
            }
          }
        }
      }
    }

    // Process Performance Max asset-level data
    // IMPORTANT: This query ONLY gets data from PERFORMANCE_MAX campaigns (filter: campaign.advertising_channel_type = 'PERFORMANCE_MAX')
    // CRITICAL: This data is "non-summable" - multiple assets in same ad will inflate totals
    // Use asset.type to categorize ad formats (TEXT, IMAGE, YOUTUBE_VIDEO)
    // Use segments.ad_network_type for channel insights (SEARCH, YOUTUBE, DISPLAY)
    // 
    // Key Understanding:
    // - Query returns one row per asset per asset_group per ad_network_type per day
    // - Same asset can appear in multiple asset groups → multiple rows
    // - Same asset can serve on multiple networks → multiple rows (with segments.ad_network_type)
    // - Multiple assets in same ad → metrics are attributed to each asset (non-summable)
    //
    // For ad formats breakdown:
    // - We aggregate by asset.type (TEXT, IMAGE, VIDEO) across all networks
    // - We sum metrics for each asset.type category
    // - Note: Totals will be higher than campaign-level metrics (expected, due to non-summable nature)
    console.log('📊 Processing Performance Max Asset Groups - Total blocks:', performanceMaxAdFormatBlocks.length);
    
    // Deduplication map: key = assetId_date_adNetwork, value = { conversions, impressions, clicks, assetType, adNetworkType, assetName }
    // We deduplicate by asset+date+network to avoid counting same asset+network+date multiple times
    // But we still sum across different networks (SEARCH, YOUTUBE, DISPLAY) for the same asset
    const assetDedupeMap = new Map<string, { conversions: number; impressions: number; clicks: number; assetType: string; adNetworkType: string; assetName: string; assetId: string }>();
    
    let processedPmaxRows = 0;
    for (const block of performanceMaxAdFormatBlocks) {
      const results = (block as { results?: unknown[] }).results || [];
      console.log('  Performance Max Asset Group Block has', results.length, 'results');
      for (const result of results) {
        processedPmaxRows++;
        const data = result as any;
        const assetId = data.asset?.id || data.asset?.id_ || '';
        const date = data.segments?.date || '';
        const adNetworkType = data.segments?.adNetworkType || data.segments?.ad_network_type || 'UNKNOWN';
        const conversions = parseInt(data.metrics?.conversions || '0');
        const impressions = parseInt(data.metrics?.impressions || '0');
        const clicks = parseInt(data.metrics?.clicks || '0');
        
        // Get asset type (TEXT, IMAGE, VIDEO, etc.) - this determines the ad format
        const assetType = data.asset?.type || 
                         data.asset?.type_ ||
                         data.asset?.type?.name ||
                         data.asset?.type_?.name;
        
        // Get asset name for individual asset tracking
        const assetName = data.asset?.name || data.asset?.name_ || `Asset ${assetId}` || 'Unknown Asset';
        
        // Create unique key for deduplication: assetId_date_adNetwork
        // This ensures we don't double-count the same asset on the same network on the same day
        // But we DO sum across different networks (which is correct - asset can serve on multiple networks)
        if (assetId && date) {
          const dedupeKey = `${assetId}_${date}_${adNetworkType}`;
          const existing = assetDedupeMap.get(dedupeKey);
          if (existing) {
            // If we already have this asset+date+network combo, take the max (safest for duplicates)
            // This handles cases where API might return duplicate rows for same asset+date+network
            existing.conversions = Math.max(existing.conversions, conversions);
            existing.impressions = Math.max(existing.impressions, impressions);
            existing.clicks = Math.max(existing.clicks, clicks);
          } else {
            assetDedupeMap.set(dedupeKey, { conversions, impressions, clicks, assetType: assetType || '', adNetworkType, assetName, assetId });
          }
        } else {
          // If we don't have assetId or date, we can't deduplicate properly
          // Log a warning but still process it (fallback to old behavior)
          if (processedPmaxRows <= 10) {
            console.warn(`⚠️ Performance Max row missing assetId or date:`, { assetId, date, adNetworkType, conversions, impressions });
          }
        }
        
        // Debug first few rows (before deduplication)
        if (processedPmaxRows <= 5) {
          console.log(`  Performance Max Row ${processedPmaxRows} (before dedupe):`, {
            assetType,
            assetId,
            date,
            adNetworkType,
            asset: data.asset ? {
              type: data.asset.type || data.asset.type_,
              id: data.asset.id,
              name: data.asset.name
            } : 'NO ASSET',
            conversions,
            impressions,
            clicks
          });
        }
      }
    }
    
    // Now process deduplicated assets and aggregate by asset.type and network
    console.log(`✅ Deduplicated ${assetDedupeMap.size} unique asset+date+network combinations from ${processedPmaxRows} total rows`);
    let dedupeCount = 0;
    for (const [dedupeKey, assetData] of assetDedupeMap.entries()) {
      dedupeCount++;
      const { conversions, impressions, clicks, assetType, adNetworkType, assetName, assetId } = assetData;
      
      // Track network breakdown (SEARCH, YOUTUBE, DISPLAY, etc.)
      // Normalize network type names
      const normalizedNetwork = adNetworkType === 'SEARCH' || adNetworkType === 'GOOGLE_SEARCH' ? 'SEARCH' :
                                adNetworkType === 'YOUTUBE' || adNetworkType === 'YOUTUBE_SEARCH' ? 'YOUTUBE' :
                                adNetworkType === 'DISPLAY' || adNetworkType === 'GOOGLE_DISPLAY' ? 'DISPLAY' :
                                adNetworkType === 'DISCOVER' ? 'DISCOVER' :
                                adNetworkType === 'GMAIL' ? 'GMAIL' :
                                adNetworkType === 'MIXED' ? 'MIXED' :
                                adNetworkType || 'OTHER';
      
      if (!networkBreakdown[normalizedNetwork]) {
        networkBreakdown[normalizedNetwork] = { conversions: 0, impressions: 0, clicks: 0, conversionRate: 0 };
      }
      networkBreakdown[normalizedNetwork].conversions += conversions;
      networkBreakdown[normalizedNetwork].impressions += impressions;
      networkBreakdown[normalizedNetwork].clicks += clicks;
      
      // Debug first few deduplicated rows
      if (dedupeCount <= 5) {
        console.log(`  Deduplicated Row ${dedupeCount}:`, {
          key: dedupeKey,
          assetType,
          conversions,
          impressions,
          clicks
        });
      }
      
      // Track actual asset type (raw API output)
      if (assetType) {
        if (!assetTypes[assetType]) {
          assetTypes[assetType] = { conversions: 0, impressions: 0, clicks: 0, conversionRate: 0 };
        }
        assetTypes[assetType].conversions += conversions;
        assetTypes[assetType].impressions += impressions;
        assetTypes[assetType].clicks += clicks;
      }
      
      // Track individual assets (asset vs asset comparison)
      if (assetId) {
        if (!individualAssets[assetId]) {
          individualAssets[assetId] = { 
            name: assetName, 
            type: assetType || '', 
            conversions: 0, 
            impressions: 0, 
            clicks: 0, 
            conversionRate: 0 
          };
        }
        individualAssets[assetId].conversions += conversions;
        individualAssets[assetId].impressions += impressions;
        individualAssets[assetId].clicks += clicks;
      }
      
      // Track asset type × network combinations (e.g., IMAGE on DISCOVER vs IMAGE on DISPLAY)
      if (assetType && normalizedNetwork) {
        const comboKey = `${assetType}_${normalizedNetwork}`;
        if (!assetTypeNetworkCombos[comboKey]) {
          assetTypeNetworkCombos[comboKey] = { conversions: 0, impressions: 0, clicks: 0, conversionRate: 0 };
        }
        assetTypeNetworkCombos[comboKey].conversions += conversions;
        assetTypeNetworkCombos[comboKey].impressions += impressions;
        assetTypeNetworkCombos[comboKey].clicks += clicks;
      }
      
      // Map Performance Max assets to adFormats categories
      // Per Google Ads API official documentation:
      // - TEXT → textAds (headlines/descriptions)
      // - IMAGE → responsiveDisplay (image/display ads)
      // - YOUTUBE_VIDEO → videoAds (video ads)
      // Official docs: https://developers.google.com/google-ads/api/fields/v22/asset_group_asset
      // AssetType enum: https://developers.google.com/google-ads/api/reference/rpc/v22/AssetTypeEnum
      // 
      // ⚠️ CRITICAL: These metrics are NON-SUMMABLE per Google's official warning:
      // "the sum of individual asset impressions, clicks, or costs may not directly match 
      // the corresponding metrics... at the asset group level"
      // Source: https://support.google.com/google-ads/answer/13197517
      // 
      // Expected behavior: Ad formats totals will be higher than campaign-level metrics
      // This is expected and acceptable - use for directional insights and relative comparisons
      if (assetType === 'TEXT') {
        adFormats.textAds.conversions += conversions;
        adFormats.textAds.impressions += impressions;
        adFormats.textAds.clicks += clicks;
      } else if (assetType === 'IMAGE' || assetType === 'MEDIA_BUNDLE') {
        adFormats.responsiveDisplay.conversions += conversions;
        adFormats.responsiveDisplay.impressions += impressions;
        adFormats.responsiveDisplay.clicks += clicks;
      } else if (assetType === 'YOUTUBE_VIDEO') {
        adFormats.videoAds.conversions += conversions;
        adFormats.videoAds.impressions += impressions;
        adFormats.videoAds.clicks += clicks;
      }
    }
    console.log('✅ Processed Performance Max assets:', {
      totalRows: processedPmaxRows,
      uniqueAssetDateNetworkCombos: assetDedupeMap.size,
      assetTypes: Object.keys(assetTypes).map(type => ({
        type,
        conversions: assetTypes[type].conversions,
        impressions: assetTypes[type].impressions
      })),
      networks: Object.keys(networkBreakdown).map(network => ({
        network,
        conversions: networkBreakdown[network].conversions,
        impressions: networkBreakdown[network].impressions
      })),
      note: 'Performance Max assets are mapped to adFormats (TEXT→textAds, IMAGE→responsiveDisplay, YOUTUBE_VIDEO→videoAds). Totals may be inflated due to non-summable nature - this is expected.'
    });

    // Calculate conversion rates and cost per lead for campaign types
    // Conversion rate = (conversions / clicks) * 100 (Google Ads standard)
    // Cost per lead = cost / conversions
    if (campaignTypes.search.clicks > 0) {
      campaignTypes.search.conversionRate = (campaignTypes.search.conversions / campaignTypes.search.clicks) * 100;
    }
    if (campaignTypes.search.conversions > 0) {
      campaignTypes.search.costPerLead = campaignTypes.search.cost / campaignTypes.search.conversions;
    }
    
    if (campaignTypes.display.clicks > 0) {
      campaignTypes.display.conversionRate = (campaignTypes.display.conversions / campaignTypes.display.clicks) * 100;
    }
    if (campaignTypes.display.conversions > 0) {
      campaignTypes.display.costPerLead = campaignTypes.display.cost / campaignTypes.display.conversions;
    }
    
    if (campaignTypes.youtube.clicks > 0) {
      campaignTypes.youtube.conversionRate = (campaignTypes.youtube.conversions / campaignTypes.youtube.clicks) * 100;
    }
    if (campaignTypes.youtube.conversions > 0) {
      campaignTypes.youtube.costPerLead = campaignTypes.youtube.cost / campaignTypes.youtube.conversions;
    }
    
    if (campaignTypes.performanceMax.clicks > 0) {
      campaignTypes.performanceMax.conversionRate = (campaignTypes.performanceMax.conversions / campaignTypes.performanceMax.clicks) * 100;
    }
    if (campaignTypes.performanceMax.conversions > 0) {
      campaignTypes.performanceMax.costPerLead = campaignTypes.performanceMax.cost / campaignTypes.performanceMax.conversions;
    }

    // Calculate conversion rates for ad formats
    // Conversion rate = (conversions / clicks) * 100 (Google Ads standard)
    if (adFormats.textAds.clicks > 0) {
      adFormats.textAds.conversionRate = (adFormats.textAds.conversions / adFormats.textAds.clicks) * 100;
    }
    if (adFormats.responsiveDisplay.clicks > 0) {
      adFormats.responsiveDisplay.conversionRate = (adFormats.responsiveDisplay.conversions / adFormats.responsiveDisplay.clicks) * 100;
    }
    if (adFormats.videoAds.clicks > 0) {
      adFormats.videoAds.conversionRate = (adFormats.videoAds.conversions / adFormats.videoAds.clicks) * 100;
    }
    
    // Calculate conversion rates for actual asset types
    Object.keys(assetTypes).forEach(assetType => {
      if (assetTypes[assetType].clicks > 0) {
        assetTypes[assetType].conversionRate = (assetTypes[assetType].conversions / assetTypes[assetType].clicks) * 100;
      }
    });
    
    // Calculate conversion rates for network breakdown
    Object.keys(networkBreakdown).forEach(network => {
      if (networkBreakdown[network].clicks > 0) {
        networkBreakdown[network].conversionRate = (networkBreakdown[network].conversions / networkBreakdown[network].clicks) * 100;
      }
    });
    
    // Calculate conversion rates for individual assets
    Object.keys(individualAssets).forEach(assetId => {
      if (individualAssets[assetId].clicks > 0) {
        individualAssets[assetId].conversionRate = (individualAssets[assetId].conversions / individualAssets[assetId].clicks) * 100;
      }
    });
    
    // Calculate conversion rates for asset type × network combinations
    Object.keys(assetTypeNetworkCombos).forEach(comboKey => {
      if (assetTypeNetworkCombos[comboKey].clicks > 0) {
        assetTypeNetworkCombos[comboKey].conversionRate = (assetTypeNetworkCombos[comboKey].conversions / assetTypeNetworkCombos[comboKey].clicks) * 100;
      }
    });

    // Log warning if no ad format data (common for Performance Max campaigns)
    // Note: Performance Max campaigns don't use traditional ad formats, so this is expected
    const hasAdFormatData = adFormats.textAds.impressions > 0 || 
                            adFormats.responsiveDisplay.impressions > 0 || 
                            adFormats.videoAds.impressions > 0;
    
    if (!hasAdFormatData && campaignBlocks.length > 0) {
      debugLogger.info('GoogleAdsService', 'No ad format data found - account may only have Performance Max campaigns', {
        campaignBlocksProcessed: campaignBlocks.length,
        searchAdFormatBlocksProcessed: searchAdFormatBlocks.length,
        campaignTypes: Object.keys(campaignTypes).map(key => ({
          type: key,
          impressions: campaignTypes[key as keyof typeof campaignTypes].impressions
        }))
      });
    }

    debugLogger.info('GoogleAdsService', 'Processed campaign breakdown data (separate queries)', {
      campaignTypes,
      adFormats,
      campaignBlocksProcessed: campaignBlocks.length,
      searchAdFormatBlocksProcessed: searchAdFormatBlocks.length,
      hasAdFormatData,
      note: 'Performance Max query removed - PMax returns ad_network_type="MIXED" which cannot be broken down into ad formats'
    });

    console.log('\n' + '='.repeat(80));
    console.log('📈 FINAL AGGREGATED DATA (for browser debugging)');
    console.log('='.repeat(80));
    
    console.log('\n📊 Campaign Types:');
    console.log(`   Search: ${campaignTypes.search.conversions} conversions, ${campaignTypes.search.impressions.toLocaleString()} impressions, $${campaignTypes.search.cost.toFixed(2)}, ${campaignTypes.search.conversionRate.toFixed(2)}% conv rate`);
    console.log(`   Display: ${campaignTypes.display.conversions} conversions, ${campaignTypes.display.impressions.toLocaleString()} impressions, $${campaignTypes.display.cost.toFixed(2)}, ${campaignTypes.display.conversionRate.toFixed(2)}% conv rate`);
    console.log(`   YouTube: ${campaignTypes.youtube.conversions} conversions, ${campaignTypes.youtube.impressions.toLocaleString()} impressions, $${campaignTypes.youtube.cost.toFixed(2)}, ${campaignTypes.youtube.conversionRate.toFixed(2)}% conv rate`);
    console.log(`   Performance Max: ${campaignTypes.performanceMax.conversions} conversions, ${campaignTypes.performanceMax.impressions.toLocaleString()} impressions, $${campaignTypes.performanceMax.cost.toFixed(2)}, ${campaignTypes.performanceMax.conversionRate.toFixed(2)}% conv rate, $${campaignTypes.performanceMax.costPerLead.toFixed(2)} CPL`);
    
    console.log('\n🎨 Ad Formats (Mapped Categories):');
    console.log(`   Text Ads: ${adFormats.textAds.conversions} conversions, ${adFormats.textAds.impressions.toLocaleString()} impressions, ${adFormats.textAds.conversionRate.toFixed(2)}% conv rate`);
    console.log(`   Responsive Display: ${adFormats.responsiveDisplay.conversions} conversions, ${adFormats.responsiveDisplay.impressions.toLocaleString()} impressions, ${adFormats.responsiveDisplay.conversionRate.toFixed(2)}% conv rate`);
    console.log(`   Video Ads: ${adFormats.videoAds.conversions} conversions, ${adFormats.videoAds.impressions.toLocaleString()} impressions, ${adFormats.videoAds.conversionRate.toFixed(2)}% conv rate`);
    
    console.log('\n🔧 Ad Formats (Actual Asset Types from Performance Max):');
    const assetTypeKeys = Object.keys(assetTypes);
    if (assetTypeKeys.length > 0) {
      for (const assetType of assetTypeKeys) {
        const data = assetTypes[assetType];
        console.log(`   ${assetType}: ${data.conversions} conversions, ${data.impressions.toLocaleString()} impressions, ${data.clicks.toLocaleString()} clicks, ${data.conversionRate.toFixed(2)}% conv rate`);
      }
    } else {
      console.log('   (No asset types found)');
    }
    
    console.log('='.repeat(80));
    
    // Remove clicks and cost from return (only used for calculation)
    const returnCampaignTypes = {
      search: { 
        conversions: campaignTypes.search.conversions, 
        impressions: campaignTypes.search.impressions, 
        conversionRate: campaignTypes.search.conversionRate,
        cost: campaignTypes.search.cost,
        costPerLead: campaignTypes.search.costPerLead
      },
      display: { 
        conversions: campaignTypes.display.conversions, 
        impressions: campaignTypes.display.impressions, 
        conversionRate: campaignTypes.display.conversionRate,
        cost: campaignTypes.display.cost,
        costPerLead: campaignTypes.display.costPerLead
      },
      youtube: { 
        conversions: campaignTypes.youtube.conversions, 
        impressions: campaignTypes.youtube.impressions, 
        conversionRate: campaignTypes.youtube.conversionRate,
        cost: campaignTypes.youtube.cost,
        costPerLead: campaignTypes.youtube.costPerLead
      },
      performanceMax: { 
        conversions: campaignTypes.performanceMax.conversions, 
        impressions: campaignTypes.performanceMax.impressions, 
        conversionRate: campaignTypes.performanceMax.conversionRate,
        cost: campaignTypes.performanceMax.cost,
        costPerLead: campaignTypes.performanceMax.costPerLead
      }
    };
    const returnAdFormats = {
      textAds: { conversions: adFormats.textAds.conversions, impressions: adFormats.textAds.impressions, conversionRate: adFormats.textAds.conversionRate },
      responsiveDisplay: { conversions: adFormats.responsiveDisplay.conversions, impressions: adFormats.responsiveDisplay.impressions, conversionRate: adFormats.responsiveDisplay.conversionRate },
      videoAds: { conversions: adFormats.videoAds.conversions, impressions: adFormats.videoAds.impressions, conversionRate: adFormats.videoAds.conversionRate },
      // Return actual asset types from Performance Max (raw API output)
      assetTypes: Object.keys(assetTypes).reduce((acc, key) => {
        acc[key] = {
          conversions: assetTypes[key].conversions,
          impressions: assetTypes[key].impressions,
          conversionRate: assetTypes[key].conversionRate
        };
        return acc;
      }, {} as Record<string, { conversions: number; impressions: number; conversionRate: number }>),
      // Return network breakdown for Performance Max assets
      networkBreakdown: Object.keys(networkBreakdown).reduce((acc, key) => {
        acc[key] = {
          conversions: networkBreakdown[key].conversions,
          impressions: networkBreakdown[key].impressions,
          conversionRate: networkBreakdown[key].conversionRate
        };
        return acc;
      }, {} as Record<string, { conversions: number; impressions: number; conversionRate: number }>),
      // Return individual assets for asset vs asset comparison
      individualAssets: Object.keys(individualAssets).reduce((acc, key) => {
        acc[key] = {
          name: individualAssets[key].name,
          type: individualAssets[key].type,
          conversions: individualAssets[key].conversions,
          impressions: individualAssets[key].impressions,
          conversionRate: individualAssets[key].conversionRate
        };
        return acc;
      }, {} as Record<string, { name: string; type: string; conversions: number; impressions: number; conversionRate: number }>),
      // Return asset type × network combinations (e.g., IMAGE on DISCOVER vs IMAGE on DISPLAY)
      assetTypeNetworkCombos: Object.keys(assetTypeNetworkCombos).reduce((acc, key) => {
        acc[key] = {
          conversions: assetTypeNetworkCombos[key].conversions,
          impressions: assetTypeNetworkCombos[key].impressions,
          conversionRate: assetTypeNetworkCombos[key].conversionRate
        };
        return acc;
      }, {} as Record<string, { conversions: number; impressions: number; conversionRate: number }>)
    };
    
    console.log('✅ Returning final data (without clicks):', JSON.stringify({ campaignTypes: returnCampaignTypes, adFormats: returnAdFormats }, null, 2));
    console.log('📊 Actual Asset Types from API:', Object.keys(assetTypes).map(type => ({
      type,
      conversions: assetTypes[type].conversions,
      impressions: assetTypes[type].impressions
    })));
    
    return { campaignTypes: returnCampaignTypes, adFormats: returnAdFormats };
  }

}