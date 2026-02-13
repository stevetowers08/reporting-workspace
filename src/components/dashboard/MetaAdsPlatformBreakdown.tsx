import { Card } from '@/components/ui/card';
import { EventDashboardData } from '@/services/data/eventMetricsService';
import { Users, DollarSign } from 'lucide-react';
import React from 'react';

interface MetaAdsPlatformBreakdownProps {
  data: EventDashboardData | null | undefined;
}

// Type definitions for platform breakdown data
interface PlatformVsInstagram {
  facebook?: number;
  instagram?: number;
  facebookLeads?: number;
  instagramLeads?: number;
  facebookCpl?: number;
  instagramCpl?: number;
}

interface AdPlacements {
  feed?: number;
  stories?: number;
  reels?: number;
  feedLeads?: number;
  storiesLeads?: number;
  reelsLeads?: number;
  feedCpl?: number;
  storiesCpl?: number;
  reelsCpl?: number;
}

export const MetaAdsPlatformBreakdown: React.FC<MetaAdsPlatformBreakdownProps> = ({ data }) => {
  // Get platform breakdown data from Meta metrics
  const platformBreakdown = data?.facebookMetrics?.platformBreakdown;
  
  // Extract values with defaults for backward compatibility
  const fbvsIg: PlatformVsInstagram = platformBreakdown?.facebookVsInstagram || {};
  const placements: AdPlacements = platformBreakdown?.adPlacements || {};
  
  const facebookVsInstagram = {
    facebook: fbvsIg.facebook ?? 0,
    instagram: fbvsIg.instagram ?? 0,
    facebookLeads: fbvsIg.facebookLeads ?? 0,
    instagramLeads: fbvsIg.instagramLeads ?? 0,
    facebookCpl: fbvsIg.facebookCpl ?? 0,
    instagramCpl: fbvsIg.instagramCpl ?? 0
  };
  
  const adPlacements = {
    feed: placements.feed ?? 0,
    stories: placements.stories ?? 0,
    reels: placements.reels ?? 0,
    feedLeads: placements.feedLeads ?? 0,
    storiesLeads: placements.storiesLeads ?? 0,
    reelsLeads: placements.reelsLeads ?? 0,
    feedCpl: placements.feedCpl ?? 0,
    storiesCpl: placements.storiesCpl ?? 0,
    reelsCpl: placements.reelsCpl ?? 0
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  return (
    <Card className="bg-white border border-slate-200 p-6">
      <div className="pb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Platform Breakdown</h3>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
            <Users className="h-3 w-3" />
            <span>Lead Breakdown</span>
          </div>
        </div>
      </div>
      <div>
        <div className="space-y-6">
          {/* Meta vs Instagram */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold text-slate-700">Facebook vs Instagram</h3>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-8 relative overflow-hidden">
              <div className="bg-blue-600 h-8 rounded-l-full transition-all duration-700 ease-out flex items-center justify-center" style={{ width: `${facebookVsInstagram.facebook}%` }}>
                <span className="text-xs font-normal text-white">Facebook ({facebookVsInstagram.facebook}%)</span>
              </div>
              <div className="bg-pink-500 h-8 rounded-r-full transition-all duration-700 ease-out absolute top-0 flex items-center justify-center" style={{ width: `${facebookVsInstagram.instagram}%`, left: `${facebookVsInstagram.facebook}%` }}>
                <span className="text-xs font-normal text-white">Instagram ({facebookVsInstagram.instagram}%)</span>
              </div>
            </div>
            {/* CPL Stats for Platforms */}
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                  <span className="text-xs text-slate-600">Facebook CPL</span>
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3 text-slate-400" />
                  <span className="text-sm font-semibold text-slate-900">
                    {facebookVsInstagram.facebookCpl > 0 ? formatCurrency(facebookVsInstagram.facebookCpl) : '-'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-pink-500"></div>
                  <span className="text-xs text-slate-600">Instagram CPL</span>
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3 text-slate-400" />
                  <span className="text-sm font-semibold text-slate-900">
                    {facebookVsInstagram.instagramCpl > 0 ? formatCurrency(facebookVsInstagram.instagramCpl) : '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Ad Placements */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold text-slate-700">Ad Placements</h3>
            </div>
            <div className="space-y-3">
              {/* Feed */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-600 w-12">Feed</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-slate-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${adPlacements.feed}%` }}></div>
                    </div>
                    <span className="text-xs text-slate-500 w-8">{adPlacements.feed}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-50 rounded">
                  <span className="text-xs text-slate-500">CPL:</span>
                  <span className="text-xs font-medium text-slate-900">
                    {adPlacements.feedCpl > 0 ? formatCurrency(adPlacements.feedCpl) : '-'}
                  </span>
                </div>
              </div>
              
              {/* Stories */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-600 w-12">Stories</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-slate-200 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${adPlacements.stories}%` }}></div>
                    </div>
                    <span className="text-xs text-slate-500 w-8">{adPlacements.stories}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-50 rounded">
                  <span className="text-xs text-slate-500">CPL:</span>
                  <span className="text-xs font-medium text-slate-900">
                    {adPlacements.storiesCpl > 0 ? formatCurrency(adPlacements.storiesCpl) : '-'}
                  </span>
                </div>
              </div>
              
              {/* Reels */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-600 w-12">Reels</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-slate-200 rounded-full h-2">
                      <div className="bg-pink-500 h-2 rounded-full" style={{ width: `${adPlacements.reels}%` }}></div>
                    </div>
                    <span className="text-xs text-slate-500 w-8">{adPlacements.reels}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-50 rounded">
                  <span className="text-xs text-slate-500">CPL:</span>
                  <span className="text-xs font-medium text-slate-900">
                    {adPlacements.reelsCpl > 0 ? formatCurrency(adPlacements.reelsCpl) : '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
