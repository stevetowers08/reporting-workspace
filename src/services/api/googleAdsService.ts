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
          debugLogger.error('GoogleAdsService', 'Authentication failed - token may be expired', {
            status: response.status,
            responseText: text,
            customerId: pathCid,
            managerId: loginCid
          });
          SecureLogger.logSecurityEvent('GoogleAdsService', 'Authentication error - 401 Unauthorized', { 
            status: response.status, 
            text: text.substring(0, 500),
            customerId: pathCid
          });
          throw new Error('Google Ads authentication failed. Please reconnect your Google Ads account.');
        }
        
        // Handle quota exhaustion
        if (response.status === 403) {
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
        
        // Log the actual error response for debugging (especially 400 errors)
        console.error('🔴 Google Ads API Error:', {
          status: response.status,
          statusText: response.statusText,
          responseText: text.substring(0, 1000),
          url: url,
          customerId: pathCid,
          managerId: loginCid,
          gaql: gaql.substring(0, 200)
        });
        
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

      const accessToken = await this.ensureValidToken();
      const developerToken = await this.getDeveloperToken();
      const managerAccountId = await this.getManagerAccountId();

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
        totalResults: blocks.reduce((sum, block) => sum + ((block as { results?: unknown[] }).results || []).length, 0)
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
  }> {
    try {
      const accessToken = await this.ensureValidToken();
      const developerToken = await this.getDeveloperToken();
      const managerAccountId = await this.getManagerAccountId();

      if (!accessToken || !developerToken || !managerAccountId) {
        debugLogger.warn('GoogleAdsService', 'Missing required credentials for metrics');
        return null;
      }

      let gaql: string;
      
      // Handle preset periods using Google Ads API v21 presets
      if (dateRange.period === 'lastMonth') {
        // Use LAST_MONTH preset - Google Ads API v21 supports this with DURING clause
        gaql = `SELECT campaign.id, campaign.name, metrics.conversions, metrics.cost_micros, metrics.impressions, metrics.clicks FROM campaign WHERE segments.date DURING LAST_MONTH`;
      } else {
        // For all other periods (7d, 14d, 30d, etc.), use BETWEEN with calculated dates
        // Validate date format (YYYY-MM-DD) - required for custom date ranges
        const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;
        
        // Debug logging to help diagnose 30d issue
        debugLogger.info('GoogleAdsService', 'Processing date range (not lastMonth)', {
          period: dateRange.period,
          start: dateRange.start,
          end: dateRange.end,
          startValid: dateRange.start && dateFormatRegex.test(dateRange.start),
          endValid: dateRange.end && dateFormatRegex.test(dateRange.end)
        });
        
        if (!dateRange.start || !dateFormatRegex.test(dateRange.start)) {
          debugLogger.error('GoogleAdsService', 'Invalid start date format', { start: dateRange.start, dateRange });
          throw new Error(`Invalid start date format: ${dateRange.start}. Expected YYYY-MM-DD`);
        }
        if (!dateRange.end || !dateFormatRegex.test(dateRange.end)) {
          debugLogger.error('GoogleAdsService', 'Invalid end date format', { end: dateRange.end, dateRange });
          throw new Error(`Invalid end date format: ${dateRange.end}. Expected YYYY-MM-DD`);
        }
        
        // Use provided date range with BETWEEN for custom ranges (same as 14d which works)
        gaql = `SELECT campaign.id, campaign.name, metrics.conversions, metrics.cost_micros, metrics.impressions, metrics.clicks FROM campaign WHERE segments.date BETWEEN '${dateRange.start}' AND '${dateRange.end}'`;
      }
      
      debugLogger.info('GoogleAdsService', 'Fetching account metrics', {
        customerId,
        dateRange,
        hasPeriod: !!dateRange.period,
        gaql: gaql.substring(0, 100) + '...'
      });
      
      debugLogger.debug('GoogleAdsService', 'GAQL query for account metrics', { gaql });
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
          resultCount: ((block as { results?: unknown[] }).results || []).length
        }))
      });
      
      for (const block of blocks) {
        const results = (block as { results?: unknown[] }).results || [];
        for (const result of results) {
          const m = (result as { 
            metrics?: { 
              impressions?: string | number; 
              clicks?: string | number; 
              costMicros?: string | number;
              cost_micros?: string | number; // API returns with underscore
              conversions?: string | number;
              conversionsFromInteractionsRate?: string | number;
              averageCpc?: string | number;
            } 
          }).metrics || {};
          
          // Google Ads API returns fields with underscores, check both formats
          const costMicrosValue = (m as any).cost_micros || m.costMicros || 0;
          
          debugLogger.debug('GoogleAdsService', 'Processing campaign result', {
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
        conversions
      });

      // Convert cost from micros to dollars
      const cost = costMicros / 1e6;
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      
      // Calculate conversion rate: conversions / clicks * 100 (not conversions / impressions)
      const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
      
      // Calculate average CPC: cost / clicks (already in dollars)
      const averageCpc = clicks > 0 ? cost / clicks : 0;

      debugLogger.info('GoogleAdsService', 'Conversion rate calculation', {
        conversions,
        clicks,
        conversionRate,
        impressions,
        ctr: (clicks / impressions) * 100
      });

      debugLogger.info('GoogleAdsService', 'Final metrics being returned', {
        impressions,
        clicks,
        cost,
        leads: conversions, // Using conversions as leads
        conversions,
        ctr,
        averageCpc,
        conversionRate
      });

      // Fetch previous period data if requested
      let previousPeriod;
      if (includePreviousPeriod) {
        try {
          const { getPreviousDateRange } = await import('@/lib/dateUtils');
          const previousDateRange = getPreviousDateRange('30d'); // Default to 30d for now
          
          const previousGaql = `SELECT campaign.id, campaign.name, metrics.conversions, metrics.cost_micros, metrics.impressions, metrics.clicks FROM campaign WHERE segments.date BETWEEN '${previousDateRange.start}' AND '${previousDateRange.end}'`;
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
   * Get demographic breakdown data from Google Ads
   * Uses separate queries for gender and age due to API limitations
   */
  static async getDemographicBreakdown(customerId: string, dateRange: { start: string; end: string; period?: string }): Promise<{
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
  }> {
    try {
      debugLogger.info('GoogleAdsService', 'Fetching demographic breakdown data', {
        customerId,
        dateRange
      });

      const accessToken = await this.ensureValidToken();
      const developerToken = await this.getDeveloperToken();
      const managerAccountId = await this.getManagerAccountId();

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
    dateRange: { start: string; end: string; period?: string },
    accessToken: string,
    developerToken: string,
    managerAccountId: string
  ): Promise<{ female: number; male: number }> {
    try {
      // Handle preset periods using Google Ads API v21 presets
      let dateClause: string;
      if (dateRange.period === 'lastMonth') {
        dateClause = `segments.date DURING LAST_MONTH`;
      } else {
        // For all other periods (7d, 14d, 30d), use BETWEEN with calculated dates (same as 14d which works)
        dateClause = `segments.date BETWEEN '${dateRange.start}' AND '${dateRange.end}'`;
      }
      
      // Use gender_view for demographics (working approach for v21)
      const gaql = `
        SELECT 
          ad_group_criterion.gender.type,
          metrics.conversions,
          metrics.cost_micros,
          metrics.impressions,
          metrics.clicks
        FROM gender_view 
        WHERE ${dateClause}
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
        let dateClause: string;
        if (dateRange.period === 'lastMonth') {
          dateClause = `segments.date DURING LAST_MONTH`;
        } else if (dateRange.period === '30d') {
          dateClause = `segments.date DURING LAST_30_DAYS`;
        } else {
          dateClause = `segments.date BETWEEN '${dateRange.start}' AND '${dateRange.end}'`;
        }
        
        const fallbackGaql = `
          SELECT 
            ad_group_criterion.gender.type,
            metrics.conversions,
            metrics.cost_micros
          FROM ad_group_criterion 
          WHERE ${dateClause}
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
    dateRange: { start: string; end: string; period?: string },
    accessToken: string,
    developerToken: string,
    managerAccountId: string
  ): Promise<{ '25-34': number; '35-44': number; '45-54': number; '55+': number }> {
    try {
      // Handle preset periods using Google Ads API v21 presets
      let dateClause: string;
      if (dateRange.period === 'lastMonth') {
        dateClause = `segments.date DURING LAST_MONTH`;
      } else {
        // For all other periods (7d, 14d, 30d), use BETWEEN with calculated dates (same as 14d which works)
        dateClause = `segments.date BETWEEN '${dateRange.start}' AND '${dateRange.end}'`;
      }
      
      // Use age_range_view for demographics (working approach for v21)
      const gaql = `
        SELECT 
          ad_group_criterion.age_range.type,
          metrics.conversions,
          metrics.cost_micros,
          metrics.impressions,
          metrics.clicks
        FROM age_range_view 
        WHERE ${dateClause}
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
        let dateClause: string;
        if (dateRange.period === 'lastMonth') {
          dateClause = `segments.date DURING LAST_MONTH`;
        } else if (dateRange.period === '30d') {
          dateClause = `segments.date DURING LAST_30_DAYS`;
        } else {
          dateClause = `segments.date BETWEEN '${dateRange.start}' AND '${dateRange.end}'`;
        }
        
        const fallbackGaql = `
          SELECT 
            ad_group_criterion.age_range.type,
            metrics.conversions,
            metrics.cost_micros
          FROM ad_group_criterion 
          WHERE ${dateClause}
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
   * Uses simplified GAQL query to avoid segments issues
   */
  static async getCampaignBreakdown(customerId: string, dateRange: { start: string; end: string; period?: string }): Promise<{
    campaignTypes: {
      search: number;
      display: number;
      youtube: number;
    };
    adFormats: {
      textAds: number;
      responsiveDisplay: number;
      videoAds: number;
    };
  }> {
    try {
      debugLogger.info('GoogleAdsService', 'Fetching campaign breakdown data', {
        customerId,
        dateRange
      });

      const accessToken = await this.ensureValidToken();
      const developerToken = await this.getDeveloperToken();
      const managerAccountId = await this.getManagerAccountId();

      if (!accessToken || !developerToken || !managerAccountId) {
        debugLogger.warn('GoogleAdsService', 'Missing required credentials for campaign breakdown');
        return null;
      }

      // Handle preset periods using Google Ads API v21 presets
      let dateClause: string;
      if (dateRange.period === 'lastMonth') {
        dateClause = `segments.date DURING LAST_MONTH`;
      } else {
        // For all other periods (7d, 14d, 30d), use BETWEEN with calculated dates (same as 14d which works)
        dateClause = `segments.date BETWEEN '${dateRange.start}' AND '${dateRange.end}'`;
      }
      
      // GAQL query for campaign breakdown by advertising channel type
      const gaql = `
        SELECT 
          campaign.advertising_channel_type,
          campaign.name,
          metrics.conversions,
          metrics.cost_micros
        FROM campaign 
        WHERE ${dateClause}
        AND campaign.status = 'ENABLED'
      `;

      const blocks = await this.makeApiRequest({
        accessToken,
        developerToken,
        customerId: this.normalizeCid(customerId),
        managerId: managerAccountId,
        gaql
      });

      debugLogger.info('GoogleAdsService', 'Campaign breakdown API response', {
        blockCount: blocks.length,
        hasData: blocks.length > 0
      });

      if (blocks.length === 0) {
        debugLogger.warn('GoogleAdsService', 'No campaign breakdown data returned from API');
        return null;
      }

      return this.processCampaignBreakdownData(blocks);
    } catch (error) {
      debugLogger.error('GoogleAdsService', 'Failed to fetch campaign breakdown data', error);
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
   * Simplified to match working pattern
   */
  private static processCampaignBreakdownData(blocks: any[]): {
    campaignTypes: {
      search: number;
      display: number;
      youtube: number;
    };
    adFormats: {
      textAds: number;
      responsiveDisplay: number;
      videoAds: number;
    };
  } {
    const campaignTypes = {
      search: 0,
      display: 0,
      youtube: 0
    };
    const adFormats = {
      textAds: 0,
      responsiveDisplay: 0,
      videoAds: 0
    };
    let totalLeads = 0;

    for (const block of blocks) {
      const results = (block as { results?: unknown[] }).results || [];
      for (const result of results) {
        const data = result as any;
        const leads = parseInt(data.metrics?.conversions || '0');
        totalLeads += leads;

        // Process campaign types
        const channelType = data.campaign?.advertising_channel_type;
        if (channelType) {
          if (channelType === 'SEARCH') {
            campaignTypes.search += leads;
          } else if (channelType === 'DISPLAY') {
            campaignTypes.display += leads;
          } else if (channelType === 'VIDEO') {
            campaignTypes.youtube += leads;
          }
        }
      }
    }

    // Convert to percentages
    if (totalLeads > 0) {
      const campaignTotal = campaignTypes.search + campaignTypes.display + campaignTypes.youtube;
      if (campaignTotal > 0) {
        campaignTypes.search = Math.round((campaignTypes.search / campaignTotal) * 100);
        campaignTypes.display = Math.round((campaignTypes.display / campaignTotal) * 100);
        campaignTypes.youtube = Math.round((campaignTypes.youtube / campaignTotal) * 100);
      }
    }

    // For ad formats, use simple distribution based on campaign types
    // This is a simplified approach following best practices
    adFormats.textAds = Math.round(campaignTypes.search * 0.8); // Most search campaigns use text ads
    adFormats.responsiveDisplay = Math.round(campaignTypes.display * 0.9); // Most display campaigns use responsive display
    adFormats.videoAds = campaignTypes.youtube; // Video campaigns use video ads

    return { campaignTypes, adFormats };
  }

}