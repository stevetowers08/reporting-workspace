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
  // Default data if none provided
  const defaultData = {
    labels: ['Sample 1', 'Sample 2', 'Sample 3', 'Sample 4'],
    datasets: [{
      label: 'Sample Data',
      data: [12, 19, 3, 5],
      backgroundColor: CHART_COLORS.palette[0],
      borderColor: CHART_COLORS.palette[0],
      borderWidth: 1,
    }]
  };

  const chartData = data || defaultData;

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
