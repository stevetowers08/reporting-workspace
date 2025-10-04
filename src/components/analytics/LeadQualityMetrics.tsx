import React from 'react';
import { LeadQualityMetrics } from '@/types/dashboard';
import { Card } from '@/components/ui/card';
import { 
  TrendingUp, 
  Users, 
  Target, 
  Star
} from 'lucide-react';

interface LeadQualityMetricsProps {
  metrics: LeadQualityMetrics;
}

export const LeadQualityMetricsComponent: React.FC<LeadQualityMetricsProps> = React.memo(({ metrics }) => {
  const formatPercentage = (value: number | undefined) => {
    if (value === undefined || value === null || isNaN(value)) {
      return '0.0%';
    }
    return `${value.toFixed(1)}%`;
  };

  const getQualityScoreColor = (score: number | undefined) => {
    if (score === undefined || score === null || isNaN(score)) {
      return 'text-gray-600';
    }
    if (score >= 8) {return 'text-green-600';}
    if (score >= 6) {return 'text-yellow-600';}
    return 'text-red-600';
  };

  const getConversionRateColor = (rate: number | undefined) => {
    if (rate === undefined || rate === null || isNaN(rate)) {
      return 'text-gray-600';
    }
    if (rate >= 20) {return 'text-green-600';}
    if (rate >= 10) {return 'text-yellow-600';}
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Leads */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Leads</p>
              <p className="text-3xl font-bold text-gray-900">{metrics.totalLeads}</p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </Card>

        {/* Average Quality Score */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Quality Score</p>
              <p className={`text-3xl font-bold ${getQualityScoreColor(metrics.averageQualityScore)}`}>
                {metrics.averageQualityScore?.toFixed(1) || '0.0'}
              </p>
            </div>
            <Star className="h-8 w-8 text-yellow-600" />
          </div>
        </Card>

        {/* Conversion Rate */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
              <p className={`text-3xl font-bold ${getConversionRateColor(metrics.conversionRate)}`}>
                {formatPercentage(metrics.conversionRate)}
              </p>
            </div>
            <Target className="h-8 w-8 text-green-600" />
          </div>
        </Card>

        {/* Top Source */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Top Source</p>
              <p className="text-lg font-semibold text-gray-900">
                {metrics.topPerformingSources?.[0]?.source || 'N/A'}
              </p>
              <p className="text-sm text-gray-500">
                {formatPercentage(metrics.topPerformingSources?.[0]?.conversionRate || 0)} conversion
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-600" />
          </div>
        </Card>
      </div>
    </div>
  );
});

LeadQualityMetricsComponent.displayName = 'LeadQualityMetricsComponent';

