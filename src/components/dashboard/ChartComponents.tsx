import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import React from 'react';
import { Card } from '@/components/ui/card';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  trend?: {
    value: number;
    period: string;
    direction: 'up' | 'down' | 'neutral';
  };
  status?: 'success' | 'warning' | 'error' | 'neutral';
  info?: string;
  className?: string;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  children,
  trend,
  status = 'neutral',
  info,
  className = ''
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'border-green-200 bg-green-50';
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      case 'error': return 'border-red-200 bg-red-50';
      default: return 'border-slate-200 bg-white';
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <Minus className="h-4 w-4 text-slate-600" />;
    }
  };

  const getTrendColor = (direction: string) => {
    switch (direction) {
      case 'up': return 'text-green-600 bg-green-100';
      case 'down': return 'text-red-600 bg-red-100';
      default: return 'text-slate-600 bg-slate-100';
    }
  };

  return (
    <Card className={`${getStatusColor(status)} ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              {title}
              {info && (
                <div className="group relative">
                  <Info className="h-4 w-4 text-slate-400 cursor-help" />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                    {info}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
                  </div>
                </div>
              )}
            </CardTitle>
            {subtitle && (
              <p className="text-sm text-slate-600 mt-1">{subtitle}</p>
            )}
          </div>
          {trend && (
            <Badge className={`${getTrendColor(trend.direction)} border-0`}>
              <div className="flex items-center gap-1">
                {getTrendIcon(trend.direction)}
                <span className="font-semibold">
                  {trend.value > 0 ? '+' : ''}{trend.value}%
                </span>
              </div>
              <span className="text-xs ml-1">vs {trend.period}</span>
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-64 w-full">
          {children}
        </div>
      </CardContent>
    </Card>
  );
};

// Responsive grid container for charts
interface ChartGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
}

export const ChartGrid: React.FC<ChartGridProps> = ({ 
  children, 
  columns = 3 
}) => {
  const getGridCols = (cols: number) => {
    switch (cols) {
      case 1: return 'grid-cols-1';
      case 2: return 'grid-cols-1 lg:grid-cols-2';
      case 3: return 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3';
      case 4: return 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4';
      default: return 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3';
    }
  };

  return (
    <div className={`grid gap-6 ${getGridCols(columns)}`}>
      {children}
    </div>
  );
};

// Metric card with better visual hierarchy
interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    period: string;
    direction: 'up' | 'down' | 'neutral';
  };
  icon?: React.ReactNode;
  status?: 'success' | 'warning' | 'error' | 'neutral';
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  icon,
  status = 'neutral',
  className = ''
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'border-green-200 bg-green-50';
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      case 'error': return 'border-red-200 bg-red-50';
      default: return 'border-slate-200 bg-white';
    }
  };

  const getChangeColor = (direction: string) => {
    switch (direction) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-slate-600';
    }
  };

  return (
    <Card className={`${getStatusColor(status)} ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-600 mb-1">{title}</p>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            {change && (
              <div className={`flex items-center gap-1 mt-2 text-sm ${getChangeColor(change.direction)}`}>
                {change.direction === 'up' && <TrendingUp className="h-4 w-4" />}
                {change.direction === 'down' && <TrendingDown className="h-4 w-4" />}
                <span className="font-semibold">
                  {change.value > 0 ? '+' : ''}{change.value}%
                </span>
                <span className="text-slate-500">vs {change.period}</span>
              </div>
            )}
          </div>
          {icon && (
            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
