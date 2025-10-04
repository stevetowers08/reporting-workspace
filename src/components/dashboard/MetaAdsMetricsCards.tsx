import { Card } from '@/components/ui/card';
import { EventDashboardData } from '@/services/data/eventMetricsService';
import React from 'react';

interface MetaAdsMetricsCardsProps {
  data?: EventDashboardData;
}

export const MetaAdsMetricsCards = React.memo<MetaAdsMetricsCardsProps>(({ data }) => {
  console.log('🔍 MetaAdsMetricsCards: Received data:', data);
  console.log('🔍 MetaAdsMetricsCards: Facebook metrics:', data?.facebookMetrics);
  
  // Check if we have any Facebook data
  const hasData = data?.facebookMetrics && (
    data.facebookMetrics.leads > 0 || 
    data.facebookMetrics.spend > 0 || 
    data.facebookMetrics.impressions > 0
  );

  console.log('🔍 MetaAdsMetricsCards: Has data:', hasData);

  // If no data, show a message
  if (!hasData) {
    return (
      <div className="mb-6">
        <Card className="bg-white border border-slate-200 shadow-sm p-8">
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
        <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Leads</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-slate-900">{data?.facebookMetrics?.leads || '0'}</p>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-green-600 font-medium">↑ +15.2%</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Cost Per Lead</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-slate-900">
                  ${data?.facebookMetrics?.leads && data?.facebookMetrics?.spend 
                    ? (data.facebookMetrics.spend / data.facebookMetrics.leads).toFixed(2)
                    : '0.00'}
                </p>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-red-600 font-medium">↓ -8.3%</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Conversion Rate</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-slate-900">
                  {data?.facebookMetrics?.clicks && data?.facebookMetrics?.leads
                    ? ((data.facebookMetrics.leads / data.facebookMetrics.clicks) * 100).toFixed(1)
                    : '0.0'}%
                </p>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-green-600 font-medium">↑ +5.7%</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Spent</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-slate-900">${data?.facebookMetrics?.spend?.toLocaleString() || '0'}</p>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-green-600 font-medium">↑ +2.0%</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Second Row - 4 Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Impressions</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-slate-900">{data?.facebookMetrics?.impressions?.toLocaleString() || '0'}</p>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-green-600 font-medium">↑ +8.5%</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Link Clicks</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-slate-900">{data?.facebookMetrics?.clicks?.toLocaleString() || '0'}</p>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-green-600 font-medium">↑ +22.3%</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Cost Per Link Click</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-slate-900">${(data?.facebookMetrics?.cpc ?? 0).toFixed(2)}</p>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-red-600 font-medium">↓ -12.8%</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">CTR</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-slate-900">{(data?.facebookMetrics?.ctr ?? 0).toFixed(2)}%</p>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-red-600 font-medium">↓ -47.2%</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
});
