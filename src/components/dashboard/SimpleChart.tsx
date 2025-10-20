import { Card } from '@/components/ui/card';
import React from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface SimpleChartProps {
  title: string;
  data?: any;
  type?: 'bar' | 'line' | 'pie' | 'doughnut';
  height?: number;
}

export const SimpleChart: React.FC<SimpleChartProps> = ({ 
  title, 
  data, 
  type = 'bar',
  height = 300 
}) => {
  // Default data if none provided
  const defaultData = [
    { name: 'Sample 1', value: 12 },
    { name: 'Sample 2', value: 19 },
    { name: 'Sample 3', value: 3 },
    { name: 'Sample 4', value: 5 }
  ];

  const chartData = data || defaultData;

  return (
    <Card className="bg-white border border-slate-200 p-6">
      <div className="pb-3">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
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
              formatter={(value: number, name: string) => [
                `${value}`,
                'Value'
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
              fill="#3B82F6"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
