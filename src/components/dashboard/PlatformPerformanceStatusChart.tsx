import { EventDashboardData } from "@/services/data/eventMetricsService";
import React, { useMemo } from 'react';

interface PlatformPerformanceStatusChartProps {
  data?: EventDashboardData | null;
}

export const PlatformPerformanceStatusChart = React.memo<PlatformPerformanceStatusChartProps>(({ data }) => {
  const metrics = useMemo(() => {
    const metaLeads = data?.facebookMetrics?.leads || 234;
    const metaSpend = data?.facebookMetrics?.spend || 6200;
    const googleLeads = data?.googleMetrics?.leads || 190;
    const googleSpend = data?.googleMetrics?.cost || 6550;
    
    const totalLeads = metaLeads + googleLeads;
    const totalSpend = metaSpend + googleSpend;
    
    const metaLeadsPercentage = totalLeads > 0 ? (metaLeads / totalLeads) * 100 : 0;
    const googleLeadsPercentage = totalLeads > 0 ? (googleLeads / totalLeads) * 100 : 0;
    
    const metaSpendPercentage = totalSpend > 0 ? (metaSpend / totalSpend) * 100 : 0;
    const googleSpendPercentage = totalSpend > 0 ? (googleSpend / totalSpend) * 100 : 0;

    return {
      metaLeads,
      metaSpend,
      googleLeads,
      googleSpend,
      totalLeads,
      totalSpend,
      metaLeadsPercentage,
      googleLeadsPercentage,
      metaSpendPercentage,
      googleSpendPercentage
    };
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Leads Performance */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-slate-700">Leads Distribution</h3>
          <span className="text-xs text-slate-500">{metrics.totalLeads.toLocaleString()} total leads</span>
        </div>
        
        {/* Combined Leads Progress Bar */}
        <div className="w-full bg-slate-200 rounded-full h-5 relative overflow-hidden">
          <div
            className="bg-blue-500 h-5 rounded-l-full transition-all duration-700 ease-out flex items-center justify-center"
            style={{ width: `${metrics.metaLeadsPercentage}%` }}
          >
            {metrics.metaLeadsPercentage > 20 && (
              <span className="text-xs font-normal text-white">
                ({metrics.metaLeadsPercentage.toFixed(1)}%)
              </span>
            )}
          </div>
          <div
            className="bg-red-500 h-5 rounded-r-full transition-all duration-700 ease-out absolute top-0 flex items-center justify-center"
            style={{
              width: `${metrics.googleLeadsPercentage}%`,
              left: `${metrics.metaLeadsPercentage}%`
            }}
          >
            {metrics.googleLeadsPercentage > 20 && (
              <span className="text-xs font-normal text-white">
                ({metrics.googleLeadsPercentage.toFixed(1)}%)
              </span>
            )}
          </div>
        </div>
        
        {/* Labels */}
        <div className="flex justify-between items-center mt-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span className="text-xs font-medium text-slate-700">Meta Ads</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span className="text-xs font-medium text-slate-700">Google Ads</span>
          </div>
        </div>
      </div>
      
      {/* Spend Performance */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-slate-700">Spend Distribution</h3>
          <span className="text-xs text-slate-500">${metrics.totalSpend.toLocaleString()} total spend</span>
        </div>
        
        {/* Combined Spend Progress Bar */}
        <div className="w-full bg-slate-200 rounded-full h-5 relative overflow-hidden">
          <div
            className="bg-blue-500 h-5 rounded-l-full transition-all duration-700 ease-out flex items-center justify-center"
            style={{ width: `${metrics.metaSpendPercentage}%` }}
          >
            {metrics.metaSpendPercentage > 20 && (
              <span className="text-xs font-normal text-white">
                ({metrics.metaSpendPercentage.toFixed(1)}%)
              </span>
            )}
          </div>
          <div
            className="bg-red-500 h-5 rounded-r-full transition-all duration-700 ease-out absolute top-0 flex items-center justify-center"
            style={{
              width: `${metrics.googleSpendPercentage}%`,
              left: `${metrics.metaSpendPercentage}%`
            }}
          >
            {metrics.googleSpendPercentage > 20 && (
              <span className="text-xs font-normal text-white">
                ({metrics.googleSpendPercentage.toFixed(1)}%)
              </span>
            )}
          </div>
        </div>
        
        {/* Labels */}
        <div className="flex justify-between items-center mt-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span className="text-xs font-medium text-slate-700">Meta Ads</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span className="text-xs font-medium text-slate-700">Google Ads</span>
          </div>
        </div>
      </div>
    </div>
  );
});
