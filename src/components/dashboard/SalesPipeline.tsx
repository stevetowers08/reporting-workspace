import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EventDashboardData } from '@/services/data/eventMetricsService';
import React from 'react';

interface SalesPipelineProps {
  data: EventDashboardData | null | undefined;
}

export const SalesPipeline: React.FC<SalesPipelineProps> = ({ data }) => {
  return (
    <Card className="bg-white border border-slate-200 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-slate-900">Sales Pipeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between">
            <span className="text-sm text-slate-600">Total Contacts</span>
            <span className="text-sm font-medium">{data?.ghlMetrics?.totalContacts || '0'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-600">New Contacts</span>
            <span className="text-sm font-medium">{data?.ghlMetrics?.newContacts || '0'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-600">Total Opportunities</span>
            <span className="text-sm font-medium">{data?.ghlMetrics?.totalOpportunities || '0'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-600">Won Opportunities</span>
            <span className="text-sm font-medium text-green-600">{data?.ghlMetrics?.wonOpportunities || '0'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-600">Lost Opportunities</span>
            <span className="text-sm font-medium text-red-600">{data?.ghlMetrics?.lostOpportunities || '0'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
