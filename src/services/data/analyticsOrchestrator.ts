/**
 * Analytics Service Orchestrator
 * Coordinates existing domain services following microservices best practices
 * 
 * This follows the "Service Orchestration" pattern rather than monolithic centralization
 */

import { debugLogger } from '@/lib/debug';
import { GoHighLevelAnalyticsService } from '@/services/ghl/goHighLevelAnalyticsService';
import { DatabaseService } from './databaseService';
import { EventMetricsService } from './eventMetricsService';

// Types for orchestration
export interface DateRange {
  start: string;
  end: string;
}

export interface ChartParams {
  clientId: string;
  dateRange: DateRange;
  platform?: 'facebook' | 'google' | 'ghl' | 'all';
  chartType?: string;
}

export interface MetricsData {
  leads: number;
  costPerLead: number;
  conversionRate: number;
  spent: number;
  impressions?: number;
  clicks?: number;
  ctr?: number;
}

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string;
  }>;
}

/**
 * Service Orchestrator - Coordinates existing services
 * Follows microservices best practices by delegating to domain services
 */
export class AnalyticsOrchestrator {
  private static cache = new Map<string, { data: any; timestamp: number }>();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cached data or fetch fresh data
   */
  private static async getCachedData<T>(
    key: string,
    fetchFn: () => Promise<T>
  ): Promise<T> {
    const now = Date.now();
    const cached = this.cache.get(key);

    if (cached && (now - cached.timestamp) < this.CACHE_DURATION) {
      debugLogger.debug('AnalyticsOrchestrator', `Using cached data for ${key}`);
      return cached.data;
    }

    debugLogger.debug('AnalyticsOrchestrator', `Fetching fresh data for ${key}`);
    const data = await fetchFn();
    this.cache.set(key, { data, timestamp: now });
    return data;
  }

  /**
   * Get client data - delegates to DatabaseService
   */
  static async getClientData(clientId: string) {
    return this.getCachedData(
      `client-${clientId}`,
      () => DatabaseService.getClientById(clientId)
    );
  }

  /**
   * Get comprehensive metrics - orchestrates multiple services
   */
  static async getComprehensiveMetrics(params: ChartParams): Promise<any> {
    const { clientId, dateRange, platform = 'all' } = params;
    
    return this.getCachedData(
      `comprehensive-${clientId}-${platform}-${dateRange.start}-${dateRange.end}`,
      async () => {
        // Get client data first
        const clientData = await this.getClientData(clientId);
        if (!clientData) {
          throw new Error('Client not found');
        }

        // Extract account information
        const clientAccounts = {
          facebookAds: clientData.accounts?.facebookAds,
          googleAds: clientData.accounts?.googleAds,
          goHighLevel: clientData.accounts?.goHighLevel,
          googleSheets: clientData.accounts?.googleSheets
        };

        // Delegate to EventMetricsService for comprehensive data
        const result = await EventMetricsService.getComprehensiveMetrics(
          clientId,
          dateRange,
          clientAccounts,
          undefined, // clientConversionActions
          true // includePreviousPeriod
        );

        return result;
      }
    );
  }

  /**
   * Get platform-specific metrics - delegates to appropriate service
   */
  static async getPlatformMetrics(params: ChartParams): Promise<MetricsData> {
    const { clientId, dateRange, platform = 'all' } = params;
    
    return this.getCachedData(
      `platform-${clientId}-${platform}-${dateRange.start}-${dateRange.end}`,
      async () => {
        const clientData = await this.getClientData(clientId);
        if (!clientData) {
          throw new Error('Client not found');
        }

        // Delegate to appropriate service based on platform
        switch (platform) {
          case 'facebook':
            return this.getFacebookMetrics(clientId, dateRange, clientData);
          case 'google':
            return this.getGoogleMetrics(clientId, dateRange, clientData);
          case 'ghl':
            return this.getGHLMetrics(clientId, dateRange, clientData);
          default:
            return this.getAllPlatformMetrics(clientId, dateRange, clientData);
        }
      }
    );
  }

  /**
   * Get Facebook metrics - delegates to EventMetricsService
   */
  private static async getFacebookMetrics(clientId: string, dateRange: DateRange, clientData: any): Promise<MetricsData> {
    const comprehensiveData = await EventMetricsService.getComprehensiveMetrics(
      clientId,
      dateRange,
      {
        facebookAds: clientData.accounts?.facebookAds,
        googleAds: clientData.accounts?.googleAds,
        goHighLevel: clientData.accounts?.goHighLevel,
        googleSheets: clientData.accounts?.googleSheets
      }
    );

    return {
      leads: comprehensiveData.facebookMetrics?.leads || 0,
      costPerLead: comprehensiveData.facebookMetrics?.costPerLead || 0,
      conversionRate: comprehensiveData.facebookMetrics?.conversions || 0,
      spent: comprehensiveData.facebookMetrics?.spend || 0,
      impressions: comprehensiveData.facebookMetrics?.impressions || 0,
      clicks: comprehensiveData.facebookMetrics?.clicks || 0,
      ctr: comprehensiveData.facebookMetrics?.ctr || 0,
    };
  }

  /**
   * Get Google metrics - delegates to EventMetricsService
   */
  private static async getGoogleMetrics(clientId: string, dateRange: DateRange, clientData: any): Promise<MetricsData> {
    const comprehensiveData = await EventMetricsService.getComprehensiveMetrics(
      clientId,
      dateRange,
      {
        facebookAds: clientData.accounts?.facebookAds,
        googleAds: clientData.accounts?.googleAds,
        goHighLevel: clientData.accounts?.goHighLevel,
        googleSheets: clientData.accounts?.googleSheets
      }
    );

    return {
      leads: comprehensiveData.googleMetrics?.leads || 0,
      costPerLead: comprehensiveData.googleMetrics?.costPerLead || 0,
      conversionRate: comprehensiveData.googleMetrics?.conversionRate || 0,
      spent: comprehensiveData.googleMetrics?.cost || 0,
      impressions: comprehensiveData.googleMetrics?.impressions || 0,
      clicks: comprehensiveData.googleMetrics?.clicks || 0,
      ctr: comprehensiveData.googleMetrics?.ctr || 0,
    };
  }

  /**
   * Get GHL metrics - delegates to GoHighLevelAnalyticsService
   */
  private static async getGHLMetrics(clientId: string, dateRange: DateRange, clientData: any): Promise<MetricsData> {
    const locationId = clientData.accounts?.goHighLevel;
    if (!locationId || locationId === 'none') {
      return {
        leads: 0,
        costPerLead: 0,
        conversionRate: 0,
        spent: 0,
      };
    }

    const apiDateRange = {
      startDate: dateRange.start,
      endDate: dateRange.end
    };

    const result = await GoHighLevelAnalyticsService.getGHLMetrics(locationId, apiDateRange);
    
    return {
      leads: result?.contacts?.total || 0,
      costPerLead: 0, // GHL doesn't have cost data
      conversionRate: 0, // GHL doesn't have conversion data
      spent: 0, // GHL doesn't have spend data
    };
  }

  /**
   * Get all platform metrics - orchestrates multiple services
   */
  private static async getAllPlatformMetrics(clientId: string, dateRange: DateRange, clientData: any): Promise<MetricsData> {
    // Get comprehensive metrics from EventMetricsService
    const comprehensiveData = await EventMetricsService.getComprehensiveMetrics(
      clientId,
      dateRange,
      {
        facebookAds: clientData.accounts?.facebookAds,
        googleAds: clientData.accounts?.googleAds,
        goHighLevel: clientData.accounts?.goHighLevel,
        googleSheets: clientData.accounts?.googleSheets
      }
    );

    return {
      leads: comprehensiveData.totalLeads || 0,
      costPerLead: comprehensiveData.leadMetrics?.overallCostPerLead || 0,
      conversionRate: 0, // No overall conversion rate available
      spent: comprehensiveData.totalSpend || 0,
    };
  }

  /**
   * Get chart data - delegates to appropriate chart data fetchers
   */
  static async getChartData(params: ChartParams): Promise<ChartData> {
    const { chartType = 'default' } = params;
    
    return this.getCachedData(
      `chart-${chartType}-${JSON.stringify(params)}`,
      async () => {
        // Route to appropriate chart data fetcher
        switch (chartType) {
          case 'demographics':
            return this.getDemographicsData(params);
          case 'platform-breakdown':
            return this.getPlatformBreakdownData(params);
          case 'leads-by-month':
            return this.getLeadsByMonthData(params);
          case 'spend-distribution':
            return this.getSpendDistributionData(params);
          default:
            return this.getDefaultChartData(params);
        }
      }
    );
  }

  /**
   * Chart-specific data fetchers - can delegate to existing services
   */
  private static async getDemographicsData(_params: ChartParams): Promise<ChartData> {
    // For now, return mock data - can be replaced with real service calls
    return {
      labels: ['25-34', '35-44', '45-54', '55+'],
      datasets: [{
        label: 'Leads by Age',
        data: [25, 35, 30, 10],
        backgroundColor: '#3B82F6'
      }]
    };
  }

  private static async getPlatformBreakdownData(params: ChartParams): Promise<ChartData> {
    // Get platform metrics and create breakdown
    const facebookMetrics = await this.getPlatformMetrics({ ...params, platform: 'facebook' });
    const googleMetrics = await this.getPlatformMetrics({ ...params, platform: 'google' });
    
    return {
      labels: ['Facebook', 'Google'],
      datasets: [{
        label: 'Leads',
        data: [facebookMetrics.leads, googleMetrics.leads],
        backgroundColor: '#1877F2'
      }]
    };
  }

  private static async getLeadsByMonthData(_params: ChartParams): Promise<ChartData> {
    // Mock data - can be replaced with real service calls
    return {
      labels: ['Jun', 'Jul', 'Aug', 'Sep'],
      datasets: [{
        label: 'Leads',
        data: [15, 25, 35, 45],
        backgroundColor: '#10B981'
      }]
    };
  }

  private static async getSpendDistributionData(params: ChartParams): Promise<ChartData> {
    // Get platform metrics and create spend distribution
    const facebookMetrics = await this.getPlatformMetrics({ ...params, platform: 'facebook' });
    const googleMetrics = await this.getPlatformMetrics({ ...params, platform: 'google' });
    
    return {
      labels: ['Facebook', 'Google'],
      datasets: [{
        label: 'Spend',
        data: [facebookMetrics.spent, googleMetrics.spent],
        backgroundColor: '#1877F2'
      }]
    };
  }

  private static async getDefaultChartData(_params: ChartParams): Promise<ChartData> {
    return {
      labels: ['Default'],
      datasets: [{
        label: 'Default',
        data: [0],
        backgroundColor: '#6B7280'
      }]
    };
  }

  /**
   * Clear cache for specific client or all cache
   */
  static clearCache(clientId?: string) {
    if (clientId) {
      // Clear cache for specific client
      for (const [key] of this.cache) {
        if (key.includes(clientId)) {
          this.cache.delete(key);
        }
      }
    } else {
      // Clear all cache
      this.cache.clear();
    }
    debugLogger.debug('AnalyticsOrchestrator', 'Cache cleared', { clientId });
  }

  /**
   * Get cache statistics for monitoring
   */
  static getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}
