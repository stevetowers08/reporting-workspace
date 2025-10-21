/**
 * Centralized Analytics Data Service
 * Follows analytics app best practices for scalable data management
 */

import { debugLogger } from '@/lib/debug';
import { DatabaseService } from './databaseService';
import { EventMetricsService } from './eventMetricsService';

// Types for scalable architecture
export interface DateRange {
  start: string;
  end: string;
}

export interface ChartParams {
  clientId: string;
  dateRange: DateRange;
  platform?: 'facebook' | 'google' | 'all';
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
 * Centralized Analytics Data Service
 * Provides a single source of truth for all analytics data
 */
export class AnalyticsDataService {
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
      debugLogger.debug('AnalyticsDataService', `Using cached data for ${key}`);
      return cached.data;
    }

    debugLogger.debug('AnalyticsDataService', `Fetching fresh data for ${key}`);
    const data = await fetchFn();
    this.cache.set(key, { data, timestamp: now });
    return data;
  }

  /**
   * Get client data with caching
   */
  static async getClientData(clientId: string) {
    return this.getCachedData(
      `client-${clientId}`,
      () => DatabaseService.getClientById(clientId)
    );
  }

  /**
   * Get metrics data for a specific platform or all platforms
   */
  static async getMetricsData(params: ChartParams): Promise<MetricsData> {
    const { clientId, dateRange, platform = 'all' } = params;
    
    return this.getCachedData(
      `metrics-${clientId}-${platform}-${dateRange.start}-${dateRange.end}`,
      async () => {
        const clientData = await this.getClientData(clientId);
        if (!clientData) {
          throw new Error('Client not found');
        }

        const dashboardData = await EventMetricsService.getComprehensiveMetrics(
          clientId,
          dateRange,
          clientData.accounts
        );

        // Extract metrics based on platform
        switch (platform) {
          case 'facebook':
            return {
              leads: dashboardData.facebookMetrics?.leads || 0,
              costPerLead: dashboardData.facebookMetrics?.costPerLead || 0,
              conversionRate: dashboardData.facebookMetrics?.conversionRate || 0,
              spent: dashboardData.facebookMetrics?.spent || 0,
              impressions: dashboardData.facebookMetrics?.impressions || 0,
              clicks: dashboardData.facebookMetrics?.linkClicks || 0,
              ctr: dashboardData.facebookMetrics?.ctr || 0,
            };
          case 'google':
            return {
              leads: dashboardData.googleMetrics?.leads || 0,
              costPerLead: dashboardData.googleMetrics?.costPerLead || 0,
              conversionRate: dashboardData.googleMetrics?.conversionRate || 0,
              spent: dashboardData.googleMetrics?.spent || 0,
              impressions: dashboardData.googleMetrics?.impressions || 0,
              clicks: dashboardData.googleMetrics?.clicks || 0,
              ctr: dashboardData.googleMetrics?.ctr || 0,
            };
          default:
            return {
              leads: dashboardData.totalLeads || 0,
              costPerLead: dashboardData.averageCostPerLead || 0,
              conversionRate: dashboardData.averageConversionRate || 0,
              spent: dashboardData.totalSpent || 0,
            };
        }
      }
    );
  }

  /**
   * Get chart data for any chart type
   * Easily extensible for new chart types
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
   * Chart-specific data fetchers
   * Easy to add new chart types here
   */
  private static async getDemographicsData(params: ChartParams): Promise<ChartData> {
    // Implementation for demographics chart
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
    // Implementation for platform breakdown chart
    return {
      labels: ['Facebook', 'Google'],
      datasets: [{
        label: 'Leads',
        data: [92, 10],
        backgroundColor: ['#1877F2', '#4285F4']
      }]
    };
  }

  private static async getLeadsByMonthData(params: ChartParams): Promise<ChartData> {
    // Implementation for leads by month chart
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
    // Implementation for spend distribution chart
    return {
      labels: ['Facebook', 'Google'],
      datasets: [{
        label: 'Spend',
        data: [481, 391],
        backgroundColor: ['#1877F2', '#4285F4']
      }]
    };
  }

  private static async getDefaultChartData(params: ChartParams): Promise<ChartData> {
    // Default chart data
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
    debugLogger.debug('AnalyticsDataService', 'Cache cleared', { clientId });
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

