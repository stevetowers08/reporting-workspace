"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calculatePercentageChange, formatPercentageChange } from '@/lib/utils';

interface ComparisonMetricsCardProps {
  title: string;
  current: number;
  previous?: number;
  format?: 'number' | 'currency' | 'percentage';
  suffix?: string;
  prefix?: string;
}

const PercentageChange: React.FC<{ current: number; previous: number }> = ({ current, previous }) => {
  const percentage = calculatePercentageChange(current, previous);
  const formatted = formatPercentageChange(percentage);
  
  if (previous === 0 && current === 0) {
    return null; // Don't show percentage if both values are 0
  }
  
  return (
    <div className="flex items-center gap-1">
      <span className={`text-sm font-medium ${formatted.isPositive ? 'text-green-600' : formatted.isNegative ? 'text-red-600' : 'text-slate-600'}`}>
        {formatted.isPositive ? '↑' : formatted.isNegative ? '↓' : '→'} {formatted.value}
      </span>
    </div>
  );
};

const formatValue = (value: number, format: 'number' | 'currency' | 'percentage' = 'number', suffix = '', prefix = '') => {
  switch (format) {
    case 'currency':
      return `${prefix}$${value.toFixed(2)}${suffix}`;
    case 'percentage':
      return `${prefix}${value.toFixed(2)}%${suffix}`;
    default:
      return `${prefix}${value.toLocaleString()}${suffix}`;
  }
};

export const ComparisonMetricsCard: React.FC<ComparisonMetricsCardProps> = ({ 
  title, 
  current, 
  previous, 
  format = 'number',
  suffix = '',
  prefix = ''
}) => {
  return (
    <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600 mb-2">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-slate-900">
              {formatValue(current, format, suffix, prefix)}
            </p>
            {previous !== undefined ? (
              <PercentageChange current={current} previous={previous} />
            ) : (
              <div className="text-sm text-slate-400">No comparison data</div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

interface ComparisonMetricsGridProps {
  metrics: {
    leads?: { current: number; previous?: number };
    spend?: { current: number; previous?: number };
    impressions?: { current: number; previous?: number };
    clicks?: { current: number; previous?: number };
    ctr?: { current: number; previous?: number };
    cpc?: { current: number; previous?: number };
    costPerLead?: { current: number; previous?: number };
    conversionRate?: { current: number; previous?: number };
  };
  platform: 'facebook' | 'google' | 'combined';
}

export const ComparisonMetricsGrid: React.FC<ComparisonMetricsGridProps> = ({ metrics, platform }) => {
  const isFacebook = platform === 'facebook';
  const isGoogle = platform === 'google';
  const isCombined = platform === 'combined';

  return (
    <div className="mb-6">
      {/* First Row - 4 Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-4">
        {metrics.leads && (
          <ComparisonMetricsCard
            title="Leads"
            current={metrics.leads.current}
            previous={metrics.leads.previous}
            format="number"
          />
        )}
        
        {metrics.spend && (
          <ComparisonMetricsCard
            title={isFacebook ? "Spend" : "Cost"}
            current={metrics.spend.current}
            previous={metrics.spend.previous}
            format="currency"
          />
        )}
        
        {metrics.costPerLead && (
          <ComparisonMetricsCard
            title="Cost Per Lead"
            current={metrics.costPerLead.current}
            previous={metrics.costPerLead.previous}
            format="currency"
          />
        )}
        
        {metrics.conversionRate && (
          <ComparisonMetricsCard
            title="Conversion Rate"
            current={metrics.conversionRate.current}
            previous={metrics.conversionRate.previous}
            format="percentage"
          />
        )}
      </div>

      {/* Second Row - 4 Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {metrics.impressions && (
          <ComparisonMetricsCard
            title="Impressions"
            current={metrics.impressions.current}
            previous={metrics.impressions.previous}
            format="number"
          />
        )}
        
        {metrics.clicks && (
          <ComparisonMetricsCard
            title="Clicks"
            current={metrics.clicks.current}
            previous={metrics.clicks.previous}
            format="number"
          />
        )}
        
        {metrics.ctr && (
          <ComparisonMetricsCard
            title="CTR"
            current={metrics.ctr.current}
            previous={metrics.ctr.previous}
            format="percentage"
          />
        )}
        
        {metrics.cpc && (
          <ComparisonMetricsCard
            title="CPC"
            current={metrics.cpc.current}
            previous={metrics.cpc.previous}
            format="currency"
          />
        )}
      </div>
    </div>
  );
};
