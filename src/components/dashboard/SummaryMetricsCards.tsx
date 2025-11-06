import { Card } from "@/components/ui/card";
import { debugLogger } from "@/lib/debug";
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
                <p className="text-4xl font-bold">
                  {dashboardData?.totalLeads !== undefined ? dashboardData.totalLeads : '—'}
                </p>
              </div>
              <div className="text-caption text-left mt-2">
                Meta: {dashboardData?.facebookMetrics?.leads !== undefined ? dashboardData.facebookMetrics.leads : '—'} • Google: {dashboardData?.googleMetrics?.leads !== undefined ? dashboardData.googleMetrics.leads : '—'}
              </div>
            </div>
          </div>
        </Card>

        <Card variant="elevated" className="p-6 h-32 summary-card">
          <div className="flex flex-col justify-between h-full">
            <div>
              <p className="text-label mb-3">COST PER LEAD</p>
              <div className="flex items-baseline gap-2 mb-3">
                <p className="text-4xl font-bold">
                  {dashboardData?.leadMetrics?.overallCostPerLead !== undefined 
                    ? `$${dashboardData.leadMetrics.overallCostPerLead.toFixed(2)}`
                    : '—'}
                </p>
              </div>
              <div className="text-caption text-left mt-2">
                Meta: {dashboardData?.facebookMetrics?.costPerLead !== undefined 
                  ? `$${dashboardData.facebookMetrics.costPerLead.toFixed(2)}`
                  : '—'} • Google: {dashboardData?.googleMetrics?.costPerLead !== undefined
                  ? `$${dashboardData.googleMetrics.costPerLead.toFixed(2)}`
                  : '—'}
              </div>
            </div>
          </div>
        </Card>

        <Card variant="elevated" className="p-6 h-32 summary-card">
          <div className="flex flex-col justify-between h-full">
            <div>
              <p className="text-label mb-3">AMOUNT SPENT</p>
              <div className="flex items-baseline gap-2 mb-3">
                <p className="text-4xl font-bold">
                  {dashboardData?.totalSpend !== undefined 
                    ? `$${Math.round(dashboardData.totalSpend).toLocaleString()}`
                    : '—'}
                </p>
              </div>
              <div className="text-caption text-left mt-2">
                Meta: {dashboardData?.facebookMetrics?.spend !== undefined
                  ? `$${Math.round(dashboardData.facebookMetrics.spend).toLocaleString()}`
                  : '—'} • Google: {dashboardData?.googleMetrics?.cost !== undefined
                  ? `$${Math.round(dashboardData.googleMetrics.cost).toLocaleString()}`
                  : '—'}
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
                    // Calculate weighted average conversion rate across both platforms
                    // Use leads for both platforms for consistency
                    // Only include platforms where we have both clicks AND leads
                    const googleClicks = dashboardData?.googleMetrics?.clicks;
                    const googleLeads = dashboardData?.googleMetrics?.leads;
                    const facebookClicks = dashboardData?.facebookMetrics?.clicks;
                    const facebookLeads = dashboardData?.facebookMetrics?.leads;
                    
                    // Only include platforms where we have both clicks and leads
                    let totalClicks = 0;
                    let totalLeads = 0;
                    
                    // Include Google only if we have both clicks and leads
                    if (googleClicks !== undefined && googleLeads !== undefined && googleClicks > 0) {
                      totalClicks += googleClicks;
                      totalLeads += googleLeads;
                    }
                    
                    // Include Facebook only if we have both clicks and leads
                    if (facebookClicks !== undefined && facebookLeads !== undefined && facebookClicks > 0) {
                      totalClicks += facebookClicks;
                      totalLeads += facebookLeads;
                    }
                    
                    // Only calculate if we have valid data from at least one platform
                    if (totalClicks === 0) {
                      return '—';
                    }
                    
                    // Calculate overall conversion rate: (total leads / total clicks) * 100
                    const overallConversionRate = (totalLeads / totalClicks) * 100;
                    return `${overallConversionRate.toFixed(1)}%`;
                  })()}
                </p>
              </div>
              <div className="text-caption text-left mt-2">
                Google: {(() => {
                  const googleClicks = dashboardData?.googleMetrics?.clicks;
                  const googleLeads = dashboardData?.googleMetrics?.leads;
                  
                  if (googleClicks === undefined || googleLeads === undefined) {
                    return '—';
                  }
                  if (googleClicks === 0) {
                    return '—';
                  }
                  const googleRate = (googleLeads / googleClicks) * 100;
                  return `${googleRate.toFixed(1)}%`;
                })()} • Meta: {(() => {
                  const facebookClicks = dashboardData?.facebookMetrics?.clicks;
                  const facebookLeads = dashboardData?.facebookMetrics?.leads;
                  
                  if (facebookClicks === undefined || facebookLeads === undefined) {
                    return '—';
                  }
                  if (facebookClicks === 0) {
                    return '—';
                  }
                  const facebookRate = (facebookLeads / facebookClicks) * 100;
                  return `${facebookRate.toFixed(1)}%`;
                })()}
              </div>
            </div>
          </div>
        </Card>

        <Card variant="elevated" className="p-6 h-32 summary-card">
          <div className="flex flex-col justify-between h-full">
            <div>
              <p className="text-label mb-3">WON</p>
              <div className="flex items-baseline gap-2 mb-3">
                <p className="text-4xl font-bold text-green-600">
                  {dashboardData?.ghlMetrics?.wonOpportunities !== undefined 
                    ? dashboardData.ghlMetrics.wonOpportunities 
                    : '—'}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
});
