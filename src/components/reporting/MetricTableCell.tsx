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
  padding?: 'compact' | 'normal';
  colorCode?: boolean;
}

export const MetricTableCell: React.FC<MetricTableCellProps> = ({
  value,
  trend,
  format = 'number',
  className = '',
  padding = 'compact',
  colorCode = false
}) => {
  const paddingClass = padding === 'normal' ? 'px-3 py-4' : 'px-2 py-2';

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

  const getCostPerLeadColor = (val: number): string => {
    if (val < 10) {return 'bg-green-50 text-green-800';} // Best
    if (val < 20) {return 'bg-blue-50 text-blue-800';}   // Good
    if (val < 30) {return 'bg-yellow-50 text-yellow-800';} // Okay
    if (val <= 100) {return 'bg-orange-50 text-orange-800';} // Starting to get bad
    return 'bg-red-50 text-red-800'; // Bad (>100)
  };

  const getBackgroundColor = (): string => {
    if (!colorCode || format !== 'currency') {return '';}
    
    const numericValue = typeof value === 'string' ? parseFloat(value.replace('$', '')) : value;
    if (isNaN(numericValue)) {return '';}
    
    return getCostPerLeadColor(numericValue);
  };

  const getTrendColor = (direction: 'up' | 'down') => {
    return direction === 'up' ? 'text-green-600' : 'text-red-600';
  };

  // Removed unused getTrendIcon function

  return (
    <td className={`${paddingClass} text-left ${getBackgroundColor()} ${className}`}>
      <div className="flex items-center justify-start gap-1 flex-nowrap">
        <p className="text-sm font-medium whitespace-nowrap">
          {formatValue(value)}
        </p>
        {trend && (
          <span className={`text-xs font-medium whitespace-nowrap ${getTrendColor(trend.direction)}`}>
            {trend.direction === 'up' ? '↑' : '↓'} {Math.abs(trend.percentage).toFixed(1)}%
          </span>
        )}
      </div>
    </td>
  );
};
