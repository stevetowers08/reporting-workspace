import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EventDashboardData } from '@/services/eventMetricsService';
import { TrendingUp, TrendingDown, Target, DollarSign, Users, Calendar } from 'lucide-react';

interface InsightsCardProps {
  dashboardData: EventDashboardData | null;
  selectedPeriod: string;
}

const InsightsCard: React.FC<InsightsCardProps> = ({ dashboardData, selectedPeriod }) => {
  if (!dashboardData) {
    return null;
  }

  const insights = [
    {
      icon: TrendingUp,
      title: "Top Performing Platform",
      value: dashboardData.facebookMetrics?.leads > dashboardData.googleMetrics?.leads ? "Meta Ads" : "Google Ads",
      description: dashboardData.facebookMetrics?.leads > dashboardData.googleMetrics?.leads 
        ? `Meta Ads generated ${dashboardData.facebookMetrics.leads} leads vs ${dashboardData.googleMetrics?.leads} from Google Ads`
        : `Google Ads generated ${dashboardData.googleMetrics?.leads} leads vs ${dashboardData.facebookMetrics?.leads} from Meta Ads`,
      color: "text-blue-600"
    },
    {
      icon: DollarSign,
      title: "Cost Efficiency",
      value: `$${dashboardData.leadMetrics?.overallCostPerLead?.toFixed(2) || '0.00'} CPL`,
      description: `Overall cost per lead across all platforms`,
      color: "text-green-600"
    },
    {
      icon: Target,
      title: "Conversion Performance",
      value: `${dashboardData.leadMetrics?.leadToOpportunityRate?.toFixed(1) || '0.0'}%`,
      description: `Lead to opportunity conversion rate`,
      color: "text-purple-600"
    },
    {
      icon: Users,
      title: "Event Volume",
      value: `${dashboardData.eventMetrics?.totalEvents || '0'} events`,
      description: `Total events booked in ${selectedPeriod === '7d' ? 'last 7 days' : selectedPeriod === '30d' ? 'last 30 days' : 'last 90 days'}`,
      color: "text-orange-600"
    }
  ];

  return (
    <Card className="bg-white border border-slate-200 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Target className="h-5 w-5 text-blue-600" />
          Key Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          {insights.map((insight, index) => {
            const IconComponent = insight.icon;
            return (
              <div key={index} className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center gap-3 mb-2">
                  <IconComponent className={`h-5 w-5 ${insight.color}`} />
                  <h3 className="text-sm font-medium text-slate-700">{insight.title}</h3>
                </div>
                <p className="text-lg font-semibold text-slate-900 mb-1">{insight.value}</p>
                <p className="text-xs text-slate-600">{insight.description}</p>
              </div>
            );
          })}
        </div>
        
        {/* Additional Performance Summary */}
        <div className="mt-6 pt-4 border-t border-slate-200">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{dashboardData.roi?.toFixed(1) || '0.0'}%</p>
              <p className="text-sm text-slate-600">ROI</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">${dashboardData.totalRevenue?.toLocaleString() || '0'}</p>
              <p className="text-sm text-slate-600">Total Revenue</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{dashboardData.totalLeads || '0'}</p>
              <p className="text-sm text-slate-600">Total Leads</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InsightsCard;