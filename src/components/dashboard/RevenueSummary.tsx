import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EventDashboardData } from '@/services/data/eventMetricsService';
import React from 'react';

interface RevenueSummaryProps {
  data: EventDashboardData | null | undefined;
}

export const RevenueSummary: React.FC<RevenueSummaryProps> = ({ data }) => {
  return (
    <Card className="bg-white border border-slate-200 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-slate-900">Revenue Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between">
            <span className="text-sm text-slate-600">Total Revenue</span>
            <span className="text-sm font-medium">${data?.totalRevenue?.toLocaleString() || '0'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-600">Total Spend</span>
            <span className="text-sm font-medium">${data?.totalSpend?.toLocaleString() || '0'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-600">ROI</span>
            <span className="text-sm font-medium text-green-600">{data?.roi?.toFixed(1) || '0.0'}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-600">Most Popular</span>
            <span className="text-sm font-medium">{data?.leadMetrics?.mostPopularEventType || 'N/A'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
