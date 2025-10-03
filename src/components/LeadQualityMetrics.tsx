import React from 'react';
import { LeadQualityMetrics } from '@/types/dashboard';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Users, 
  Target, 
  DollarSign, 
  BarChart3,
  PieChart,
  Star,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

interface LeadQualityMetricsProps {
  metrics: LeadQualityMetrics;
}

export const LeadQualityMetricsComponent: React.FC<LeadQualityMetricsProps> = ({ metrics }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getQualityScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConversionRateColor = (rate: number) => {
    if (rate >= 20) return 'text-green-600';
    if (rate >= 10) return 'text-yellow-600';
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
                {metrics.averageQualityScore.toFixed(1)}
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
                {metrics.topPerformingSources[0]?.source || 'N/A'}
              </p>
              <p className="text-sm text-gray-500">
                {formatPercentage(metrics.topPerformingSources[0]?.conversionRate || 0)} conversion
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-600" />
          </div>
        </Card>
      </div>

      {/* Source Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source Performance */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Source Performance</h3>
            <BarChart3 className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {metrics.sourceBreakdown.map((source) => (
              <div key={source.source} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-sm font-medium text-gray-900">{source.source}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">{source.count} leads</div>
                  <div className="text-xs text-gray-500">
                    {formatPercentage(source.percentage)} • {formatPercentage(source.conversionRate)} conversion
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Status Breakdown */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Lead Status</h3>
            <PieChart className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {metrics.statusBreakdown.map((status) => (
              <div key={status.status} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {status.status === 'Converted' && <CheckCircle className="h-4 w-4 text-green-600" />}
                  {status.status === 'Lost' && <XCircle className="h-4 w-4 text-red-600" />}
                  {status.status === 'New' && <AlertCircle className="h-4 w-4 text-blue-600" />}
                  {status.status === 'Contacted' && <AlertCircle className="h-4 w-4 text-yellow-600" />}
                  {status.status === 'Qualified' && <AlertCircle className="h-4 w-4 text-purple-600" />}
                  <span className="text-sm font-medium text-gray-900">{status.status}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">{status.count}</div>
                  <div className="text-xs text-gray-500">{formatPercentage(status.percentage)}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Quality Score Distribution */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Quality Score Distribution</h3>
          <Star className="h-5 w-5 text-gray-400" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {metrics.qualityScoreDistribution.map((range) => (
            <div key={range.range} className="text-center">
              <div className="text-2xl font-bold text-gray-900">{range.count}</div>
              <div className="text-sm text-gray-600">{range.range}</div>
              <div className="text-xs text-gray-500">{formatPercentage(range.percentage)}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Top Performing Sources */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Top Performing Sources</h3>
          <TrendingUp className="h-5 w-5 text-gray-400" />
        </div>
        <div className="space-y-4">
          {metrics.topPerformingSources.map((source, index) => (
            <div key={source.source} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">{source.source}</div>
                  <div className="text-xs text-gray-500">{source.leads} leads</div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-semibold ${getConversionRateColor(source.conversionRate)}`}>
                  {formatPercentage(source.conversionRate)}
                </div>
                <div className="text-xs text-gray-500">
                  Avg: {formatCurrency(source.avgBudget)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
