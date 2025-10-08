import { Card } from "@/components/ui/card";
import { EventDashboardData } from "@/services/data/eventMetricsService";
import React from 'react';

interface SummaryMetricsCardsProps {
  dashboardData: EventDashboardData | null | undefined;
}

export const SummaryMetricsCards = React.memo<SummaryMetricsCardsProps>(({ dashboardData }) => {
  return (
    <div className="mb-6">
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-5 mb-4">
        <Card variant="elevated" className="p-6 h-32">
          <div className="flex flex-col justify-between h-full">
            <div>
              <p className="text-label mb-2">LEADS</p>
              <div className="flex items-baseline gap-2 mb-2">
                <p className="text-4xl font-bold">{dashboardData?.totalLeads || '0'}</p>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-green-600 font-medium">↑ +18.5%</span>
                </div>
              </div>
              <div className="text-caption text-left">
                Meta: {dashboardData?.facebookMetrics?.leads || '0'} • Google: {dashboardData?.googleMetrics?.leads || '0'}
              </div>
            </div>
          </div>
        </Card>

        <Card variant="elevated" className="p-6 h-32">
          <div className="flex flex-col justify-between h-full">
            <div>
              <p className="text-label mb-2">COST PER LEAD</p>
              <div className="flex items-baseline gap-2 mb-2">
                <p className="text-4xl font-bold">${(dashboardData?.leadMetrics?.overallCostPerLead || 0).toFixed(2)}</p>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-red-600 font-medium">↓ -5.2%</span>
                </div>
              </div>
              <div className="text-caption text-left">
                Meta: ${(dashboardData?.facebookMetrics?.costPerLead || 0).toFixed(2)} • Google: ${(dashboardData?.googleMetrics?.costPerLead || 0).toFixed(2)}
              </div>
            </div>
          </div>
        </Card>

        <Card variant="elevated" className="p-6 h-32">
          <div className="flex flex-col justify-between h-full">
            <div>
              <p className="text-label mb-2">AMOUNT SPENT</p>
              <div className="flex items-baseline gap-2 mb-2">
                <p className="text-4xl font-bold">${dashboardData?.totalSpend?.toLocaleString() || '0'}</p>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-green-600 font-medium">↑ +5.2%</span>
                </div>
              </div>
              <div className="text-caption text-left">
                Meta: ${dashboardData?.facebookMetrics?.spend?.toLocaleString() || '0'} • Google: ${dashboardData?.googleMetrics?.cost?.toLocaleString() || '0'}
              </div>
            </div>
          </div>
        </Card>

        <Card variant="elevated" className="p-6 h-32">
          <div className="flex flex-col justify-between h-full">
            <div>
              <p className="text-label mb-2">CONV %</p>
              <div className="flex items-baseline gap-2 mb-2">
                <p className="text-4xl font-bold">{(dashboardData?.leadMetrics?.leadToOpportunityRate || 0).toFixed(1)}%</p>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-green-600 font-medium">↑ +3.1%</span>
                </div>
              </div>
              <div className="text-caption text-left">
                {dashboardData?.leadMetrics?.totalOpportunities || '0'} opportunities from {dashboardData?.totalLeads || '0'} leads
              </div>
            </div>
          </div>
        </Card>

        <Card variant="elevated" className="p-6 h-32">
          <div className="flex flex-col justify-between h-full">
            <div>
              <p className="text-label mb-2">WON</p>
              <div className="flex items-baseline gap-2 mb-2">
                <p className="text-4xl font-bold text-green-600">{dashboardData?.ghlMetrics?.wonOpportunities || '0'}</p>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-green-600 font-medium">↑ +12.8%</span>
                </div>
              </div>
              <div className="text-caption text-left">
                ${dashboardData?.ghlMetrics?.wonRevenue?.toLocaleString() || '0'} in closed revenue
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
});
