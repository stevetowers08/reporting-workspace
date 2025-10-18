import { Card } from '@/components/ui/card';
import { LeadDataComparison } from '@/services/data/leadDataService';
import React from 'react';
import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface ComparisonChartProps {
  data: {
    leadDataComparison?: LeadDataComparison;
  } | null | undefined;
  title: string;
  dataKey: 'eventTypes' | 'guestRanges' | 'leadSources' | 'dayPreferences';
  colorAllTime?: string;
  colorLastMonth?: string;
}

export const ComparisonChart: React.FC<ComparisonChartProps> = ({ 
  data, 
  title, 
  dataKey,
  colorAllTime = '#3b82f6',
  colorLastMonth = '#ef4444'
}) => {
  if (!data?.leadDataComparison) {
    return (
      <Card className="bg-white border border-slate-200 shadow-sm p-6">
        <div className="text-center text-slate-500">
          <h3 className="text-lg font-semibold mb-4">{title}</h3>
          <p>No comparison data available</p>
        </div>
      </Card>
    );
  }

  const { allTime, lastMonth } = data.leadDataComparison;

  // Helper function to get the key from different data types
  const getItemKey = (item: any): string => {
    if ('type' in item) return item.type;
    if ('range' in item) return item.range;
    if ('day' in item) return item.day;
    return '';
  };

  // Create comparison data by merging both datasets
  const allKeys = new Set([
    ...allTime[dataKey].map(getItemKey),
    ...lastMonth[dataKey].map(getItemKey)
  ]);

  const comparisonData = Array.from(allKeys).map(key => {
    const allTimeItem = allTime[dataKey].find(item => 
      getItemKey(item) === key
    );
    const lastMonthItem = lastMonth[dataKey].find(item => 
      getItemKey(item) === key
    );

    return {
      name: key,
      allTime: allTimeItem?.count || 0,
      lastMonth: lastMonthItem?.count || 0,
      allTimePercentage: allTimeItem?.percentage || 0,
      lastMonthPercentage: lastMonthItem?.percentage || 0
    };
  }).filter(item => item.allTime > 0 || item.lastMonth > 0);

  if (comparisonData.length === 0) {
    return (
      <Card className="bg-white border border-slate-200 shadow-sm p-6">
        <div className="text-center text-slate-500">
          <h3 className="text-lg font-semibold mb-4">{title}</h3>
          <p>No data available for comparison</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-white border border-slate-200 shadow-sm p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-800 mb-2">{title}</h3>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: colorAllTime }}></div>
            <span className="text-slate-600">All Time ({allTime.totalLeads} leads)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: colorLastMonth }}></div>
            <span className="text-slate-600">Last Month ({lastMonth.totalLeads} leads)</span>
          </div>
        </div>
      </div>
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={comparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip 
              formatter={(value: number, name: string) => [
                `${value} leads (${name === 'allTime' ? 
                  comparisonData.find(d => d.allTime === value)?.allTimePercentage.toFixed(1) : 
                  comparisonData.find(d => d.lastMonth === value)?.lastMonthPercentage.toFixed(1)
                }%)`, 
                name === 'allTime' ? 'All Time' : 'Last Month'
              ]}
            />
            <Legend />
            <Bar 
              dataKey="allTime" 
              fill={colorAllTime} 
              name="All Time"
              radius={[2, 2, 0, 0]}
            />
            <Bar 
              dataKey="lastMonth" 
              fill={colorLastMonth} 
              name="Last Month"
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
