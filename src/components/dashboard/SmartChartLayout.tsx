import { EventDashboardData } from '@/services/data/eventMetricsService';
import React, { useEffect, useState } from 'react';
import { DailyFunnelAnalytics } from './DailyFunnelAnalytics';
import { EventTypesBreakdown } from './EventTypesBreakdown';
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
}

export const SmartChartLayout: React.FC<SmartChartLayoutProps> = ({ 
  dashboardData, 
  dateRange, 
  locationId 
}) => {
  const [availableCharts, setAvailableCharts] = useState<ChartConfig[]>([]);

  useEffect(() => {
    const charts: ChartConfig[] = [
      {
        id: 'daily-funnel',
        component: DailyFunnelAnalytics,
        props: { locationId, dateRange },
        priority: 1,
        hasData: true // Always show this one
      },
      {
        id: 'event-types',
        component: EventTypesBreakdown,
        props: { data: dashboardData, dateRange },
        priority: 2,
        hasData: true // Always show - component handles empty data gracefully
      },
      {
        id: 'guest-count',
        component: GuestCountDistribution,
        props: { data: dashboardData },
        priority: 3,
        hasData: true // Always show - component handles empty data gracefully
      },
      {
        id: 'opportunity-stages',
        component: OpportunityStagesChart,
        props: { data: dashboardData, dateRange },
        priority: 4,
        hasData: true // Always show opportunities chart - it handles empty data gracefully
      }
    ];

    // Sort by priority - show all charts, let components handle empty data
    const sortedCharts = charts.sort((a, b) => a.priority - b.priority);

    setAvailableCharts(sortedCharts);
  }, [dashboardData, dateRange, locationId]);

  // Create pairs for 2-column layout
  const chartPairs: ChartConfig[][] = [];
  for (let i = 0; i < availableCharts.length; i += 2) {
    chartPairs.push(availableCharts.slice(i, i + 2));
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
            return (
              <ChartComponent
                key={chart.id}
                {...chart.props}
              />
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
