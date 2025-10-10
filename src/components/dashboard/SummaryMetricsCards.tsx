import { Card } from "@/components/ui/card";
import { EventDashboardData } from "@/services/data/eventMetricsService";
import React from 'react';

interface SummaryMetricsCardsProps {
  dashboardData: EventDashboardData | null | undefined;
}

export const SummaryMetricsCards = React.memo<SummaryMetricsCardsProps>(({ dashboardData }) => {
  debugLogger.debug('SummaryMetricsCards', 'Received dashboardData', { 
    dashboardData, 
    facebookMetrics: dashboardData?.facebookMetrics,
    googleMetrics: dashboardData?.googleMetrics,
    googleCostPerLead: dashboardData?.googleMetrics?.costPerLead,
    totalLeads: dashboardData?.totalLeads
  });
  
  return (
    <div className="mb-6">
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-5 mb-4">
        <Card variant="elevated" className="p-6 h-32 summary-card">
          <div className="flex flex-col justify-between h-full">
            <div>
              <p className="text-label mb-3">LEADS</p>
              <div className="flex items-baseline gap-2 mb-3">
                <p className="text-4xl font-bold">{dashboardData?.totalLeads || '0'}</p>
              </div>
              <div className="text-caption text-left mt-2">
                Meta: {dashboardData?.facebookMetrics?.leads || '0'} • Google: {dashboardData?.googleMetrics?.leads || '0'}
              </div>
            </div>
          </div>
        </Card>

        <Card variant="elevated" className="p-6 h-32 summary-card">
          <div className="flex flex-col justify-between h-full">
            <div>
              <p className="text-label mb-3">COST PER LEAD</p>
              <div className="flex items-baseline gap-2 mb-3">
                <p className="text-4xl font-bold">${(dashboardData?.leadMetrics?.overallCostPerLead || 0).toFixed(2)}</p>
              </div>
              <div className="text-caption text-left mt-2">
                Meta: ${(dashboardData?.facebookMetrics?.costPerLead || 0).toFixed(2)} • Google: ${(dashboardData?.googleMetrics?.costPerLead || 0).toFixed(2)}
              </div>
            </div>
          </div>
        </Card>

        <Card variant="elevated" className="p-6 h-32 summary-card">
          <div className="flex flex-col justify-between h-full">
            <div>
              <p className="text-label mb-3">AMOUNT SPENT</p>
              <div className="flex items-baseline gap-2 mb-3">
                <p className="text-4xl font-bold">${Math.round(dashboardData?.totalSpend || 0).toLocaleString()}</p>
              </div>
              <div className="text-caption text-left mt-2">
                Meta: ${Math.round(dashboardData?.facebookMetrics?.spend || 0).toLocaleString()} • Google: ${Math.round(dashboardData?.googleMetrics?.cost || 0).toLocaleString()}
              </div>
            </div>
          </div>
        </Card>

        <Card variant="elevated" className="p-6 h-32 summary-card">
          <div className="flex flex-col justify-between h-full">
            <div>
              <p className="text-label mb-3">CONV %</p>
              <div className="flex items-baseline gap-2 mb-3">
                <p className="text-4xl font-bold">
                  {(() => {
                    // Calculate overall conversion rate from Google Ads data
                    const googleConversionRate = dashboardData?.googleMetrics?.conversionRate || 0;
                    const facebookConversionRate = dashboardData?.facebookMetrics?.clicks && dashboardData?.facebookMetrics?.leads
                      ? (dashboardData.facebookMetrics.leads / dashboardData.facebookMetrics.clicks) * 100
                      : 0;
                    
                    // Use Google Ads conversion rate if available, otherwise Facebook
                    const overallConversionRate = googleConversionRate > 0 ? googleConversionRate : facebookConversionRate;
                    return overallConversionRate.toFixed(1);
                  })()}%
                </p>
              </div>
              <div className="text-caption text-left mt-2">
                Google: {(dashboardData?.googleMetrics?.conversionRate || 0).toFixed(1)}% • Meta: {(() => {
                  const facebookRate = dashboardData?.facebookMetrics?.clicks && dashboardData?.facebookMetrics?.leads
                    ? (dashboardData.facebookMetrics.leads / dashboardData.facebookMetrics.clicks) * 100
                    : 0;
                  return facebookRate.toFixed(1);
                })()}%
              </div>
            </div>
          </div>
        </Card>

        <Card variant="elevated" className="p-6 h-32 summary-card">
          <div className="flex flex-col justify-between h-full">
            <div>
              <p className="text-label mb-3">WON</p>
              <div className="flex items-baseline gap-2 mb-3">
                <p className="text-4xl font-bold text-green-600">{dashboardData?.ghlMetrics?.wonOpportunities || '0'}</p>
              </div>
              <div className="text-caption text-left mt-2">
                ${dashboardData?.ghlMetrics?.wonRevenue?.toLocaleString() || '0'} in closed revenue
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
});
