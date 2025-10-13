import { Card } from '@/components/ui/card';
import { calculatePercentageChange, formatPercentageChange } from '@/lib/dateUtils';
import { EventDashboardData } from '@/services/data/eventMetricsService';
import React from 'react';

interface GoogleAdsMetricsCardsProps {
  data: EventDashboardData | null | undefined;
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

export const GoogleAdsMetricsCards: React.FC<GoogleAdsMetricsCardsProps> = ({ data }) => {
  return (
    <div className="mb-6">
      {/* First Row - 4 Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-4">
        <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Leads</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-slate-900">{data?.googleMetrics?.leads || '0'}</p>
                {data?.googleMetrics?.previousPeriod && (
                  <PercentageChange 
                    current={data.googleMetrics.leads} 
                    previous={data.googleMetrics.previousPeriod.leads} 
                  />
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Cost Per Lead</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-slate-900">${(data?.googleMetrics?.costPerLead || 0).toFixed(2)}</p>
                {data?.googleMetrics?.previousPeriod && (
                  <PercentageChange 
                    current={data.googleMetrics.costPerLead} 
                    previous={data.googleMetrics.previousPeriod.cost / (data.googleMetrics.previousPeriod.leads || 1)} 
                  />
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Conversion Rate</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-slate-900">{(data?.googleMetrics?.conversionRate || 0).toFixed(1)}%</p>
                {data?.googleMetrics?.previousPeriod && (
                  <PercentageChange 
                    current={data.googleMetrics.conversionRate} 
                    previous={data.googleMetrics.previousPeriod.conversionRate} 
                  />
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Spent</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-slate-900">${Math.round(data?.googleMetrics?.cost || 0).toLocaleString()}</p>
                {data?.googleMetrics?.previousPeriod && (
                  <PercentageChange 
                    current={data.googleMetrics.cost} 
                    previous={data.googleMetrics.previousPeriod.cost} 
                  />
                )}
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
                <p className="text-3xl font-bold text-slate-900">{data?.googleMetrics?.impressions?.toLocaleString() || '0'}</p>
                {data?.googleMetrics?.previousPeriod && (
                  <PercentageChange 
                    current={data.googleMetrics.impressions} 
                    previous={data.googleMetrics.previousPeriod.impressions} 
                  />
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Clicks</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-slate-900">{data?.googleMetrics?.clicks?.toLocaleString() || '0'}</p>
                {data?.googleMetrics?.previousPeriod && (
                  <PercentageChange 
                    current={data.googleMetrics.clicks} 
                    previous={data.googleMetrics.previousPeriod.clicks} 
                  />
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Cost Per Click</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-slate-900">${(data?.googleMetrics?.cpc || 0).toFixed(2)}</p>
                {data?.googleMetrics?.previousPeriod && (
                  <PercentageChange 
                    current={data.googleMetrics.cpc} 
                    previous={data.googleMetrics.previousPeriod.cpc} 
                  />
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">CTR</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-slate-900">{(data?.googleMetrics?.ctr || 0).toFixed(2)}%</p>
                {data?.googleMetrics?.previousPeriod && (
                  <PercentageChange 
                    current={data.googleMetrics.ctr} 
                    previous={data.googleMetrics.previousPeriod.ctr} 
                  />
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
