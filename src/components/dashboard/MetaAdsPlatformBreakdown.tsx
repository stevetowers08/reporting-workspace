import { Card } from '@/components/ui/card';
import { EventDashboardData } from '@/services/data/eventMetricsService';
import React from 'react';

interface MetaAdsPlatformBreakdownProps {
  data: EventDashboardData | null | undefined;
}

export const MetaAdsPlatformBreakdown: React.FC<MetaAdsPlatformBreakdownProps> = ({ data }) => {
  // Get platform breakdown data from Facebook metrics
  const platformBreakdown = data?.facebookMetrics?.platformBreakdown;
  
  // Use real data if available, otherwise show fallback message
  const facebookVsInstagram = platformBreakdown?.facebookVsInstagram || {
    facebook: 0,
    instagram: 0
  };
  
  const adPlacements = platformBreakdown?.adPlacements || {
    feed: 0,
    stories: 0,
    reels: 0
  };

  return (
    <Card className="bg-white border border-slate-200 p-6">
      <div className="pb-4">
        <h3 className="text-lg font-semibold text-slate-900">Platform Breakdown</h3>
      </div>
      <div>
        <div className="space-y-6">
          {/* Facebook vs Instagram */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-slate-700">Facebook vs Instagram</h3>
              <span className="text-xs text-slate-500">{data?.facebookMetrics?.leads || '0'} total leads</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-8 relative overflow-hidden">
              <div className="bg-blue-600 h-8 rounded-l-full transition-all duration-700 ease-out flex items-center justify-center" style={{ width: `${facebookVsInstagram.facebook}%` }}>
                <span className="text-xs font-normal text-white">Facebook ({facebookVsInstagram.facebook}%)</span>
              </div>
              <div className="bg-pink-500 h-8 rounded-r-full transition-all duration-700 ease-out absolute top-0 flex items-center justify-center" style={{ width: `${facebookVsInstagram.instagram}%`, left: `${facebookVsInstagram.facebook}%` }}>
                <span className="text-xs font-normal text-white">Instagram ({facebookVsInstagram.instagram}%)</span>
              </div>
            </div>
          </div>

          {/* Ad Placements */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-slate-700">Ad Placements</h3>
              <span className="text-xs text-slate-500">${Math.round(data?.facebookMetrics?.spend || 0).toLocaleString()} total spend</span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Feed</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-slate-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${adPlacements.feed}%` }}></div>
                  </div>
                  <span className="text-xs text-slate-500">{adPlacements.feed}%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Stories</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-slate-200 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${adPlacements.stories}%` }}></div>
                  </div>
                  <span className="text-xs text-slate-500">{adPlacements.stories}%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Reels</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-slate-200 rounded-full h-2">
                    <div className="bg-pink-500 h-2 rounded-full" style={{ width: `${adPlacements.reels}%` }}></div>
                  </div>
                  <span className="text-xs text-slate-500">{adPlacements.reels}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
