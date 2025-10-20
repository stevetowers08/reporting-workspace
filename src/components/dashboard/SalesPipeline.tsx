import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EventDashboardData } from '@/services/data/eventMetricsService';
import React from 'react';
import { Card } from '@/components/ui/card';

interface SalesPipelineProps {
  data: EventDashboardData | null | undefined;
}

export const SalesPipeline: React.FC<SalesPipelineProps> = ({ data }) => {
  const totalLeads = (data?.facebookMetrics?.leads || 0) + (data?.googleMetrics?.leads || 0);
  
  // Estimate pipeline stages based on typical conversion rates
  const contactedLeads = Math.floor(totalLeads * 0.7); // 70% contacted
  const qualifiedLeads = Math.floor(totalLeads * 0.4); // 40% qualified
  const bookedTours = Math.floor(totalLeads * 0.2); // 20% booked tours
  const sentProposals = Math.floor(totalLeads * 0.15); // 15% sent proposals
  const bookedEvents = Math.floor(totalLeads * 0.1); // 10% booked events

  return (
    <Card className="bg-white border border-slate-200">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-slate-900">Lead Pipeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between">
            <span className="text-sm text-slate-600">Total Leads</span>
            <span className="text-sm font-medium">{totalLeads.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-600">Contacted</span>
            <span className="text-sm font-medium">{contactedLeads.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-600">Qualified</span>
            <span className="text-sm font-medium">{qualifiedLeads.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-600">Tours Booked</span>
            <span className="text-sm font-medium text-blue-600">{bookedTours.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-600">Proposals Sent</span>
            <span className="text-sm font-medium text-orange-600">{sentProposals.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-600">Events Booked</span>
            <span className="text-sm font-medium text-green-600">{bookedEvents.toLocaleString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
