/**
 * Analytics Orchestrator
 * Implements reporting architecture best practices:
 * - Centralized data service
 * - Smart caching with invalidation
 * - Request deduplication
 * - Platform adapters
 */

import { facebookCircuitBreaker, ghlCircuitBreaker, googleCircuitBreaker, sheetsCircuitBreaker } from '@/lib/circuitBreaker';
import { debugLogger } from '@/lib/debug';
import {
    EventDashboardData,
    EventLeadMetrics,
    FacebookMetricsWithTrends,
    GoHighLevelMetrics,
    GoogleMetricsWithTrends
} from '@/types/dashboard';
import { DatabaseService } from './databaseService';
import { MonthlyLeadsData, MonthlyLeadsService } from './monthlyLeadsService';
// Simple type definitions to avoid complex imports
interface Client {
  id: string;
  name: string;
  accounts?: {
    facebookAds?: string;
    googleAds?: string;
    goHighLevel?: string | { locationId: string; locationName: string; locationToken?: string };
    googleSheets?: string;
  };
}

interface DateRange {
  start: string;
  end: string;
}

interface LeadMetrics {
  totalLeads: number;
  facebookLeads: number;
  googleLeads: number;
  totalGuests: number;
  averageGuestsPerLead: number;
  eventTypes: Array<{ type: string; count: number; percentage: number }>;
  leadSources: Array<{ source: string; count: number; percentage: number }>;
  guestRanges: Array<{ range: string; count: number; percentage: number }>;
  dayPreferences: Array<{ day: string; count: number; percentage: number }>;
  landingPageTypes: Array<{ type: string; count: number; percentage: number }>;
}

// Smart cache with invalidation tracking
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  dependencies: string[]; // Track what data this depends on
  version: number;
}

class SmartCache {
  private cache = new Map<string, CacheEntry<any>>();
  private invalidationTriggers = new Map<string, Set<string>>(); // dependency -> cache keys
  private version = 0;
  private maxSize = 100; // Maximum cache entries
  private accessCounts = new Map<string, number>(); // Track access frequency for LRU

  set<T>(key: string, data: T, dependencies: string[] = []): void {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLeastRecentlyUsed();
    }

    this.version++;
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      dependencies,
      version: this.version
    };
    
    this.cache.set(key, entry);
    this.accessCounts.set(key, 0); // Initialize access count
    
    // Track invalidation triggers
    dependencies.forEach(dep => {
      if (!this.invalidationTriggers.has(dep)) {
        this.invalidationTriggers.set(dep, new Set());
      }
      this.invalidationTriggers.get(dep)!.add(key);
    });
    
    // debugLogger.debug('SmartCache', `Cached data for ${key}`, { 
    //   dependencies, 
    //   version: this.version,
    //   cacheSize: this.cache.size
    // });
  }

  get<T>(key: string, maxAge: number = 5 * 60 * 1000): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const age = Date.now() - entry.timestamp;
    if (age > maxAge) {
      // debugLogger.debug('SmartCache', `Cache expired for ${key}`, { age, maxAge });
      this.cache.delete(key);
      this.accessCounts.delete(key);
      return null;
    }
    
    // Increment access count for LRU tracking
    const currentCount = this.accessCounts.get(key) || 0;
    this.accessCounts.set(key, currentCount + 1);
    
    // debugLogger.debug('SmartCache', `Cache hit for ${key}`, { 
    //   age, 
    //   version: entry.version,
    //   accessCount: currentCount + 1
    // });
    return entry.data;
  }

  invalidate(dependency: string): void {
    const affectedKeys = this.invalidationTriggers.get(dependency);
    if (!affectedKeys) return;
    
    debugLogger.debug('SmartCache', `Invalidating cache for dependency: ${dependency}`, { 
      affectedKeys: Array.from(affectedKeys) 
    });
    
    affectedKeys.forEach(key => {
      this.cache.delete(key);
    });
    
    this.invalidationTriggers.delete(dependency);
  }

  clear(): void {
    this.cache.clear();
    this.invalidationTriggers.clear();
    this.accessCounts.clear();
    debugLogger.debug('SmartCache', 'Cache cleared');
  }

  /**
   * Evict least recently used cache entry
   */
  private evictLeastRecentlyUsed(): void {
    let leastUsedKey = '';
    let leastUsedCount = Infinity;
    
    for (const [key, count] of this.accessCounts.entries()) {
      if (count < leastUsedCount) {
        leastUsedCount = count;
        leastUsedKey = key;
      }
    }
    
    if (leastUsedKey) {
      this.cache.delete(leastUsedKey);
      this.accessCounts.delete(leastUsedKey);
      debugLogger.debug('SmartCache', `Evicted LRU entry: ${leastUsedKey}`, { 
        accessCount: leastUsedCount,
        remainingSize: this.cache.size 
      });
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  getStats(): { size: number; maxSize: number; hitRate: number } {
    const totalAccesses = Array.from(this.accessCounts.values()).reduce((sum, count) => sum + count, 0);
    const hitRate = totalAccesses > 0 ? totalAccesses / this.cache.size : 0;
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: Math.round(hitRate * 100) / 100
    };
  }

  /**
   * Warm cache with frequently accessed data
   */
  async warmCache(clientId: string, dateRange: DateRange): Promise<void> {
    const keys = [
      `facebook-${clientId}-${JSON.stringify(dateRange)}`,
      `google-${clientId}-${JSON.stringify(dateRange)}`,
      `ghl-${clientId}-${JSON.stringify(dateRange)}`,
      `leads-${clientId}-${JSON.stringify(dateRange)}`
    ];

    debugLogger.info('SmartCache', 'Starting cache warming', { keys });
    
    // Background warming - don't await to avoid blocking
    Promise.all(keys.map(async (key) => {
      if (!this.cache.has(key)) {
        // This would trigger data fetching in the background
        debugLogger.debug('SmartCache', `Warming cache for ${key}`);
      }
    })).catch(error => {
      debugLogger.error('SmartCache', 'Cache warming failed', error);
    });
  }
}

// Request deduplication
class RequestDeduplicator {
  private pendingRequests = new Map<string, Promise<any>>();

  async deduplicate<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    if (this.pendingRequests.has(key)) {
      debugLogger.debug('RequestDeduplicator', `Returning pending request for ${key}`);
      return this.pendingRequests.get(key) as Promise<T>;
    }

    const promise = requestFn().finally(() => {
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, promise);
    debugLogger.debug('RequestDeduplicator', `Starting new request for ${key}`);
    return promise;
  }
}

// Platform adapters for unified data handling
interface PlatformAdapter<T> {
  normalize(data: any): T;
  validate(data: any): boolean;
  getKey(): string;
}

class FacebookAdapter implements PlatformAdapter<FacebookMetricsWithTrends> {
  normalize(data: any): FacebookMetricsWithTrends {
    return {
      leads: data.leads || 0,
      spend: data.spend || 0,
      impressions: data.impressions || 0,
      clicks: data.clicks || 0,
      conversions: data.conversions || 0,
      costPerLead: data.costPerLead || 0,
      ctr: data.ctr || 0,
      cpm: data.cpm || 0,
      cpc: data.cpc || 0,
      demographics: data.demographics,
      platformBreakdown: data.platformBreakdown
    };
  }

  validate(data: any): boolean {
    return data && typeof data === 'object';
  }

  getKey(): string {
    return 'facebook';
  }
}

class GoogleAdapter implements PlatformAdapter<GoogleMetricsWithTrends> {
  normalize(data: any): GoogleMetricsWithTrends {
    return {
      leads: data.leads || 0,
      cost: data.cost || 0,
      spend: data.spend || 0,
      impressions: data.impressions || 0,
      clicks: data.clicks || 0,
      conversions: data.conversions || 0,
      conversionRate: data.conversionRate || 0,
      ctr: data.ctr || 0,
      costPerConversion: data.costPerConversion || 0,
      demographics: data.demographics,
      campaignBreakdown: data.campaignBreakdown
    };
  }

  validate(data: any): boolean {
    return data && typeof data === 'object';
  }

  getKey(): string {
    return 'google';
  }
}

// Main Analytics Orchestrator
export class AnalyticsOrchestrator {
  private static cache = new SmartCache();
  private static deduplicator = new RequestDeduplicator();
  private static adapters = new Map<string, PlatformAdapter<any>>([
    ['facebook', new FacebookAdapter()],
    ['google', new GoogleAdapter()]
  ]);
  private static lastRequestTime = 0;
  private static backgroundRefreshInterval: NodeJS.Timeout | null = null;

  /**
   * Start background refresh for frequently accessed data
   */
  static startBackgroundRefresh(clientId: string, dateRange: DateRange): void {
    if (this.backgroundRefreshInterval) {
      clearInterval(this.backgroundRefreshInterval);
    }

    // Refresh cache every 2 minutes
    this.backgroundRefreshInterval = setInterval(async () => {
      try {
        debugLogger.info('AnalyticsOrchestrator', 'Starting background cache refresh');
        await this.cache.warmCache(clientId, dateRange);
        
        // Log cache statistics
        const stats = this.cache.getStats();
        debugLogger.info('AnalyticsOrchestrator', 'Cache statistics', stats);
      } catch (error) {
        debugLogger.error('AnalyticsOrchestrator', 'Background refresh failed', error);
      }
    }, 2 * 60 * 1000); // 2 minutes

    debugLogger.info('AnalyticsOrchestrator', 'Background refresh started', { clientId });
  }

  /**
   * Stop background refresh
   */
  static stopBackgroundRefresh(): void {
    if (this.backgroundRefreshInterval) {
      clearInterval(this.backgroundRefreshInterval);
      this.backgroundRefreshInterval = null;
      debugLogger.info('AnalyticsOrchestrator', 'Background refresh stopped');
    }
  }

  /**
   * Get comprehensive dashboard data with smart caching and deduplication
   */
  static async getDashboardData(
    clientId: string,
    dateRange: DateRange,
    forceRefresh: boolean = false
  ): Promise<EventDashboardData> {
    const cacheKey = `dashboard-${clientId}-${JSON.stringify(dateRange)}`;
    
    if (!forceRefresh) {
      const cached = this.cache.get(cacheKey);
      if (cached) return cached as EventDashboardData;
    }

    return this.deduplicator.deduplicate(cacheKey, async () => {
      debugLogger.info('AnalyticsOrchestrator', 'Fetching dashboard data', { clientId, dateRange });

      // Get client data
      const clientData = await this.getClientData(clientId);
      if (!clientData) {
        throw new Error('Client not found');
      }

      // Get platform-specific data in parallel - only call APIs for connected accounts
      const promises = [];
      
      // Only call Facebook API if Facebook account is connected
      if (clientData.accounts?.facebookAds && clientData.accounts.facebookAds !== 'none') {
        promises.push(this.getFacebookData(clientId, dateRange, clientData));
      }
      
      // Only call Google Ads API if Google account is connected
      if (clientData.accounts?.googleAds && clientData.accounts.googleAds !== 'none') {
        promises.push(this.getGoogleData(clientId, dateRange, clientData));
      }
      
      // Only call GoHighLevel API if GHL account is connected
      if (clientData.accounts?.goHighLevel && clientData.accounts.goHighLevel !== 'none') {
        console.log('🚀 AnalyticsOrchestrator calling getGoHighLevelData', { 
          clientId, 
          goHighLevelValue: clientData.accounts.goHighLevel,
          goHighLevelType: typeof clientData.accounts.goHighLevel
        });
        promises.push(this.getGoHighLevelData(clientId, dateRange, clientData));
      }
      
      // Only call Lead Data API if Google Sheets is connected
      if (clientData.accounts?.googleSheets && clientData.accounts.googleSheets !== 'none') {
        promises.push(this.getLeadData(clientId, dateRange, clientData));
      }
      
      // Always fetch monthly leads data if we have connected accounts
      promises.push(this.getMonthlyLeadsData(clientId, clientData));
      
      const results = await Promise.allSettled(promises);

      // Extract results based on what promises were added
      let resultIndex = 0;
      const facebookData = clientData.accounts?.facebookAds && clientData.accounts.facebookAds !== 'none' ? results[resultIndex++] : { status: 'rejected' as const, reason: 'No Facebook account' };
      const googleData = clientData.accounts?.googleAds && clientData.accounts.googleAds !== 'none' ? results[resultIndex++] : { status: 'rejected' as const, reason: 'No Google account' };
      const ghlData = clientData.accounts?.goHighLevel && clientData.accounts.goHighLevel !== 'none' ? results[resultIndex++] : { status: 'rejected' as const, reason: 'No GHL account' };
      const leadData = clientData.accounts?.googleSheets && clientData.accounts.googleSheets !== 'none' ? results[resultIndex++] : { status: 'rejected' as const, reason: 'No Sheets account' };
      const monthlyLeadsData = results[resultIndex++]; // Always present

      // Normalize and combine data - BEST PRACTICE: Simple, explicit handling
      const dashboardData: Partial<EventDashboardData> = {
        clientData,
        facebookMetrics: facebookData.status === 'fulfilled' && facebookData.value ? facebookData.value as FacebookMetricsWithTrends : undefined,
        googleMetrics: googleData.status === 'fulfilled' && googleData.value ? googleData.value as GoogleMetricsWithTrends : undefined,
        ghlMetrics: ghlData.status === 'fulfilled' && ghlData.value ? ghlData.value as GoHighLevelMetrics : undefined,
        leadMetrics: leadData.status === 'fulfilled' && leadData.value ? this.normalizeLeadMetrics(leadData.value) : undefined,
        leadData: leadData.status === 'fulfilled' && leadData.value ? leadData.value : undefined, // Raw lead data for components
        monthlyLeadsData: monthlyLeadsData.status === 'fulfilled' && monthlyLeadsData.value ? monthlyLeadsData.value as MonthlyLeadsData[] : undefined,
        totalLeads: 0,
        totalSpend: 0,
        totalRevenue: 0,
        roi: 0,
        overallConversionRate: 0
      };


      // Calculate totals
      dashboardData.totalLeads = (dashboardData.facebookMetrics?.leads || 0) + 
                                 (dashboardData.googleMetrics?.leads || 0);
      dashboardData.totalSpend = (dashboardData.facebookMetrics?.spend || 0) + 
                                 (dashboardData.googleMetrics?.cost || 0);

      // Calculate cost per lead for each platform
      if (dashboardData.facebookMetrics) {
        dashboardData.facebookMetrics.costPerLead = dashboardData.facebookMetrics.leads > 0 
          ? dashboardData.facebookMetrics.spend / dashboardData.facebookMetrics.leads 
          : 0;
      }
      
      if (dashboardData.googleMetrics) {
        dashboardData.googleMetrics.costPerConversion = dashboardData.googleMetrics.conversions > 0 
          ? dashboardData.googleMetrics.cost / dashboardData.googleMetrics.conversions 
          : 0;
      }

      // Calculate overall cost per lead
      const overallCostPerLead = dashboardData.totalLeads > 0 
        ? dashboardData.totalSpend / dashboardData.totalLeads 
        : 0;

      // Add leadMetrics with overall cost per lead
      dashboardData.leadMetrics = {
        facebookCostPerLead: dashboardData.facebookMetrics?.costPerLead || 0,
        googleCostPerLead: dashboardData.googleMetrics?.costPerConversion || 0,
        overallCostPerLead,
        leadToOpportunityRate: 0,
        opportunityToWinRate: 0,
        averageEventValue: 0,
        totalOpportunities: 0,
        averageGuestsPerEvent: 0,
        mostPopularEventType: 'Unknown',
        seasonalTrends: [],
        landingPageConversionRate: 0,
        formCompletionRate: 0,
        leadSourceBreakdown: []
      };

      debugLogger.info('AnalyticsOrchestrator', 'Final dashboard data', {
        facebookMetrics: dashboardData.facebookMetrics,
        facebookLeads: dashboardData.facebookMetrics?.leads,
        facebookSpend: dashboardData.facebookMetrics?.spend,
        facebookCostPerLead: dashboardData.facebookMetrics?.costPerLead,
        googleCostPerLead: dashboardData.googleMetrics?.costPerLead,
        totalLeads: dashboardData.totalLeads,
        totalSpend: dashboardData.totalSpend,
        overallCostPerLead: dashboardData.leadMetrics.overallCostPerLead
      });


      // Cache with dependencies
      this.cache.set(cacheKey, dashboardData, [
        `client-${clientId}`,
        `facebook-${clientId}`,
        `google-${clientId}`,
        `ghl-${clientId}`,
        `leads-${clientId}`
      ]);

      return dashboardData as EventDashboardData;
    });
  }

  /**
   * Get client data with caching
   */
  private static async getClientData(clientId: string): Promise<Client | null> {
    const cacheKey = `client-${clientId}`;
    const cached = this.cache.get<Client>(cacheKey);
    if (cached) return cached;

    const clientData = await DatabaseService.getClientById(clientId);
    if (clientData) {
      this.cache.set(cacheKey, clientData, []);
    }
    return clientData;
  }

  /**
   * Get Facebook data with direct API calls and improvements
   */
  private static async getFacebookData(
    clientId: string, 
    dateRange: DateRange, 
    clientData: Client
  ): Promise<FacebookMetricsWithTrends | undefined> {
    debugLogger.info('AnalyticsOrchestrator', 'Checking Facebook data requirements', {
      clientId,
      hasAccounts: !!clientData.accounts,
      facebookAdsAccount: clientData.accounts?.facebookAds,
      isNone: clientData.accounts?.facebookAds === 'none'
    });

    if (!clientData.accounts?.facebookAds || clientData.accounts.facebookAds === 'none') {
      debugLogger.warn('AnalyticsOrchestrator', 'No Facebook Ads account configured for client', {
        clientId,
        accounts: clientData.accounts
      });
      return undefined;
    }

    const cacheKey = `facebook-${clientId}-${JSON.stringify(dateRange)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    return this.deduplicator.deduplicate(cacheKey, async () => {
      return facebookCircuitBreaker.execute(async () => {
        // Get access token from Supabase
        const accessToken = await this.getFacebookAccessToken();
        if (!accessToken) {
          debugLogger.error('AnalyticsOrchestrator', 'Facebook access token not found');
          throw new Error('Facebook access token not found');
        }

        debugLogger.info('AnalyticsOrchestrator', 'Fetching Facebook data with API calls', { 
          clientId, 
          accountId: clientData.accounts.facebookAds,
          dateRange,
          hasAccessToken: !!accessToken
        });

        // Format account ID (ensure it starts with 'act_')
        const accountId = clientData.accounts.facebookAds.startsWith('act_') 
          ? clientData.accounts.facebookAds 
          : `act_${clientData.accounts.facebookAds}`;

        // Build Facebook Insights API URL with proper parameters
        const params = new URLSearchParams({
          access_token: accessToken,
          fields: 'impressions,clicks,spend,actions,ctr,cpc,cpm,reach,frequency,outbound_clicks,cost_per_action_type',
          level: 'account',
          time_range: JSON.stringify({
            since: dateRange.start,
            until: dateRange.end
          })
        });

        const url = `https://graph.facebook.com/v22.0/${accountId}/insights?${params}`;
        
        debugLogger.info('AnalyticsOrchestrator', 'Making Facebook API call', {
          url: url.replace(/access_token=[^&]+/, 'access_token=***'),
          accountId,
          dateRange
        });
        
        // Make API call with improvements
        const response = await this.makeFacebookApiCall(url);
        
        if (!response.data || response.data.length === 0) {
          debugLogger.warn('AnalyticsOrchestrator', 'Facebook API returned empty data', {
            accountId,
            dateRange,
            response
          });
          return undefined;
        }

        // Parse and normalize the data
        const rawMetrics = response.data[0];
        
        const normalizedData = this.normalizeFacebookMetrics(rawMetrics);
        
        // Fetch demographic and platform breakdown data (with error handling)
        let demographicsData: any[] = [];
        let platformBreakdownData: any[] = [];
        
        try {
          const [demographicsResult, platformBreakdownResult] = await Promise.all([
            this.getFacebookDemographics(accountId, dateRange, accessToken),
            this.getFacebookPlatformBreakdown(accountId, dateRange, accessToken)
          ]);
          demographicsData = demographicsResult;
          platformBreakdownData = platformBreakdownResult;
        } catch (breakdownError) {
          console.warn('⚠️ Demographics/Platform breakdown failed, continuing with main data:', breakdownError);
          // Continue with empty breakdown data - don't fail the entire request
        }
        
        debugLogger.info('AnalyticsOrchestrator', 'Facebook breakdown data fetched', {
          demographicsCount: demographicsData.length,
          platformBreakdownCount: platformBreakdownData.length
        });
        
        // Process demographic and platform breakdown data
        try {
          normalizedData.demographics = this.processDemographicData(demographicsData);
          normalizedData.platformBreakdown = this.processPlatformBreakdownData(platformBreakdownData);
        } catch (processingError) {
          console.warn('⚠️ Demographics processing failed:', processingError);
          // Don't set fallback data - let the component handle missing data
        }
        
        debugLogger.info('AnalyticsOrchestrator', 'Facebook data normalized with breakdowns', {
          demographics: normalizedData.demographics,
          platformBreakdown: normalizedData.platformBreakdown
        });
        
        // Cache with dependencies
        this.cache.set(cacheKey, normalizedData, [`facebook-${clientId}`, `facebook-token-${clientId}`]);
        
        debugLogger.info('AnalyticsOrchestrator', 'Facebook data fetched successfully', {
          leads: normalizedData.leads,
          spend: normalizedData.spend,
          impressions: normalizedData.impressions
        });

        return normalizedData;
      }, `Facebook-${clientId}`);
    });
  }

  /**
   * Get Facebook access token from Supabase
   */
  private static async getFacebookAccessToken(): Promise<string | null> {
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase
        .from('integrations')
        .select('config')
        .eq('platform', 'facebookAds')
        .eq('connected', true)
        .single();

      debugLogger.info('AnalyticsOrchestrator', 'Facebook token lookup result', {
        hasData: !!data,
        hasError: !!error,
        errorMessage: error?.message,
        hasConfig: !!data?.config,
        hasAccessToken: !!data?.config?.accessToken
      });

      if (error || !data) {
        debugLogger.warn('AnalyticsOrchestrator', 'No Facebook integration found', { error: error?.message });
        return null;
      }

      const config = data?.config;
      if (!config?.accessToken) {
        debugLogger.warn('AnalyticsOrchestrator', 'No Facebook access token found in config', {
          configKeys: Object.keys(config || {})
        });
        return null;
      }

      debugLogger.info('AnalyticsOrchestrator', 'Facebook access token found from integrations table');
      return config.accessToken;
    } catch (error) {
      debugLogger.error('AnalyticsOrchestrator', 'Error getting Facebook access token', error);
      return null;
    }
  }

  /**
   * Make Facebook API call with improvements (rate limiting, retry logic, error handling)
   */
  private static async makeFacebookApiCall(url: string, retryCount = 0): Promise<any> {
    const MAX_RETRIES = 3;
    const MIN_REQUEST_INTERVAL = 200; // 200ms between requests
    const BASE_DELAY = 1000; // 1 second base delay

    // Rate limiting: ensure minimum interval between requests
    const now = Date.now();
    const timeSinceLastRequest = now - (this.lastRequestTime || 0);
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      const delay = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    this.lastRequestTime = Date.now();

    try {
      debugLogger.debug('AnalyticsOrchestrator', `Facebook API request attempt ${retryCount + 1}/${MAX_RETRIES}`, { 
        url: url.replace(/access_token=[^&]+/, 'access_token=***') 
      });

      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Marketing-Analytics-Dashboard/1.0'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle rate limiting (429) with exponential backoff
        if (response.status === 429 && retryCount < MAX_RETRIES) {
          const delay = BASE_DELAY * Math.pow(2, retryCount);
          debugLogger.warn('AnalyticsOrchestrator', `Facebook rate limited, retrying in ${delay}ms`, { retryCount });
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.makeFacebookApiCall(url, retryCount + 1);
        }

        // Handle token expiration (190)
        if (response.status === 400 && errorData.error?.code === 190) {
          debugLogger.error('AnalyticsOrchestrator', 'Facebook token expired', errorData);
          throw new Error('Facebook access token expired');
        }

        debugLogger.error('AnalyticsOrchestrator', 'Facebook API error details', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          url: url.replace(/access_token=[^&]+/, 'access_token=***')
        });
        throw new Error(`Facebook API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      debugLogger.debug('AnalyticsOrchestrator', 'Facebook API response received', {
        dataCount: data.data?.length || 0,
        hasData: !!(data.data && data.data.length > 0)
      });

      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        debugLogger.error('AnalyticsOrchestrator', 'Facebook API request timeout');
        throw new Error('Facebook API request timeout');
      }

      if (retryCount < MAX_RETRIES) {
        const delay = BASE_DELAY * Math.pow(2, retryCount);
        debugLogger.warn('AnalyticsOrchestrator', `Facebook API error, retrying in ${delay}ms`, { error, retryCount });
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.makeFacebookApiCall(url, retryCount + 1);
      }

      debugLogger.error('AnalyticsOrchestrator', 'Facebook API request failed after retries', error);
      throw error;
    }
  }

  /**
   * Normalize Facebook metrics data
   */
  private static normalizeFacebookMetrics(rawData: any): FacebookMetricsWithTrends {
    debugLogger.info('AnalyticsOrchestrator', 'Raw Facebook API response', {
      rawData,
      spend: rawData.spend,
      clicks: rawData.clicks,
      outbound_clicks: rawData.outbound_clicks,
      cpc: rawData.cpc,
      ctr: rawData.ctr,
      actions: rawData.actions
    });

    // Extract leads from actions array - Prioritize most reliable action type to avoid double-counting
    let leads = 0;
    if (rawData.actions) {
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
        const action = rawData.actions.find(a => a.action_type === priorityAction);
        if (action) {
          leads = parseFloat(action.value || '0');
          break; // Use only the first (highest priority) lead action
        }
      }
    }

    // Extract outbound clicks from outbound_clicks field
    let outboundClicks = 0;
    if (rawData.outbound_clicks && Array.isArray(rawData.outbound_clicks)) {
      for (const click of rawData.outbound_clicks) {
        if (click.action_type === 'outbound_click') {
          outboundClicks += parseFloat(click.value || '0');
        }
      }
    }

    // Extract cost per lead and cost per link click from cost_per_action_type
    let costPerLead = 0;
    let costPerLinkClick = 0;
    
    if (rawData.cost_per_action_type && Array.isArray(rawData.cost_per_action_type)) {
      for (const costAction of rawData.cost_per_action_type) {
        // Look for lead cost - prioritize 'lead' action type
        if (costAction.action_type === 'lead') {
          costPerLead = parseFloat(costAction.value || '0');
        }
        // Look for link click cost
        if (costAction.action_type === 'link_click') {
          costPerLinkClick = parseFloat(costAction.value || '0');
        }
      }
    }

    // Fallback: Calculate from spend if not found in cost_per_action_type
    const spend = parseFloat(rawData.spend || '0');
    if (costPerLead === 0 && leads > 0) {
      costPerLead = spend / leads;
    }
    if (costPerLinkClick === 0 && outboundClicks > 0) {
      costPerLinkClick = spend / outboundClicks;
    }

    debugLogger.info('AnalyticsOrchestrator', 'Facebook metrics calculated', {
      leads,
      outboundClicks,
      spend,
      costPerLead,
      costPerLinkClick,
      actions: rawData.actions,
      outbound_clicks: rawData.outbound_clicks,
      cost_per_action_type: rawData.cost_per_action_type
    });

    return {
      leads: parseInt(leads.toString()),
      spend: spend,
      impressions: parseInt(rawData.impressions || '0'),
      clicks: parseInt(rawData.clicks || '0'),
      conversions: leads, // Use leads as conversions for now
      costPerLead: costPerLead,
      ctr: parseFloat(rawData.ctr || '0'), // Facebook API field (already as percentage)
      cpm: parseFloat(rawData.cpm || '0'), // Facebook API field
      cpc: costPerLinkClick, // Cost per link click from cost_per_action_type
      demographics: {
        ageGroups: { '25-34': 0, '35-44': 0, '45-54': 0, '55+': 0 },
        gender: { female: 0, male: 0 }
      },
      platformBreakdown: {
        facebookVsInstagram: { facebook: 0, instagram: 0 },
        adPlacements: { feed: 0, stories: 0, reels: 0 }
      }
    };
  }

  /**
   * Get Facebook demographic breakdown data
   */
  private static async getFacebookDemographics(
    accountId: string, 
    dateRange: DateRange, 
    accessToken: string
  ): Promise<any[]> {
    try {
      const params = new URLSearchParams({
        access_token: accessToken,
        fields: 'impressions,clicks,spend,actions',
        breakdowns: 'age,gender',
        level: 'account',
        time_range: JSON.stringify({
          since: dateRange.start,
          until: dateRange.end
        }),
        limit: '1000'
      });

      const url = `https://graph.facebook.com/v22.0/${accountId}/insights?${params}`;
      const response = await this.makeFacebookApiCall(url);
      
      debugLogger.info('AnalyticsOrchestrator', 'Facebook demographics API response', {
        url: url.replace(/access_token=[^&]+/, 'access_token=***'),
        dataCount: response.data?.length || 0
      });
      
      return response.data || [];
    } catch (error) {
      debugLogger.error('AnalyticsOrchestrator', 'Failed to fetch Facebook demographics', error);
      return [];
    }
  }

  /**
   * Get Facebook platform breakdown data
   */
  private static async getFacebookPlatformBreakdown(
    accountId: string, 
    dateRange: DateRange, 
    accessToken: string
  ): Promise<any[]> {
    try {
      const params = new URLSearchParams({
        access_token: accessToken,
        fields: 'impressions,clicks,spend,actions',
        breakdowns: 'publisher_platform,platform_position',
        level: 'account',
        time_range: JSON.stringify({
          since: dateRange.start,
          until: dateRange.end
        }),
        limit: '1000'
      });

      const url = `https://graph.facebook.com/v22.0/${accountId}/insights?${params}`;
      const response = await this.makeFacebookApiCall(url);
      
      return response.data || [];
    } catch (error) {
      debugLogger.error('AnalyticsOrchestrator', 'Failed to fetch Facebook platform breakdown', error);
      return [];
    }
  }

  /**
   * Process demographic data (same logic as V1)
   */
  private static processDemographicData(insightsData: any[]): any {
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
      const leads = this.extractLeadsFromActions(insight.actions || []);
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

    return {
      ageGroups,
      gender,
      totalLeads
    };
  }

  /**
   * Process platform breakdown data
   */
  private static processPlatformBreakdownData(insightsData: any[]): any {
    const platforms = {
      facebook: 0,
      instagram: 0
    };
    
    const placements = {
      feed: 0,
      stories: 0,
      reels: 0
    };

    let totalLeads = 0;
    let totalSpend = 0;

    insightsData.forEach((insight: any) => {
      const leads = this.extractLeadsFromActions(insight.actions || []);
      const spend = parseFloat(insight.spend || '0');
      
      totalLeads += leads;
      totalSpend += spend;

      // Process platforms (Facebook vs Instagram) - use leads
      if (insight.publisher_platform) {
        if (insight.publisher_platform === 'facebook') {
          platforms.facebook += leads;
        } else if (insight.publisher_platform === 'instagram') {
          platforms.instagram += leads;
        }
      }

      // Process placements (feed, stories, reels) - use leads for consistency
      if (insight.platform_position) {
        const position = insight.platform_position.toLowerCase();
        if (position.includes('feed')) {
          placements.feed += leads;
        } else if (position.includes('story')) {
          placements.stories += leads;
        } else if (position.includes('reel')) {
          placements.reels += leads;
        }
      }
    });

    // Convert to percentages (same logic as V1)
    const facebookVsInstagram = {
      facebook: 0,
      instagram: 0
    };
    
    const adPlacements = {
      feed: 0,
      stories: 0,
      reels: 0
    };

    if (totalLeads > 0) {
      const facebookTotal = platforms.facebook + platforms.instagram;
      if (facebookTotal > 0) {
        facebookVsInstagram.facebook = Math.round((platforms.facebook / facebookTotal) * 100);
        facebookVsInstagram.instagram = Math.round((platforms.instagram / facebookTotal) * 100);
      }

      const placementsTotal = placements.feed + placements.stories + placements.reels;
      if (placementsTotal > 0) {
        adPlacements.feed = Math.round((placements.feed / placementsTotal) * 100);
        adPlacements.stories = Math.round((placements.stories / placementsTotal) * 100);
        adPlacements.reels = Math.round((placements.reels / placementsTotal) * 100);
      }
    }


    return {
      facebookVsInstagram,
      adPlacements,
      totalLeads,
      totalSpend
    };
  }

  /**
   * Extract leads from actions array
   */
  private static extractLeadsFromActions(actions: any[]): number {
    if (!actions || !Array.isArray(actions)) {
      return 0;
    }

    // Look for lead or purchase actions
    const leadAction = actions.find((action: any) => 
      action.action_type === 'lead' || action.action_type === 'purchase'
    );

    return parseInt(leadAction?.value?.toString() || '0');
  }


  /**
   * Get Google data with direct API calls and improvements
   */
  private static async getGoogleData(
    clientId: string, 
    dateRange: DateRange, 
    clientData: Client
  ): Promise<GoogleMetricsWithTrends | undefined> {
    if (!clientData.accounts?.googleAds || clientData.accounts.googleAds === 'none') {
      return undefined;
    }

    const cacheKey = `google-${clientId}-${JSON.stringify(dateRange)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    return this.deduplicator.deduplicate(cacheKey, async () => {
      return googleCircuitBreaker.execute(async () => {
        debugLogger.info('AnalyticsOrchestrator', 'Fetching Google Ads data', {
          clientId,
          customerId: clientData.accounts.googleAds,
          dateRange
        });

        // Import GoogleAdsService dynamically to avoid circular dependencies
        const { GoogleAdsService } = await import('../api/googleAdsService');
        
        // Get main metrics
        const mainMetrics = await GoogleAdsService.getAccountMetrics(
          clientData.accounts.googleAds,
          dateRange,
          false
        );

        if (!mainMetrics) {
          debugLogger.warn('AnalyticsOrchestrator', 'Google Ads API returned no data');
          return undefined;
        }

        // Normalize the main metrics
        const normalizedData = this.normalizeGoogleMetrics(mainMetrics);

        // Fetch demographic and campaign breakdown data (with error handling)
        let demographicsData: any = null;
        let campaignBreakdownData: any = null;
        
        try {
          const [demographicsResult, campaignBreakdownResult] = await Promise.all([
            GoogleAdsService.getDemographicBreakdown(clientData.accounts.googleAds, dateRange),
            GoogleAdsService.getCampaignBreakdown(clientData.accounts.googleAds, dateRange)
          ]);
          demographicsData = demographicsResult;
          campaignBreakdownData = campaignBreakdownResult;
        } catch (breakdownError) {
          console.warn('⚠️ Google Ads breakdown data failed, continuing with main data:', breakdownError);
          // Continue with empty breakdown data - don't fail the entire request
        }
        
        debugLogger.info('AnalyticsOrchestrator', 'Google Ads breakdown data fetched', {
          hasDemographics: !!demographicsData,
          hasCampaignBreakdown: !!campaignBreakdownData
        });
        
        // Process demographic and campaign breakdown data
        try {
          normalizedData.demographics = demographicsData;
          normalizedData.campaignBreakdown = campaignBreakdownData;
        } catch (processingError) {
          console.warn('⚠️ Google Ads processing failed:', processingError);
          // Don't set fallback data - let the component handle missing data
        }

        this.cache.set(cacheKey, normalizedData, [`google-${clientId}`]);
        return normalizedData;
      }, `Google-${clientId}`);
    });
  }

  /**
   * Normalize Google Ads metrics
   */
  private static normalizeGoogleMetrics(rawData: any): GoogleMetricsWithTrends {
    const leads = parseInt(rawData.leads?.toString() || '0');
    const cost = parseFloat(rawData.cost?.toString() || '0');
    const impressions = parseInt(rawData.impressions?.toString() || '0');
    const clicks = parseInt(rawData.clicks?.toString() || '0');
    
    return {
      leads,
      cost,
      impressions,
      clicks,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      cpc: clicks > 0 ? cost / clicks : 0,
      conversionRate: clicks > 0 ? (leads / clicks) * 100 : 0,
      costPerLead: leads > 0 ? cost / leads : 0,
      demographics: {
        ageGroups: { '25-34': 0, '35-44': 0, '45-54': 0, '55+': 0 },
        gender: { female: 0, male: 0 }
      },
      campaignBreakdown: {
        campaignTypes: { search: 0, display: 0, youtube: 0 },
        adFormats: { textAds: 0, responsiveDisplay: 0, videoAds: 0 }
      },
      previousPeriod: undefined
    };
  }


  /**
   * Normalize GoHighLevel metrics data
   */
  private static normalizeGoHighLevelMetrics(rawData: any): GoHighLevelMetrics {
    return {
      totalContacts: rawData.totalContacts || 0,
      newContacts: rawData.newContacts || 0,
      totalOpportunities: rawData.totalOpportunities || 0,
      wonOpportunities: rawData.wonOpportunities || 0,
      lostOpportunities: rawData.lostOpportunities || 0,
      pipelineValue: rawData.pipelineValue || 0,
      avgDealSize: rawData.avgDealSize || 0,
      conversionRate: rawData.conversionRate || 0,
      responseTime: rawData.responseTime || 0,
      wonRevenue: rawData.wonRevenue || 0
    };
  }


  /**
   * Normalize lead metrics data
   */
  private static normalizeLeadMetrics(rawData: any): EventLeadMetrics {
    return {
      facebookCostPerLead: rawData.facebookCostPerLead || 0,
      googleCostPerLead: rawData.googleCostPerLead || 0,
      overallCostPerLead: rawData.overallCostPerLead || 0,
      leadToOpportunityRate: rawData.leadToOpportunityRate || 0,
      opportunityToWinRate: rawData.opportunityToWinRate || 0,
      averageEventValue: rawData.averageEventValue || 0,
      totalOpportunities: rawData.totalOpportunities || 0,
      averageGuestsPerEvent: rawData.averageGuestsPerEvent || 0,
      mostPopularEventType: rawData.mostPopularEventType || '',
      seasonalTrends: rawData.seasonalTrends || [],
      landingPageConversionRate: rawData.landingPageConversionRate || 0,
      formCompletionRate: rawData.formCompletionRate || 0,
      leadSourceBreakdown: rawData.leadSourceBreakdown || []
    };
  }


  /**
   * Get GoHighLevel data with direct API calls
   */
  private static async getGoHighLevelData(
    clientId: string, 
    dateRange: DateRange, 
    clientData: Client
  ): Promise<GoHighLevelMetrics | undefined> {
    if (!clientData.accounts?.goHighLevel || clientData.accounts.goHighLevel === 'none') {
      return undefined;
    }

    const cacheKey = `ghl-${clientId}-${JSON.stringify(dateRange)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    return this.deduplicator.deduplicate(cacheKey, async () => {
      return ghlCircuitBreaker.execute(async () => {
        debugLogger.info('AnalyticsOrchestrator', 'Fetching GoHighLevel data with API calls', { 
          clientId, 
          locationId: clientData.accounts.goHighLevel,
          dateRange 
        });

        // Extract locationId from goHighLevel object if it's an object, otherwise use as string
        const locationId = typeof clientData.accounts.goHighLevel === 'object' 
          ? clientData.accounts.goHighLevel?.locationId 
          : clientData.accounts.goHighLevel;

        debugLogger.info('AnalyticsOrchestrator', 'Extracted GoHighLevel locationId', { 
          locationId,
          goHighLevelType: typeof clientData.accounts.goHighLevel,
          goHighLevelValue: clientData.accounts.goHighLevel
        });

        if (!locationId) {
          debugLogger.warn('AnalyticsOrchestrator', 'No GoHighLevel locationId found');
          return undefined;
        }

        // Import GoHighLevel services dynamically to avoid circular dependencies
        const { GoHighLevelAnalyticsService } = await import('../ghl/goHighLevelAnalyticsService');
        
        // Get comprehensive GHL metrics using service
        const ghlMetrics = await GoHighLevelAnalyticsService.getGHLMetrics(locationId, {
          startDate: dateRange.start,
          endDate: dateRange.end
        });

        if (!ghlMetrics) {
          debugLogger.warn('AnalyticsOrchestrator', 'GoHighLevel API returned no data');
          return undefined;
        }

        // Normalize the data to match expected interface
        const normalizedData = this.normalizeGoHighLevelMetrics(ghlMetrics);
        
        // Cache with dependencies
        this.cache.set(cacheKey, normalizedData, [`ghl-${clientId}`, `ghl-token-${locationId}`]);
        
        debugLogger.info('AnalyticsOrchestrator', 'GoHighLevel data fetched successfully', {
          totalContacts: normalizedData.totalContacts,
          totalOpportunities: normalizedData.totalOpportunities,
          pipelineValue: normalizedData.pipelineValue
        });

        return normalizedData;
      }, `GHL-${clientId}`);
    });
  }

  /**
   * Get monthly leads data with direct API calls
   */
  static async getMonthlyLeadsData(
    clientId: string, 
    clientData: Client
  ): Promise<MonthlyLeadsData[] | undefined> {
    debugLogger.info('AnalyticsOrchestrator', 'getMonthlyLeadsData called', {
      clientId,
      accounts: clientData.accounts,
      hasFacebook: !!clientData.accounts?.facebookAds,
      hasGoogle: !!clientData.accounts?.googleAds,
      facebookValue: clientData.accounts?.facebookAds,
      googleValue: clientData.accounts?.googleAds
    });

    // Only fetch if we have connected accounts
    if (!clientData.accounts?.facebookAds && !clientData.accounts?.googleAds) {
      debugLogger.info('AnalyticsOrchestrator', 'No connected accounts for monthly leads');
      return undefined;
    }

    // Check if accounts are set to 'none'
    if (clientData.accounts?.facebookAds === 'none' && clientData.accounts?.googleAds === 'none') {
      debugLogger.info('AnalyticsOrchestrator', 'All accounts set to none');
      return undefined;
    }

    const cacheKey = `monthly-leads-${clientId}`;
    const cached = this.cache.get<MonthlyLeadsData[]>(cacheKey);
    if (cached) return cached;

    return this.deduplicator.deduplicate(cacheKey, async () => {
      debugLogger.info('AnalyticsOrchestrator', 'Fetching monthly leads data', { 
        clientId,
        hasFacebook: !!clientData.accounts?.facebookAds,
        hasGoogle: !!clientData.accounts?.googleAds
      });

      try {
        const monthlyLeads = await MonthlyLeadsService.getMonthlyLeads({
          clientId,
          facebookAdAccountId: clientData.accounts?.facebookAds !== 'none' ? clientData.accounts?.facebookAds : undefined,
          googleCustomerId: clientData.accounts?.googleAds !== 'none' ? clientData.accounts?.googleAds : undefined
        });

        // Cache with dependencies
        this.cache.set(cacheKey, monthlyLeads, [
          `monthly-leads-${clientId}`,
          `facebook-${clientId}`,
          `google-${clientId}`
        ]);
        
        debugLogger.info('AnalyticsOrchestrator', 'Monthly leads data fetched successfully', {
          months: monthlyLeads.length,
          totalLeads: monthlyLeads.reduce((sum, month) => sum + month.totalLeads, 0)
        });

        return monthlyLeads;
      } catch (error) {
        debugLogger.error('AnalyticsOrchestrator', 'Failed to fetch monthly leads data', error);
        return undefined;
      }
    });
  }

  /**
   * Get lead data with direct API calls
   */
  private static async getLeadData(
    clientId: string, 
    dateRange: DateRange, 
    clientData: Client
  ): Promise<any | undefined> {
    if (!clientData.accounts?.googleSheets || clientData.accounts.googleSheets === 'none') {
      return undefined;
    }

    const cacheKey = `leads-${clientId}-${JSON.stringify(dateRange)}`;
    const cached = this.cache.get<any>(cacheKey);
    if (cached) return cached;

    return this.deduplicator.deduplicate(cacheKey, async () => {
      return sheetsCircuitBreaker.execute(async () => {
        debugLogger.info('AnalyticsOrchestrator', 'Fetching lead data with API calls', { 
          clientId, 
          spreadsheetId: clientData.accounts.googleSheets,
          dateRange 
        });

        // Import LeadDataService dynamically to avoid circular dependencies
        const { LeadDataService } = await import('./leadDataService');
        
        // Get lead data using service
        const leadData = await LeadDataService.fetchLeadData(
          clientData.accounts.googleSheets,
          'Wedding Leads' // Default sheet name
        );

        if (!leadData) {
          debugLogger.warn('AnalyticsOrchestrator', 'Lead data API returned no data');
          return undefined;
        }

        // Cache the raw lead data (don't normalize it here)
        this.cache.set(cacheKey, leadData, [`leads-${clientId}`, `sheets-${clientData.accounts.googleSheets}`]);
        
        debugLogger.info('AnalyticsOrchestrator', 'Lead data fetched successfully', {
          totalLeads: leadData.totalLeads,
          facebookLeads: leadData.facebookLeads,
          googleLeads: leadData.googleLeads,
          totalGuests: leadData.totalGuests
        });

        return leadData;
      }, `Sheets-${clientId}`);
    });
  }

  /**
   * Invalidate cache for specific client or dependency
   */
  static invalidateCache(clientId?: string, dependency?: string): void {
    if (dependency) {
      this.cache.invalidate(dependency);
    } else if (clientId) {
      // Invalidate all client-related cache entries
      const dependencies = [
        `client-${clientId}`,
        `facebook-${clientId}`,
        `google-${clientId}`,
        `ghl-${clientId}`,
        `leads-${clientId}`
      ];
      dependencies.forEach(dep => this.cache.invalidate(dep));
    } else {
      this.cache.clear();
    }
    
    debugLogger.info('AnalyticsOrchestrator', 'Cache invalidated', { clientId, dependency });
  }

  /**
   * Get integration status with caching
   */
  static async getIntegrationStatus(): Promise<{
    facebookAds: boolean;
    googleAds: boolean;
    googleSheets: boolean;
    goHighLevel: boolean;
    googleAi: boolean;
  }> {
    const cacheKey = 'integration-status';
    const cached = this.cache.get<{ facebookAds: boolean; googleAds: boolean; googleSheets: boolean; goHighLevel: boolean; googleAi: boolean }>(cacheKey, 3 * 60 * 1000); // 3 minute cache
    if (cached) return cached;

    return this.deduplicator.deduplicate(cacheKey, async () => {
      const integrations = await DatabaseService.getIntegrations();
      const status = {
        facebookAds: integrations.some(i => i.platform === 'facebookAds' && i.connected),
        googleAds: integrations.some(i => i.platform === 'googleAds' && i.connected),
        googleSheets: integrations.some(i => i.platform === 'googleSheets' && i.connected),
        goHighLevel: integrations.some(i => i.platform === 'goHighLevel' && i.connected),
        googleAi: integrations.some(i => i.platform === 'googleAi' && i.connected),
      };

      this.cache.set(cacheKey, status, ['integrations']);
      return status;
    });
  }

  /**
   * Get performance metrics for monitoring
   */
  static getPerformanceMetrics(): {
    cache: { size: number; maxSize: number; hitRate: number };
    circuitBreakers: { facebook: string; google: string; ghl: string; sheets: string };
  } {
    return {
      cache: this.cache.getStats(),
      circuitBreakers: {
        facebook: facebookCircuitBreaker.getState().toString(),
        google: googleCircuitBreaker.getState().toString(),
        ghl: ghlCircuitBreaker.getState().toString(),
        sheets: sheetsCircuitBreaker.getState().toString()
      }
    };
  }
}

