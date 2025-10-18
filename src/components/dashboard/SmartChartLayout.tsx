import { EventDashboardData } from '@/services/data/eventMetricsService';
import React, { useMemo, useState } from 'react';
import { ComparisonChart } from './ComparisonChart';
import { EventTypesBreakdown } from './EventTypesBreakdown';
import { EventTypesBySource } from './EventTypesBySource';
import { GuestCountDistribution } from './GuestCountDistribution';
import { LeadQualityBySource } from './LeadQualityBySource';
import { LeadQualityMetrics } from './LeadQualityMetrics';

interface SmartChartLayoutProps {
  dashboardData: EventDashboardData | null | undefined;
  dateRange: { start: string; end: string };
  locationId: string;
  showExtraCharts?: boolean;
}

interface ChartConfig {
  id: string;
  component: React.ComponentType<any>;
  props: any;
  priority: number;
  hasData: boolean;
}

export const SmartChartLayout: React.FC<SmartChartLayoutProps> = ({ 
  dashboardData, 
  dateRange, 
  locationId,
  showExtraCharts = false
}) => {
  const [error, setError] = useState<string | null>(null);

  // Memoize chart configuration to prevent unnecessary re-renders
  const availableCharts = useMemo(() => {
    try {
      const charts: ChartConfig[] = [];
      
      // Only add EventTypesBreakdown if 'type' column exists
      const leadData = (dashboardData as any)?.leadData;
      if (leadData?.availableColumns?.hasTypeColumn) {
        charts.push({
          id: 'event-types',
          component: EventTypesBreakdown,
          props: { data: dashboardData, dateRange },
          priority: 1,
          hasData: true
        });
      }
      
      // Always show GuestCountDistribution - component handles empty data gracefully
      charts.push({
        id: 'guest-count',
        component: GuestCountDistribution,
        props: { data: dashboardData },
        priority: 2,
        hasData: true
      });

      // Add lead quality charts if source column is available
      if (leadData?.availableColumns?.hasSourceColumn) {
        // Lead Quality by Source Chart
        charts.push({
          id: 'lead-quality-by-source',
          component: LeadQualityBySource,
          props: { data: dashboardData, dateRange },
          priority: 3,
          hasData: true
        });

        // Event Types by Source Chart
        charts.push({
          id: 'event-types-by-source',
          component: EventTypesBySource,
          props: { data: dashboardData, dateRange },
          priority: 4,
          hasData: true
        });

        // Lead Quality Metrics
        charts.push({
          id: 'lead-quality-metrics',
          component: LeadQualityMetrics,
          props: { data: dashboardData, dateRange },
          priority: 5,
          hasData: true
        });
      }

      // Add comparison charts if leadDataComparison is available
      const leadDataComparison = (dashboardData as any)?.leadDataComparison;
      if (leadDataComparison) {
        // Event Types Comparison
        if (leadDataComparison.allTime?.availableColumns?.hasTypeColumn) {
          charts.push({
            id: 'event-types-comparison',
            component: ComparisonChart,
            props: { 
              data: dashboardData, 
              title: 'Event Types Comparison',
              dataKey: 'eventTypes',
              colorAllTime: '#3b82f6',
              colorLastMonth: '#ef4444'
            },
            priority: 6,
            hasData: true
          });
        }

        // Guest Count Comparison
        if (leadDataComparison.allTime?.availableColumns?.hasGuestCountColumn) {
          charts.push({
            id: 'guest-count-comparison',
            component: ComparisonChart,
            props: { 
              data: dashboardData, 
              title: 'Guest Count Comparison',
              dataKey: 'guestRanges',
              colorAllTime: '#10b981',
              colorLastMonth: '#f59e0b'
            },
            priority: 7,
            hasData: true
          });
        }

        // Lead Sources Comparison
        if (leadDataComparison.allTime?.availableColumns?.hasSourceColumn) {
          charts.push({
            id: 'lead-sources-comparison',
            component: ComparisonChart,
            props: { 
              data: dashboardData, 
              title: 'Lead Sources Comparison',
              dataKey: 'leadSources',
              colorAllTime: '#8b5cf6',
              colorLastMonth: '#ec4899'
            },
            priority: 8,
            hasData: true
          });
        }
      }

      // Sort by priority - show all charts, let components handle empty data
      return charts.sort((a, b) => a.priority - b.priority);
    } catch (error) {
      console.error('SmartChartLayout error:', error);
      setError('Failed to initialize charts');
      return [];
    }
  }, [dashboardData, dateRange, locationId, showExtraCharts]);

  // Remove the useEffect since we're using useMemo directly

  // Create pairs for 2-column layout
  const chartPairs: ChartConfig[][] = [];
  for (let i = 0; i < availableCharts.length; i += 2) {
    chartPairs.push(availableCharts.slice(i, i + 2));
  }

  if (error) {
    return (
      <div className="text-center py-8 text-slate-500">
        <p>{error}</p>
        <p className="text-sm mt-2">Please try refreshing the page.</p>
      </div>
    );
  }

  if (availableCharts.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <p>No chart data available for the selected period.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {chartPairs.map((pair, pairIndex) => (
        <div key={pairIndex} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {pair.map((chart) => {
            const ChartComponent = chart.component;
            return (
              <div key={chart.id} className="w-full min-h-[400px]">
                <ChartComponent
                  {...chart.props}
                />
              </div>
            );
          })}
          {/* Fill empty space if odd number of charts */}
          {pair.length === 1 && (
            <div className="hidden lg:block"></div>
          )}
        </div>
      ))}
    </div>
  );
};
