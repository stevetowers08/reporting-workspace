import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EventDashboardData } from '@/services/data/eventMetricsService';
import React from 'react';

interface RevenueSummaryProps {
  data: EventDashboardData | null | undefined;
}

export const RevenueSummary: React.FC<RevenueSummaryProps> = ({ data }) => {
  const totalLeads = (data?.facebookMetrics?.leads || 0) + (data?.googleMetrics?.leads || 0);
  const totalGuests = data?.eventMetrics?.averageGuests || 0;
  const averageGuestsPerLead = totalLeads > 0 ? totalGuests / totalLeads : 0;

  return (
    <Card className="bg-white border border-slate-200 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-slate-900">Lead Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between">
            <span className="text-sm text-slate-600">Total Leads</span>
            <span className="text-sm font-medium">{totalLeads.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-600">Total Guests</span>
            <span className="text-sm font-medium">{totalGuests.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-600">Avg Guests/Lead</span>
            <span className="text-sm font-medium text-green-600">{averageGuestsPerLead.toFixed(1)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-600">Top Source</span>
            <span className="text-sm font-medium">
              {(data?.facebookMetrics?.leads || 0) > (data?.googleMetrics?.leads || 0) ? 'Facebook Ads' : 'Google Ads'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
