import { Card } from '@/components/ui/card';
import { EventDashboardData } from '@/services/data/eventMetricsService';
import React from 'react';

interface GoogleAdsDemographicsProps {
  data: EventDashboardData | null | undefined;
}

export const GoogleAdsDemographics: React.FC<GoogleAdsDemographicsProps> = ({ data }) => {
  return (
    <Card className="bg-white border border-slate-200 shadow-sm p-6">
      <div className="pb-4">
        <h3 className="text-lg font-semibold text-slate-900">Demographics</h3>
      </div>
      <div>
        <div className="space-y-6">
          {/* Age Groups */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-slate-700">Age Groups</h3>
              <span className="text-xs text-slate-500">{data?.googleMetrics?.leads || '0'} total leads</span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">25-34</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-slate-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '35%' }}></div>
                  </div>
                  <span className="text-xs text-slate-500">35%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">35-44</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-slate-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '40%' }}></div>
                  </div>
                  <span className="text-xs text-slate-500">40%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">45-54</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-slate-200 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full" style={{ width: '20%' }}></div>
                  </div>
                  <span className="text-xs text-slate-500">20%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">55+</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-slate-200 rounded-full h-2">
                    <div className="bg-orange-500 h-2 rounded-full" style={{ width: '5%' }}></div>
                  </div>
                  <span className="text-xs text-slate-500">5%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Gender */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-slate-700">Gender</h3>
              <span className="text-xs text-slate-500">{data?.googleMetrics?.leads || '0'} total leads</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-8 relative overflow-hidden">
              <div className="bg-blue-500 h-8 rounded-l-full transition-all duration-700 ease-out flex items-center justify-center" style={{ width: '55%' }}>
                <span className="text-xs font-normal text-white">Female (55%)</span>
              </div>
              <div className="bg-green-500 h-8 rounded-r-full transition-all duration-700 ease-out absolute top-0 flex items-center justify-center" style={{ width: '45%', left: '55%' }}>
                <span className="text-xs font-normal text-white">Male (45%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};