import { Card } from '@/components/ui/card';
import { EventDashboardData } from '@/services/data/eventMetricsService';
import React from 'react';

interface KeyInsightsProps {
  data?: EventDashboardData;
}

export const KeyInsights: React.FC<KeyInsightsProps> = ({ data }) => {
  return (
    <Card className="bg-white border border-slate-200 shadow-sm p-6">
      <div className="pb-3">
        <h3 className="text-lg font-semibold text-slate-900">Key Insights</h3>
      </div>
      <div className="h-64">
        <div className="text-xs text-slate-800 space-y-1">
          <div>• Meta Ads: {data?.facebookMetrics?.leads || '0'} leads at ${(data?.facebookMetrics?.costPerLead || 0).toFixed(2)} CPL</div>
          <div>• Google Ads: {data?.googleMetrics?.leads || '0'} leads at ${(data?.googleMetrics?.costPerLead || 0).toFixed(2)} CPL</div>
          <div>• ROI: {data?.roi?.toFixed(1) || '0.0'}% with ${data?.totalRevenue?.toLocaleString() || '0'} revenue</div>
          <div>• Lead Quality: {data?.leadMetrics?.leadToOpportunityRate?.toFixed(1) || '0.0'}% conversion rate</div>
          <div>• Event Sales: ${data?.ghlMetrics?.pipelineValue?.toLocaleString() || '0'} pipeline with {data?.eventMetrics?.totalEvents || '0'} events</div>
        </div>
      </div>
    </Card>
  );
};
