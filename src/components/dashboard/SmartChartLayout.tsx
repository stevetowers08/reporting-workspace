import { ChartErrorWrapper } from '@/components/charts/ChartErrorWrapper';
import { ConditionalGHLChart } from '@/components/charts/ConditionalGHLChart';
import { useChartError } from '@/hooks/useChartError';
import { EventDashboardData } from '@/services/data/eventMetricsService';
import React, { useEffect, useState } from 'react';
import { DailyFunnelAnalytics } from './DailyFunnelAnalytics';
import { EventTypesBreakdown } from './EventTypesBreakdown';
import { GHLOpportunityMetricsCard } from './GHLOpportunityMetricsCard';
import { GuestCountDistribution } from './GuestCountDistribution';
import { OpportunityStagesChart } from './OpportunityStagesChart';

interface SmartChartLayoutProps {
  dashboardData: EventDashboardData | null | undefined;
  dateRange: { start: string; end: string };
  locationId: string;
}

interface ChartConfig {
  id: string;
  component: React.ComponentType<any>;
  props: any;
  priority: number;
  hasData: boolean;
  endpoint?: string;
  errorType?: 'network' | 'api' | 'auth' | 'generic';
}

export const SmartChartLayout: React.FC<SmartChartLayoutProps> = ({ 
  dashboardData, 
  dateRange, 
  locationId 
}) => {
  const [availableCharts, setAvailableCharts] = useState<ChartConfig[]>([]);
  const [_error, setError] = useState<string | null>(null);
  const { error: chartError, setError: setChartError, retry, isRetrying } = useChartError(() => {
    // Retry logic - reload the page or refetch data
    window.location.reload();
  });

  useEffect(() => {
    try {
      const charts: ChartConfig[] = [
        {
          id: 'ghl-opportunity-metrics',
          component: GHLOpportunityMetricsCard,
          props: { data: dashboardData },
          priority: 1,
          hasData: true,
          endpoint: 'GoHighLevel API - Opportunities',
          errorType: 'api'
        },
        {
          id: 'daily-funnel',
          component: DailyFunnelAnalytics,
          props: { locationId, dateRange },
          priority: 2,
          hasData: true,
          endpoint: 'GoHighLevel API - Funnel Analytics',
          errorType: 'api'
        },
        {
          id: 'event-types',
          component: EventTypesBreakdown,
          props: { data: dashboardData, dateRange },
          priority: 3,
          hasData: true,
          endpoint: 'Lead Data Service',
          errorType: 'api'
        },
        {
          id: 'guest-count',
          component: GuestCountDistribution,
          props: { data: dashboardData },
          priority: 4,
          hasData: true,
          endpoint: 'Lead Data Service',
          errorType: 'api'
        },
        {
          id: 'opportunity-stages',
          component: OpportunityStagesChart,
          props: { data: dashboardData, dateRange },
          priority: 5,
          hasData: true,
          endpoint: 'GoHighLevel API - Opportunity Stages',
          errorType: 'api'
        }
      ];

      // Sort by priority - show all charts, let components handle empty data
      const sortedCharts = charts.sort((a, b) => a.priority - b.priority);

      setAvailableCharts(sortedCharts);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize charts';
      setChartError({
        message: errorMessage,
        endpoint: 'Chart Registry',
        reason: 'Initialization Error',
        errorType: 'generic',
        timestamp: Date.now()
      });
      setAvailableCharts([]);
    }
  }, [dashboardData, dateRange, locationId]);

  // Create pairs for 2-column layout
  const chartPairs: ChartConfig[][] = [];
  for (let i = 0; i < availableCharts.length; i += 2) {
    chartPairs.push(availableCharts.slice(i, i + 2));
  }

  if (chartError) {
    return (
      <ChartErrorWrapper
        error={chartError}
        onRetry={retry}
        isRetrying={isRetrying}
        compact={false}
      />
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
    <div className="space-y-6">
      {chartPairs.map((pair, pairIndex) => (
        <div key={pairIndex} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pair.map((chart) => {
            const ChartComponent = chart.component;
            
            // Wrap GHL components with conditional loading
            if (chart.id.includes('ghl') || chart.id.includes('opportunity')) {
              return (
                <div key={chart.id} className="min-h-[300px]">
                  <ConditionalGHLChart 
                    locationId={locationId}
                    hasGHLAccount={!!dashboardData?.clientData?.accounts?.goHighLevel}
                  >
                    <ChartErrorWrapper
                      error={null}
                      isLoading={false}
                      onRetry={() => window.location.reload()}
                      compact={true}
                    >
                      <ChartComponent {...chart.props} />
                    </ChartErrorWrapper>
                  </ConditionalGHLChart>
                </div>
              );
            }
            
            return (
              <div key={chart.id} className="min-h-[300px]">
                <ChartErrorWrapper
                  error={null}
                  isLoading={false}
                  onRetry={() => window.location.reload()}
                  compact={true}
                >
                  <ChartComponent {...chart.props} />
                </ChartErrorWrapper>
              </div>
            );
          })}
          {/* Fill empty space if odd number of charts */}
          {pair.length === 1 && (
            <div className="hidden md:block"></div>
          )}
        </div>
      ))}
    </div>
  );
};
