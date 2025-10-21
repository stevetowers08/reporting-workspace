/**
 * Chart Registry
 * Implements dynamic chart loading based on data availability
 * Easy to add new chart types and platforms
 */

import { debugLogger } from '@/lib/debug';
import { EventDashboardData } from '@/types';
import React, { ComponentType, lazy } from 'react';

// Chart configuration interface
interface ChartConfig {
  id: string;
  name: string;
  description: string;
  component: ComponentType<any>;
  dependencies: string[]; // What data this chart needs
  platforms: string[]; // Which platforms this chart supports
  priority: number; // Higher priority charts load first
  category: 'overview' | 'platform' | 'detailed' | 'insights';
  errorHandler?: (error: any) => any; // Custom error handler
}

// Chart registry class
class ChartRegistry {
  private charts = new Map<string, ChartConfig>();
  private loadedCharts = new Set<string>();

  /**
   * Register a chart configuration
   */
  register(config: ChartConfig): void {
    this.charts.set(config.id, config);
    debugLogger.debug('ChartRegistry', `Registered chart: ${config.id}`, config);
  }

  /**
   * Get charts that can be loaded based on available data
   */
  getAvailableCharts(data: EventDashboardData, category?: string): ChartConfig[] {
    const availableCharts: ChartConfig[] = [];

    for (const [id, config] of this.charts) {
      // Filter by category if specified
      if (category && config.category !== category) continue;

      // Check if all dependencies are met
      const canLoad = config.dependencies.every(dep => {
        switch (dep) {
          case 'facebook':
            return data.facebookMetrics !== undefined;
          case 'google':
            return data.googleMetrics !== undefined;
          case 'ghl':
            return data.ghlMetrics !== undefined;
          case 'leads':
            return data.leadMetrics !== undefined;
          case 'client':
            return data.clientData !== undefined;
          default:
            return true;
        }
      });

      if (canLoad) {
        availableCharts.push(config);
      }
    }

    // Sort by priority (higher first)
    return availableCharts.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get chart configuration by ID
   */
  getChart(id: string): ChartConfig | undefined {
    return this.charts.get(id);
  }

  /**
   * Mark chart as loaded
   */
  markLoaded(id: string): void {
    this.loadedCharts.add(id);
    debugLogger.debug('ChartRegistry', `Chart loaded: ${id}`);
  }

  /**
   * Check if chart is loaded
   */
  isLoaded(id: string): boolean {
    return this.loadedCharts.has(id);
  }

  /**
   * Get all registered charts
   */
  getAllCharts(): ChartConfig[] {
    return Array.from(this.charts.values());
  }
}

// Create global registry instance
const chartRegistry = new ChartRegistry();

// Lazy-loaded chart components
const SummaryMetricsCards = lazy(() => 
  import('@/components/dashboard/SummaryMetricsCards')
    .then(module => ({ default: module.SummaryMetricsCards }))
    .catch(() => ({ 
      default: React.memo(() => React.createElement('div', null, 'Failed to load SummaryMetricsCards')) 
    }))
);

const PlatformPerformanceStatusChart = lazy(() => 
  import('@/components/dashboard/PlatformPerformanceStatusChart')
    .then(module => ({ default: module.PlatformPerformanceStatusChart }))
    .catch(() => ({ 
      default: React.memo(() => React.createElement('div', null, 'Failed to load PlatformPerformanceStatusChart')) 
    }))
);

const LeadByMonthChart = lazy(() => 
  import('@/components/dashboard/LeadByDayChart')
    .then(module => ({ default: module.LeadByMonthChart }))
    .catch(() => ({ 
      default: React.memo(() => React.createElement('div', null, 'Failed to load LeadByMonthChart')) 
    }))
);

const KeyInsights = lazy(() => 
  import('@/components/dashboard/KeyInsights')
    .then(module => ({ default: module.KeyInsights }))
    .catch(() => ({ 
      default: React.memo(() => React.createElement('div', null, 'Failed to load KeyInsights')) 
    }))
);

const MetaAdsMetricsCards = lazy(() => 
  import('@/components/dashboard/MetaAdsMetricsCards')
    .then(module => ({ default: module.MetaAdsMetricsCards }))
    .catch(() => ({ 
      default: React.memo(() => React.createElement('div', null, 'Failed to load MetaAdsMetricsCards')) 
    }))
);

const MetaAdsDemographics = lazy(() => 
  import('@/components/dashboard/MetaAdsDemographics')
    .then(module => ({ default: module.MetaAdsDemographics }))
    .catch(() => ({ 
      default: React.memo(() => React.createElement('div', null, 'Failed to load MetaAdsDemographics')) 
    }))
);

const MetaAdsPlatformBreakdown = lazy(() => 
  import('@/components/dashboard/MetaAdsPlatformBreakdown')
    .then(module => ({ default: module.MetaAdsPlatformBreakdown }))
    .catch(() => ({ 
      default: React.memo(() => React.createElement('div', null, 'Failed to load MetaAdsPlatformBreakdown')) 
    }))
);

// Register all charts
chartRegistry.register({
  id: 'summary-metrics',
  name: 'Summary Metrics',
  description: 'Key performance indicators across all platforms',
  component: SummaryMetricsCards,
  dependencies: ['client'],
  platforms: ['facebook', 'google', 'ghl'],
  priority: 100,
  category: 'overview'
});

chartRegistry.register({
  id: 'platform-performance',
  name: 'Platform Performance',
  description: 'Performance comparison across platforms',
  component: PlatformPerformanceStatusChart,
  dependencies: ['facebook', 'google'],
  platforms: ['facebook', 'google'],
  priority: 90,
  category: 'overview'
});

chartRegistry.register({
  id: 'leads-by-month',
  name: 'Leads by Month',
  description: 'Monthly lead trends',
  component: LeadByMonthChart,
  dependencies: ['leads'],
  platforms: ['facebook', 'google'],
  priority: 80,
  category: 'overview'
});

chartRegistry.register({
  id: 'key-insights',
  name: 'Key Insights',
  description: 'AI-powered insights and recommendations',
  component: KeyInsights,
  dependencies: ['facebook', 'google', 'ghl'],
  platforms: ['facebook', 'google', 'ghl'],
  priority: 70,
  category: 'insights'
});

chartRegistry.register({
  id: 'meta-metrics',
  name: 'Meta Ads Metrics',
  description: 'Facebook and Instagram advertising metrics',
  component: MetaAdsMetricsCards,
  dependencies: ['facebook'],
  platforms: ['facebook'],
  priority: 60,
  category: 'platform'
});

chartRegistry.register({
  id: 'meta-demographics',
  name: 'Meta Demographics',
  description: 'Audience demographics for Meta ads',
  component: MetaAdsDemographics,
  dependencies: ['facebook'],
  platforms: ['facebook'],
  priority: 50,
  category: 'platform'
});

chartRegistry.register({
  id: 'meta-platform-breakdown',
  name: 'Meta Platform Breakdown',
  description: 'Facebook vs Instagram performance',
  component: MetaAdsPlatformBreakdown,
  dependencies: ['facebook'],
  platforms: ['facebook'],
  priority: 40,
  category: 'platform'
});

// Export registry and utility functions
export { chartRegistry };

export const getAvailableCharts = (data: EventDashboardData, category?: string) => {
  return chartRegistry.getAvailableCharts(data, category);
};

export const getChartConfig = (id: string) => {
  return chartRegistry.getChart(id);
};

export const markChartLoaded = (id: string) => {
  chartRegistry.markLoaded(id);
};

// Hook for dynamic chart loading
export const useDynamicCharts = (data: EventDashboardData, category?: string) => {
  const [loadedCharts, setLoadedCharts] = React.useState<Set<string>>(new Set());
  
  const availableCharts = React.useMemo(() => {
    return getAvailableCharts(data, category);
  }, [data, category]);

  const loadChart = React.useCallback((chartId: string) => {
    setLoadedCharts(prev => new Set([...prev, chartId]));
    markChartLoaded(chartId);
  }, []);

  return {
    availableCharts,
    loadedCharts,
    loadChart,
    isLoading: availableCharts.length > loadedCharts.size
  };
};
