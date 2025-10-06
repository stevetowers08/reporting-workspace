import { Card } from '@/components/ui/card';
import { EventDashboardData } from '@/services/data/eventMetricsService';
import { LeadData, LeadDataService } from '@/services/data/leadDataService';
import React, { useEffect, useState } from 'react';
import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface GuestCountDistributionProps {
  data: EventDashboardData | null | undefined;
}

export const GuestCountDistribution: React.FC<GuestCountDistributionProps> = ({ data }) => {
  const [leadData, setLeadData] = useState<LeadData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('GuestCountDistribution: Starting to fetch lead data...');
        const leadDataResult = await LeadDataService.fetchLeadData();
        console.log('GuestCountDistribution: Received lead data:', leadDataResult);
        
        if (leadDataResult) {
          console.log('GuestCountDistribution: Guest ranges data:', leadDataResult.guestRanges);
          setLeadData(leadDataResult);
        } else {
          console.warn('GuestCountDistribution: No data returned from LeadDataService');
        }
      } catch (error) {
        console.error('GuestCountDistribution: Failed to fetch lead data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <Card className="bg-white border border-slate-200 shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                <div className="h-4 bg-slate-200 rounded w-1/4"></div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (!leadData) {
    return (
      <Card className="bg-white border border-slate-200 shadow-sm p-6 w-full md:w-full">
        <div className="pb-4">
          <h3 className="text-lg font-semibold text-slate-900">Guest Count Distribution</h3>
          <p className="text-sm text-slate-500">Average: 88 guests per lead</p>
        </div>
        <div className="h-64 flex items-center justify-center">
          <div className="text-center">
            <div className="text-slate-500 mb-2">Failed to load guest count data</div>
            <div className="text-xs text-slate-400">
              Check console for details. Proxy server may not be running.
            </div>
          </div>
        </div>
      </Card>
    );
  }
  
  // Prepare chart data
  const chartData = leadData.guestRanges.map((range, index) => ({
    name: range.range,
    value: range.count,
    percentage: range.percentage,
    color: ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'][index % 5]
  }));

  return (
    <Card className="bg-white border border-slate-200 shadow-sm p-6 w-full">
      <div className="pb-4">
        <h3 className="text-lg font-semibold text-slate-900">Guest Count Distribution</h3>
        <p className="text-sm text-slate-500">Average: {leadData.averageGuestsPerLead.toFixed(0)} guests per lead</p>
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={chartData} 
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <XAxis 
              dataKey="name"
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
            />
            <Tooltip 
              formatter={(value: number, name: string, props: any) => [
                `${value} leads (${props.payload?.percentage?.toFixed(1) || '0'}%)`,
                'Count'
              ]}
              labelStyle={{ color: '#374151' }}
              contentStyle={{ 
                backgroundColor: '#fff', 
                border: '1px solid #E2E8F0',
                borderRadius: '6px'
              }}
            />
            <Bar 
              dataKey="value" 
              fill="#10B981"
              radius={[4, 4, 0, 0]}
            >
              <LabelList dataKey="value" position="top" style={{ fontSize: '12px', fill: '#374151' }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
