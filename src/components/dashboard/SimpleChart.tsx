import React from 'react';
import { Card } from '@/components/ui/card';
import { ChartWrapper, CHART_COLORS } from '@/components/ui/chart-wrapper';

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
  // No default data - require real data to be passed
  const chartData = data;

  if (!chartData) {
    return (
      <Card className="bg-white border border-slate-200 shadow-sm p-6">
        <div className="pb-3">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500">Chart.js Implementation</p>
        </div>
        <div className="h-64 flex items-center justify-center">
          <div className="text-center text-slate-500">
            <p>No data available</p>
            <p className="text-xs mt-1">Real data will be shown when available</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-white border border-slate-200 shadow-sm p-6">
      <div className="pb-3">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500">Chart.js Implementation</p>
      </div>
      <div className="h-64">
        <ChartWrapper
          type={type}
          data={chartData}
          height={height}
        />
      </div>
    </Card>
  );
};
