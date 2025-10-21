/**
 * Scalable Chart Data Hooks
 * Follows analytics app best practices for easy chart addition
 */

import { useQuery } from '@tanstack/react-query';
import { AnalyticsDataService, ChartParams, MetricsData } from '@/services/data/analyticsDataService';

/**
 * Generic hook for any chart data
 * Easy to use for new charts
 */
export const useChartData = (params: ChartParams) => {
  return useQuery({
    queryKey: ['chart', params.chartType, params.clientId, params.dateRange, params.platform],
    queryFn: () => AnalyticsDataService.getChartData(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
    refetchOnWindowFocus: false,
    enabled: !!params.clientId && !!params.dateRange,
  });
};

/**
 * Generic hook for metrics data
 */
export const useMetricsData = (params: ChartParams) => {
  return useQuery({
    queryKey: ['metrics', params.clientId, params.dateRange, params.platform],
    queryFn: () => AnalyticsDataService.getMetricsData(params),
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    enabled: !!params.clientId && !!params.dateRange,
  });
};

/**
 * Specific chart hooks for common charts
 * Easy to add new chart types
 */
export const useDemographicsChart = (clientId: string, dateRange: any, platform?: string) => {
  return useChartData({
    clientId,
    dateRange,
    platform: platform as any,
    chartType: 'demographics',
  });
};

export const usePlatformBreakdownChart = (clientId: string, dateRange: any, platform?: string) => {
  return useChartData({
    clientId,
    dateRange,
    platform: platform as any,
    chartType: 'platform-breakdown',
  });
};

export const useLeadsByMonthChart = (clientId: string, dateRange: any, platform?: string) => {
  return useChartData({
    clientId,
    dateRange,
    platform: platform as any,
    chartType: 'leads-by-month',
  });
};

export const useSpendDistributionChart = (clientId: string, dateRange: any, platform?: string) => {
  return useChartData({
    clientId,
    dateRange,
    platform: platform as any,
    chartType: 'spend-distribution',
  });
};

/**
 * Platform-specific metrics hooks
 * Easy to add new platforms
 */
export const useFacebookMetrics = (clientId: string, dateRange: any) => {
  return useMetricsData({
    clientId,
    dateRange,
    platform: 'facebook',
  });
};

export const useGoogleMetrics = (clientId: string, dateRange: any) => {
  return useMetricsData({
    clientId,
    dateRange,
    platform: 'google',
  });
};

export const useAllPlatformsMetrics = (clientId: string, dateRange: any) => {
  return useMetricsData({
    clientId,
    dateRange,
    platform: 'all',
  });
};

/**
 * Utility hook for cache management
 */
export const useAnalyticsCache = () => {
  return {
    clearCache: (clientId?: string) => AnalyticsDataService.clearCache(clientId),
    getCacheStats: () => AnalyticsDataService.getCacheStats(),
  };
};

