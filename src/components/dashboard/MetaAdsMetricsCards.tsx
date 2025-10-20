import { SkeletonChart } from '@/components/ui/LoadingSystem';
import { Card } from '@/components/ui/card';
import { calculatePercentageChange, formatPercentageChange } from '@/lib/dateUtils';
import { debugLogger } from '@/lib/debug';
import { EventDashboardData } from '@/services/data/eventMetricsService';
import React from 'react';

interface MetaAdsMetricsCardsProps {
  data?: EventDashboardData;
}

// Helper component for percentage display
const PercentageChange: React.FC<{ current: number; previous: number }> = ({ current, previous }) => {
  const percentage = calculatePercentageChange(current, previous);
  const formatted = formatPercentageChange(percentage);
  
  if (previous === 0 && current === 0) {
    return null; // Don't show percentage if both values are 0
  }
  
  return (
    <div className="flex items-center gap-1">
      <span className={`text-sm font-medium ${formatted.isPositive ? 'text-green-600' : formatted.isNegative ? 'text-red-600' : 'text-slate-600'}`}>
        {formatted.isPositive ? '↑' : formatted.isNegative ? '↓' : '→'} {formatted.value}
      </span>
    </div>
  );
};

export const MetaAdsMetricsCards = React.memo<MetaAdsMetricsCardsProps>(({ data }) => {
  
  debugLogger.debug('MetaAdsMetricsCards', 'Received data', { 
    data, 
    facebookMetrics: data?.facebookMetrics,
    hasPreviousPeriod: !!data?.facebookMetrics?.previousPeriod,
    previousPeriodData: data?.facebookMetrics?.previousPeriod
  });
  
  // Show loading state if data is not yet available
  if (!data) {
    return (
      <div className="mb-6">
        <SkeletonChart height="h-32" />
      </div>
    );
  }
  
  // Check if we have any Facebook data
  const hasData = data?.facebookMetrics && (
    data.facebookMetrics.leads > 0 || 
    data.facebookMetrics.spend > 0 || 
    data.facebookMetrics.impressions > 0
  );

  debugLogger.debug('MetaAdsMetricsCards', 'Has data', hasData);

  // If no data, show a message
  if (!hasData) {
    return (
      <div className="mb-6">
        <Card className="bg-white border border-slate-200 p-8">
          <div className="text-center">
            <div className="text-slate-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No Active Facebook Ads</h3>
            <p className="text-slate-600 mb-4">
              This account has paused campaigns. Start running ads to see performance data here.
            </p>
                   <div className="text-sm text-slate-500">
                     <p>• 8 campaigns found (all paused)</p>
                     <p>• Account: NOW OR NEVER (act_1381656685415225)</p>
                   </div>
          </div>
        </Card>
      </div>
    );
  }

  // If no data, show a message
  if (!hasData) {
    return (
      <div className="mb-6">
        <Card className="bg-white border border-slate-200 p-8">
          <div className="text-center">
            <div className="text-slate-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No Active Facebook Ads</h3>
            <p className="text-slate-600 mb-4">
              This account has paused campaigns. Start running ads to see performance data here.
            </p>
                   <div className="text-sm text-slate-500">
                     <p>• 8 campaigns found (all paused)</p>
                     <p>• Account: NOW OR NEVER (act_1381656685415225)</p>
                   </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mb-6">
      {/* First Row - 4 Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-4">
        <Card className="bg-white border border-slate-200 p-5 h-24">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Leads</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-slate-900">{data?.facebookMetrics?.leads || '0'}</p>
                {data?.facebookMetrics?.previousPeriod ? (
                  <PercentageChange 
                    current={data.facebookMetrics.leads} 
                    previous={data.facebookMetrics.previousPeriod.leads} 
                  />
                ) : (
                  <div className="text-sm text-slate-400">No comparison data</div>
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-white border border-slate-200 p-5 h-24">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Cost Per Lead</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-slate-900">
                  ${data?.facebookMetrics?.leads && data?.facebookMetrics?.spend 
                    ? (data.facebookMetrics.spend / data.facebookMetrics.leads).toFixed(2)
                    : '0.00'}
                </p>
                {data?.facebookMetrics?.previousPeriod && (
                  <PercentageChange 
                    current={data.facebookMetrics.leads > 0 ? data.facebookMetrics.spend / data.facebookMetrics.leads : 0} 
                    previous={data.facebookMetrics.previousPeriod.leads > 0 ? data.facebookMetrics.previousPeriod.spend / data.facebookMetrics.previousPeriod.leads : 0} 
                  />
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-white border border-slate-200 p-5 h-24">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Conversion Rate</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-slate-900">
                  {data?.facebookMetrics?.clicks && data?.facebookMetrics?.leads
                    ? ((data.facebookMetrics.leads / data.facebookMetrics.clicks) * 100).toFixed(1)
                    : '0.0'}%
                </p>
                {data?.facebookMetrics?.previousPeriod && (
                  <PercentageChange 
                    current={data.facebookMetrics.clicks > 0 ? (data.facebookMetrics.leads / data.facebookMetrics.clicks) * 100 : 0} 
                    previous={data.facebookMetrics.previousPeriod.clicks > 0 ? (data.facebookMetrics.previousPeriod.leads / data.facebookMetrics.previousPeriod.clicks) * 100 : 0} 
                  />
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-white border border-slate-200 p-5 h-24">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Spent</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-slate-900">${Math.round(data?.facebookMetrics?.spend || 0).toLocaleString()}</p>
                {data?.facebookMetrics?.previousPeriod ? (
                  <PercentageChange 
                    current={data.facebookMetrics.spend} 
                    previous={data.facebookMetrics.previousPeriod.spend} 
                  />
                ) : (
                  <div className="text-sm text-slate-400">No comparison data</div>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Second Row - 4 Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white border border-slate-200 p-5 h-24">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Impressions</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-slate-900">{data?.facebookMetrics?.impressions?.toLocaleString() || '0'}</p>
                {data?.facebookMetrics?.previousPeriod && (
                  <PercentageChange 
                    current={data.facebookMetrics.impressions} 
                    previous={data.facebookMetrics.previousPeriod.impressions} 
                  />
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-white border border-slate-200 p-5 h-24">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Link Clicks</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-slate-900">{data?.facebookMetrics?.clicks?.toLocaleString() || '0'}</p>
                {data?.facebookMetrics?.previousPeriod && (
                  <PercentageChange 
                    current={data.facebookMetrics.clicks} 
                    previous={data.facebookMetrics.previousPeriod.clicks} 
                  />
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-white border border-slate-200 p-5 h-24">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Cost Per Link Click</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-slate-900">${(data?.facebookMetrics?.cpc ?? 0).toFixed(2)}</p>
                {data?.facebookMetrics?.previousPeriod && (
                  <PercentageChange 
                    current={data.facebookMetrics.cpc} 
                    previous={data.facebookMetrics.previousPeriod.cpc} 
                  />
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-white border border-slate-200 p-5 h-24">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">CTR</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-slate-900">{(data?.facebookMetrics?.ctr ?? 0).toFixed(2)}%</p>
                {data?.facebookMetrics?.previousPeriod && (
                  <PercentageChange 
                    current={data.facebookMetrics.ctr} 
                    previous={data.facebookMetrics.previousPeriod.ctr} 
                  />
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
});
