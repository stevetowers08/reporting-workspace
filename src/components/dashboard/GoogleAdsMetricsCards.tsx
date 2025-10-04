import { Card } from '@/components/ui/card';
import { EventDashboardData } from '@/services/data/eventMetricsService';
import React from 'react';

interface GoogleAdsMetricsCardsProps {
  data: EventDashboardData | null | undefined;
}

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
                <div className="flex items-center gap-1">
                  <span className="text-sm text-green-600 font-medium">↑ +25.4%</span>
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
                <p className="text-3xl font-bold text-slate-900">${(data?.googleMetrics?.costPerLead || 0).toFixed(2)}</p>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-red-600 font-medium">↓ -12.3%</span>
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
                <p className="text-3xl font-bold text-slate-900">{(data?.googleMetrics?.conversionRate || 0).toFixed(1)}%</p>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-green-600 font-medium">↑ +8.7%</span>
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
                <p className="text-3xl font-bold text-slate-900">${data?.googleMetrics?.cost?.toLocaleString() || '0'}</p>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-green-600 font-medium">↑ +8.2%</span>
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
                <p className="text-3xl font-bold text-slate-900">{data?.googleMetrics?.impressions?.toLocaleString() || '0'}</p>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-green-600 font-medium">↑ +12.3%</span>
                </div>
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
                <div className="flex items-center gap-1">
                  <span className="text-sm text-green-600 font-medium">↑ +18.7%</span>
                </div>
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
                <p className="text-3xl font-bold text-slate-900">{(data?.googleMetrics?.ctr || 0).toFixed(2)}%</p>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-green-600 font-medium">↑ +6.3%</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
