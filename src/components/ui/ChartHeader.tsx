import { formatChartValue } from '@/lib/chartConfig';
import React from 'react';

export interface ChartHeaderProps {
  title: string;
  subtitle?: string;
  value?: string | number;
  valueLabel?: string;
  className?: string;
}

export const ChartHeader: React.FC<ChartHeaderProps> = ({
  title,
  subtitle,
  value,
  valueLabel,
  className = ''
}) => {
  return (
    <div className={`flex justify-between items-center mb-6 ${className}`}>
      <div>
        <div className="text-lg font-semibold text-slate-900">{title}</div>
        {subtitle && (
          <div className="text-sm text-slate-500">{subtitle}</div>
        )}
      </div>
      {(value !== undefined || valueLabel) && (
        <div className="text-right">
          {value !== undefined && (
            <div className="text-xl font-bold text-blue-600">
              {typeof value === 'number' ? formatChartValue(value) : value}
            </div>
          )}
          {valueLabel && (
            <div className="text-sm text-slate-500">{valueLabel}</div>
          )}
        </div>
      )}
    </div>
  );
};
