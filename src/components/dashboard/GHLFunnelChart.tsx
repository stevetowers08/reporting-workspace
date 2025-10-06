import { Card } from '@/components/ui/card';
import { GoHighLevelService } from '@/services/api/goHighLevelService';
import React, { useEffect, useState } from 'react';
import { Cell, Funnel, FunnelChart, LabelList, ResponsiveContainer, Tooltip } from 'recharts';

interface GHLFunnelChartProps {
  dateRange?: { start: string; end: string };
}

interface FunnelData {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

const FUNNEL_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export const GHLFunnelChart: React.FC<GHLFunnelChartProps> = ({ dateRange }) => {
  const [funnelData, setFunnelData] = useState<FunnelData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFunnelData = async () => {
      try {
        const metrics = await GoHighLevelService.getGHLMetrics(locationId, dateRange);
        
        // Calculate funnel stages
        const totalPageViews = metrics.pageViewAnalytics?.totalPageViews || metrics.totalContacts;
        const totalContacts = metrics.totalContacts;
        const qualifiedLeads = metrics.totalContacts * (metrics.conversionRate / 100);
        const leadsWithGuests = metrics.totalGuests > 0 ? 
          metrics.totalGuests : 0;
        
        const funnelStages: FunnelData[] = [
          {
            name: 'Page Views',
            value: totalPageViews,
            percentage: 100,
            color: FUNNEL_COLORS[0]
          },
          {
            name: 'Landing Page Visits',
            value: totalContacts,
            percentage: totalPageViews > 0 ? (totalContacts / totalPageViews) * 100 : 0,
            color: FUNNEL_COLORS[1]
          },
          {
            name: 'Form Submissions',
            value: Math.round(qualifiedLeads),
            percentage: totalContacts > 0 ? (qualifiedLeads / totalContacts) * 100 : 0,
            color: FUNNEL_COLORS[2]
          },
          {
            name: 'Qualified Leads',
            value: Math.round(qualifiedLeads),
            percentage: totalContacts > 0 ? (qualifiedLeads / totalContacts) * 100 : 0,
            color: FUNNEL_COLORS[3]
          },
          {
            name: 'Booked Events',
            value: Math.round(leadsWithGuests),
            percentage: qualifiedLeads > 0 ? (leadsWithGuests / qualifiedLeads) * 100 : 0,
            color: FUNNEL_COLORS[4]
          }
        ];

        setFunnelData(funnelStages);
      } catch (error) {
        console.error('Failed to fetch GHL funnel data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFunnelData();
  }, [dateRange]);

  if (loading) {
    return (
      <Card className="bg-white border border-slate-200 shadow-sm p-6">
        <div className="pb-3">
          <h3 className="text-lg font-semibold text-slate-900">GHL Conversion Funnel</h3>
        </div>
        <div className="h-80 flex items-center justify-center">
          <div className="animate-pulse text-slate-500">Loading funnel data...</div>
        </div>
      </Card>
    );
  }

  if (!funnelData.length) {
    return (
      <Card className="bg-white border border-slate-200 shadow-sm p-6">
        <div className="pb-3">
          <h3 className="text-lg font-semibold text-slate-900">GHL Conversion Funnel</h3>
        </div>
        <div className="h-80 flex items-center justify-center">
          <div className="text-slate-500">No funnel data available</div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-white border border-slate-200 shadow-sm p-6">
      <div className="pb-3">
        <h3 className="text-lg font-semibold text-slate-900">GHL Conversion Funnel</h3>
        <p className="text-sm text-slate-600">Customer journey from page views to booked events</p>
      </div>
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <FunnelChart>
            <Tooltip 
              formatter={(value: number, name: string, props: any) => [
                `${value.toLocaleString()} (${props.payload?.percentage?.toFixed(1) || '0'}%)`,
                props.payload?.name || 'Unknown'
              ]}
              labelStyle={{ color: '#374151' }}
              contentStyle={{ 
                backgroundColor: '#fff', 
                border: '1px solid #E2E8F0',
                borderRadius: '6px'
              }}
            />
            <Funnel
              dataKey="value"
              data={funnelData}
              isAnimationActive={true}
              animationDuration={1000}
            >
              {funnelData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
              <LabelList 
                position="center" 
                fill="#fff" 
                fontSize={12} 
                fontWeight="bold"
                formatter={(value: any) => [
                  `${value.toLocaleString()}`,
                  `${value.percentage?.toFixed(1) || '0'}%`
                ]}
              />
            </Funnel>
          </FunnelChart>
        </ResponsiveContainer>
      </div>

      {/* Funnel Metrics Table */}
      <div className="mt-6">
        <h4 className="text-sm font-medium text-slate-700 mb-3">Conversion Metrics</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 font-medium text-slate-600">Stage</th>
                <th className="text-right py-2 font-medium text-slate-600">Count</th>
                <th className="text-right py-2 font-medium text-slate-600">Conversion Rate</th>
                <th className="text-right py-2 font-medium text-slate-600">Drop-off</th>
              </tr>
            </thead>
            <tbody>
              {funnelData.map((stage, index) => {
                const previousStage = index > 0 ? funnelData[index - 1] : null;
                const dropOff = previousStage ? 
                  ((previousStage.value - stage.value) / previousStage.value) * 100 : 0;
                
                return (
                  <tr key={stage.name} className="border-b border-slate-100">
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: stage.color }}
                        />
                        <span className="font-medium text-slate-700">{stage.name}</span>
                      </div>
                    </td>
                    <td className="text-right py-2 text-slate-600">
                      {stage.value.toLocaleString()}
                    </td>
                    <td className="text-right py-2 text-slate-600">
                      {stage.percentage.toFixed(1)}%
                    </td>
                    <td className="text-right py-2 text-slate-600">
                      {index > 0 && dropOff > 0 ? `${dropOff.toFixed(1)}%` : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Key Insights */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Key Insights</h4>
        <div className="text-sm text-blue-800 space-y-1">
          <p>• <strong>Overall Conversion:</strong> {funnelData[funnelData.length - 1]?.percentage.toFixed(1)}% of page views convert to booked events</p>
          <p>• <strong>Form Completion:</strong> {funnelData[2]?.percentage.toFixed(1)}% of visitors complete the form</p>
          <p>• <strong>Biggest Drop-off:</strong> {funnelData.reduce((max, stage, index) => {
            if (index === 0) return max;
            const dropOff = ((funnelData[index - 1].value - stage.value) / funnelData[index - 1].value) * 100;
            return dropOff > max.dropOff ? { stage: funnelData[index - 1].name, dropOff } : max;
          }, { stage: '', dropOff: 0 }).stage} stage loses {funnelData.reduce((max, stage, index) => {
            if (index === 0) return max;
            const dropOff = ((funnelData[index - 1].value - stage.value) / funnelData[index - 1].value) * 100;
            return dropOff > max.dropOff ? { stage: funnelData[index - 1].name, dropOff } : max;
          }, { stage: '', dropOff: 0 }).dropOff.toFixed(1)}% of users</p>
        </div>
      </div>
    </Card>
  );
};
