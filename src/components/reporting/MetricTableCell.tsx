import { TrendingDown, TrendingUp } from 'lucide-react';
import React from 'react';

interface MetricTableCellProps {
  label: string;
  value: string | number;
  trend?: {
    direction: 'up' | 'down';
    percentage: number;
  };
  format?: 'number' | 'currency' | 'percentage';
  className?: string;
}

export const MetricTableCell: React.FC<MetricTableCellProps> = ({
  value,
  trend,
  format = 'number',
  className = ''
}) => {
  const formatValue = (val: string | number): string => {
    if (typeof val === 'string') {return val;}
    
    switch (format) {
      case 'currency':
        return `$${val.toFixed(2)}`;
      case 'percentage':
        return `${val.toFixed(2)}%`;
      case 'number':
      default:
        return val.toLocaleString();
    }
  };

  const getTrendColor = (direction: 'up' | 'down') => {
    return direction === 'up' ? 'text-green-600' : 'text-red-600';
  };

  const getTrendIcon = (direction: 'up' | 'down') => {
    return direction === 'up' ? TrendingUp : TrendingDown;
  };

  return (
    <td className={`px-3 py-1.5 text-right ${className}`}>
      <div className="flex items-center justify-end gap-1.5">
        <p className="text-sm font-medium text-slate-900">
          {formatValue(value)}
        </p>
        {trend && (
          <div className={`flex items-center gap-0.5 text-xs font-medium ${getTrendColor(trend.direction)}`}>
            {React.createElement(getTrendIcon(trend.direction), { className: "h-3 w-3" })}
            <span>
              {trend.direction === 'up' ? '↑' : '↓'} {Math.abs(trend.percentage).toFixed(2)}%
            </span>
          </div>
        )}
      </div>
    </td>
  );
};
