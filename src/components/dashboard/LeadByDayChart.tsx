import { EventDashboardData } from '@/services/data/eventMetricsService';
import React, { useMemo } from 'react';
import { Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface LeadByMonthChartProps {
  data: EventDashboardData | null | undefined;
}

export const LeadByMonthChart: React.FC<LeadByMonthChartProps> = React.memo(({ data }) => {
  
  // Use real monthly data from seasonal trends, excluding current month
  const monthlyData = useMemo(() => {
    if (!data?.leadMetrics?.seasonalTrends || data.leadMetrics.seasonalTrends.length === 0) {
      return [];
    }

    const currentMonth = new Date().toLocaleDateString('en-US', { month: 'short' });
    
    // Filter out current month and prepare data for chart
    const filteredTrends = data.leadMetrics.seasonalTrends.filter(trend => {
      return trend.month !== currentMonth;
    });

    // Get total leads for each platform
    const facebookLeads = data.facebookMetrics?.leads || 0;
    const googleLeads = data.googleMetrics?.leads || 0;
    const totalLeads = facebookLeads + googleLeads;

    if (totalLeads === 0) {
      return [];
    }

    // Pre-calculate total seasonal leads for performance
    const totalSeasonalLeads = data.leadMetrics.seasonalTrends.reduce((sum, t) => sum + t.leads, 0);
    
    // Use real seasonal trends data and distribute platform leads proportionally
    return filteredTrends.map(trend => {
      const monthProportion = totalSeasonalLeads > 0 ? trend.leads / totalSeasonalLeads : 0;
      
      return {
        month: trend.month,
        facebookLeads: Math.round(facebookLeads * monthProportion),
        googleLeads: Math.round(googleLeads * monthProportion),
        totalLeads: trend.leads
      };
    });
  }, [data?.leadMetrics?.seasonalTrends, data?.facebookMetrics?.leads, data?.googleMetrics?.leads]);

  const hasData = useMemo(() => {
    const facebookLeads = data?.facebookMetrics?.leads || 0;
    const googleLeads = data?.googleMetrics?.leads || 0;
    return facebookLeads > 0 || googleLeads > 0;
  }, [data?.facebookMetrics?.leads, data?.googleMetrics?.leads]);

  // Show message if no data
  if (!hasData || monthlyData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500">
        <div className="text-center">
          <p className="text-sm">No leads data available</p>
          <p className="text-xs mt-1">Connect Facebook or Google Ads to see monthly lead trends</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart 
          data={monthlyData} 
          margin={{ top: 16, right: 16, left: 8, bottom: 20 }}
        >
          <XAxis 
            dataKey="month"
            tick={{ fontSize: 11 }}
            interval={0}
            height={30}
          />
          <YAxis 
            tick={{ fontSize: 11 }}
            width={40}
          />
          <Tooltip 
            formatter={(value: number, name: string) => [
              `${value} leads`,
              name === 'facebookLeads' ? 'Facebook Ads' : 'Google Ads'
            ]}
            labelFormatter={(label) => `Month: ${label}`}
            labelStyle={{ color: '#374151' }}
            contentStyle={{ 
              backgroundColor: '#fff', 
              border: '1px solid #E2E8F0',
              borderRadius: '6px'
            }}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="facebookLeads" 
            stroke="#3B82F6" 
            strokeWidth={2}
            dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
            name="Facebook Ads"
          />
          <Line 
            type="monotone" 
            dataKey="googleLeads" 
            stroke="#10B981" 
            strokeWidth={2}
            dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2 }}
            name="Google Ads"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});

LeadByMonthChart.displayName = 'LeadByMonthChart';