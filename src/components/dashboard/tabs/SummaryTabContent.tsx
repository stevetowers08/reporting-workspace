// Summary Tab Content Component
import { Card } from "@/components/ui/card";
import { LoadingOverlay } from "@/components/ui/EnhancedLoadingSystem";
import { ComponentLoader } from "@/components/ui/ComponentLoader";
import { EventDashboardData } from '@/services/data/eventMetricsService';
import React, { Suspense, lazy } from "react";

// Lazy load components
const SummaryMetricsCards = lazy(() => 
  import('@/components/dashboard/SummaryMetricsCards')
    .then(module => ({ default: module.SummaryMetricsCards }))
    .catch(() => ({ default: () => <div>Failed to load component</div> }))
);

const PlatformPerformanceStatusChart = lazy(() => 
  import('@/components/dashboard/PlatformPerformanceStatusChart')
    .then(module => ({ default: module.PlatformPerformanceStatusChart }))
    .catch(() => ({ default: () => <div>Failed to load component</div> }))
);

const LeadByMonthChart = lazy(() => 
  import('@/components/dashboard/LeadByDayChart')
    .then(module => ({ default: module.LeadByMonthChart }))
    .catch(() => ({ default: () => <div>Failed to load component</div> }))
);

const KeyInsights = lazy(() => 
  import('@/components/dashboard/KeyInsights')
    .then(module => ({ default: module.KeyInsights }))
    .catch(() => ({ default: () => <div>Failed to load component</div> }))
);

interface SummaryTabContentProps {
  summaryLoading: boolean;
  summaryDashboardData?: EventDashboardData;
  dashboardData?: EventDashboardData;
  summaryTabRef: React.RefObject<HTMLDivElement>;
}

export const SummaryTabContent: React.FC<SummaryTabContentProps> = ({
  summaryLoading,
  summaryDashboardData,
  dashboardData,
  summaryTabRef
}) => {
  return (
    <div ref={summaryTabRef}>
      <LoadingOverlay isLoading={summaryLoading} message="Loading summary data...">
        
        <Suspense fallback={<ComponentLoader />}>
          <SummaryMetricsCards dashboardData={summaryDashboardData} />
        </Suspense>
        
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3 mt-6">
          <Card className="bg-white border border-slate-200 p-6">
            <div className="pb-3">
              <h3 className="text-lg font-semibold text-slate-900">Platform Performance</h3>
            </div>
            <div className="h-64">
              <Suspense fallback={<ComponentLoader />}>
                <PlatformPerformanceStatusChart data={dashboardData} />
              </Suspense>
            </div>
          </Card>

          <Card className="bg-white border border-slate-200 p-5">
            <div className="pb-2">
              <h3 className="text-lg font-semibold text-slate-900">Leads by Month</h3>
            </div>
            <div className="h-64 -mx-1">
              <LeadByMonthChart data={summaryDashboardData} />
            </div>
          </Card>

          <Suspense fallback={<ComponentLoader />}>
            <KeyInsights data={dashboardData} />
          </Suspense>
        </div>
        
      </LoadingOverlay>
    </div>
  );
};
