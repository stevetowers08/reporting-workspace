import { EventDashboardData } from '@/services/data/eventMetricsService';
import React from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
interface GoogleAdsCampaignBreakdownProps {
  data: EventDashboardData | null | undefined;
}

export const GoogleAdsCampaignBreakdown: React.FC<GoogleAdsCampaignBreakdownProps> = ({ data }) => {
  // Get campaign breakdown data from Google metrics
  const campaignBreakdown = data?.googleMetrics?.campaignBreakdown;
  const totalLeads = data?.googleMetrics?.leads || 0;
  const totalCost = data?.googleMetrics?.cost || 0;

  // Default values if no data
  const campaignTypes = campaignBreakdown?.campaignTypes || {
    search: 0,
    display: 0,
    youtube: 0
  };

  const adFormats = campaignBreakdown?.adFormats || {
    textAds: 0,
    responsiveDisplay: 0,
    videoAds: 0
  };

  return (
    <Card className="bg-white border border-slate-200 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-slate-900">Campaign Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Campaign Types */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold text-slate-700">Campaign Types</h3>
              <span className="text-xs text-slate-500">{totalLeads} total leads</span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Search</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-slate-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${campaignTypes.search}%` }}></div>
                  </div>
                  <span className="text-xs text-slate-500">{campaignTypes.search}%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Display</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-slate-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `${campaignTypes.display}%` }}></div>
                  </div>
                  <span className="text-xs text-slate-500">{campaignTypes.display}%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">YouTube</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-slate-200 rounded-full h-2">
                    <div className="bg-red-500 h-2 rounded-full" style={{ width: `${campaignTypes.youtube}%` }}></div>
                  </div>
                  <span className="text-xs text-slate-500">{campaignTypes.youtube}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Ad Formats */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold text-slate-700">Ad Formats</h3>
              <span className="text-xs text-slate-500">${Math.round(totalCost).toLocaleString()} total spend</span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Text Ads</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-slate-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${adFormats.textAds}%` }}></div>
                  </div>
                  <span className="text-xs text-slate-500">{adFormats.textAds}%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Responsive Display</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-slate-200 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${adFormats.responsiveDisplay}%` }}></div>
                  </div>
                  <span className="text-xs text-slate-500">{adFormats.responsiveDisplay}%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Video Ads</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-slate-200 rounded-full h-2">
                    <div className="bg-red-500 h-2 rounded-full" style={{ width: `${adFormats.videoAds}%` }}></div>
                  </div>
                  <span className="text-xs text-slate-500">{adFormats.videoAds}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
