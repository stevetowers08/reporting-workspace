import { Card } from '@/components/ui/card';
import React from 'react';

interface GHLOpportunityMetricsCardProps {
  data: {
    ghlMetrics?: {
      totalOpportunities?: number;
      pipelineValue?: number;
      avgDealSize?: number;
      conversionRate?: number;
      wonOpportunities?: number;
      lostOpportunities?: number;
      wonRevenue?: number;
    } | null;
  } | null;
}

export const GHLOpportunityMetricsCard: React.FC<GHLOpportunityMetricsCardProps> = ({ data }) => {
  const isGHLConnected = data?.ghlMetrics !== null && data?.ghlMetrics !== undefined;
  const metrics = data?.ghlMetrics;

  if (!isGHLConnected) {
    return (
      <Card className="bg-white border border-slate-200 shadow-sm p-6">
        <div className="pb-3">
          <h3 className="text-lg font-semibold text-slate-900">Opportunity Metrics</h3>
          <p className="text-sm text-slate-600">GoHighLevel pipeline data</p>
        </div>
        <div className="h-32 flex items-center justify-center">
          <div className="text-center">
            <div className="text-slate-500 mb-2">GoHighLevel Not Connected</div>
            <div className="text-sm text-slate-400">Connect GoHighLevel to view opportunity metrics</div>
          </div>
        </div>
      </Card>
    );
  }

  const totalOpportunities = metrics?.totalOpportunities || 0;
  const pipelineValue = metrics?.pipelineValue || 0;
  const avgDealSize = metrics?.avgDealSize || 0;
  const conversionRate = metrics?.conversionRate || 0;
  const wonOpportunities = metrics?.wonOpportunities || 0;
  const lostOpportunities = metrics?.lostOpportunities || 0;
  const wonRevenue = metrics?.wonRevenue || 0;

  return (
    <Card className="bg-white border border-slate-200 shadow-sm p-6">
      <div className="pb-3">
        <h3 className="text-lg font-semibold text-slate-900">Opportunity Metrics</h3>
        <p className="text-sm text-slate-600">GoHighLevel pipeline data</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {/* Total Opportunities */}
        <div className="text-center">
          <div className="text-2xl font-bold text-slate-900">{totalOpportunities}</div>
          <div className="text-sm text-slate-600">Total Opportunities</div>
          <div className="text-xs text-slate-400 mt-1">
            Won: {wonOpportunities} • Lost: {lostOpportunities}
          </div>
        </div>

        {/* Pipeline Value */}
        <div className="text-center">
          <div className="text-2xl font-bold text-slate-900">${pipelineValue.toLocaleString()}</div>
          <div className="text-sm text-slate-600">Pipeline Value</div>
          <div className="text-xs text-slate-400 mt-1">
            Won: ${wonRevenue.toLocaleString()}
          </div>
        </div>

        {/* Average Deal Size */}
        <div className="text-center">
          <div className="text-2xl font-bold text-slate-900">${avgDealSize.toLocaleString()}</div>
          <div className="text-sm text-slate-600">Avg Deal Size</div>
          <div className="text-xs text-slate-400 mt-1">
            Per opportunity
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="text-center">
          <div className="text-2xl font-bold text-slate-900">{conversionRate.toFixed(1)}%</div>
          <div className="text-sm text-slate-600">Conversion Rate</div>
          <div className="text-xs text-slate-400 mt-1">
            Lead to opportunity
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-200">
        <div className="text-xs text-slate-400">
          API: GET /opportunities/search • {totalOpportunities > 0 ? 'Data flowing' : 'No opportunities found'}
        </div>
      </div>
    </Card>
  );
};
