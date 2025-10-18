import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EventDashboardData } from '@/services/data/eventMetricsService';
import React from 'react';

interface SalesPipelineProps {
  data: EventDashboardData | null | undefined;
}

export const SalesPipeline: React.FC<SalesPipelineProps> = ({ data }) => {
  const totalLeads = (data?.facebookMetrics?.leads || 0) + (data?.googleMetrics?.leads || 0);
  
  // Only show total leads - no fake conversion data
  return (
    <Card className="bg-white border border-slate-200 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-slate-900">Lead Pipeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between">
            <span className="text-sm text-slate-600">Total Leads</span>
            <span className="text-sm font-medium">{totalLeads.toLocaleString()}</span>
          </div>
          {totalLeads > 0 ? (
            <div className="text-center text-slate-500 py-4">
              <p className="text-sm">Pipeline data not available</p>
              <p className="text-xs mt-1">Real conversion data will be shown when CRM integration is implemented</p>
            </div>
          ) : (
            <div className="text-center text-slate-500 py-4">
              <p className="text-sm">No leads data available</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
