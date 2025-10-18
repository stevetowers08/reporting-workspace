import { Card } from '@/components/ui/card';
import { EventDashboardData } from '@/services/data/eventMetricsService';
import React from 'react';

interface BudgetDistributionProps {
  data: EventDashboardData | null | undefined;
}

export const BudgetDistribution: React.FC<BudgetDistributionProps> = ({ data }) => {
  // Create guest count distribution based on the Google Sheets data
  const totalLeads = (data?.facebookMetrics?.leads || 0) + (data?.googleMetrics?.leads || 0);
  const averageGuests = data?.eventMetrics?.averageGuests || 0;
  
  // No fake data - show empty state when no real data is available
  return (
    <Card className="bg-white border border-slate-200 shadow-sm p-6">
      <div className="pb-4">
        <h3 className="text-lg font-semibold text-slate-900">Guest Count Distribution</h3>
        <p className="text-sm text-slate-500">Average: {averageGuests.toFixed(0)} guests per lead</p>
      </div>
      <div>
        <div className="text-center text-slate-500 py-8">
          <p>Guest count distribution data not available</p>
          <p className="text-xs mt-1">Real data will be shown when available</p>
        </div>
      </div>
    </Card>
  );
};
