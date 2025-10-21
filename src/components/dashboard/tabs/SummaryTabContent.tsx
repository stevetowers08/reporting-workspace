// Summary Tab Content Component - Updated to use independent API calls
import { ComponentLoader } from "@/components/ui/ComponentLoader";
import { LoadingOverlay } from "@/components/ui/EnhancedLoadingSystem";
import { Card } from "@/components/ui/card";
import { useIndependentSummaryData } from '@/hooks/useIndependentSummaryData';
import React, { Suspense, lazy } from "react";

// Lazy load components
const SummaryMetricsCards = lazy(() => 
  import('@/components/dashboard/SummaryMetricsCards')
    .then(module => ({ default: module.SummaryMetricsCards }))
    .catch(() => ({ 
      default: React.memo(() => <div>Failed to load component</div>) 
    }))
);

const PlatformPerformanceStatusChart = lazy(() => 
  import('@/components/dashboard/PlatformPerformanceStatusChart')
    .then(module => ({ default: module.PlatformPerformanceStatusChart }))
    .catch(() => ({ 
      default: React.memo(() => <div>Failed to load component</div>) 
    }))
);

const LeadByMonthChart = lazy(() => 
  import('@/components/dashboard/LeadByMonthChart')
    .then(module => ({ default: module.LeadByMonthChart }))
    .catch(() => ({ 
      default: React.memo(() => <div>Failed to load component</div>) 
    }))
);

const KeyInsights = lazy(() => 
  import('@/components/dashboard/KeyInsights')
    .then(module => ({ default: module.KeyInsights }))
    .catch(() => ({ 
      default: React.memo(() => <div>Failed to load component</div>) 
    }))
);

interface SummaryTabContentProps {
  clientId: string;
  dateRange: { start: string; end: string };
}

export const SummaryTabContent: React.FC<SummaryTabContentProps> = ({
  clientId,
  dateRange
}) => {
  const { data, isLoading, error } = useIndependentSummaryData(clientId, dateRange);

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">
          <h3 className="text-lg font-semibold mb-2">Error Loading Summary Data</h3>
          <p>{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <LoadingOverlay isLoading={isLoading} message="Loading summary data...">
        
        <Suspense fallback={<ComponentLoader />}>
          <SummaryMetricsCards dashboardData={data} />
        </Suspense>
        
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3 mt-6">
          <Card className="bg-white border border-slate-200 p-6">
            <div className="pb-4">
              <h3 className="text-lg font-semibold text-slate-900">Platform Performance</h3>
            </div>
            <div className="h-64">
              <Suspense fallback={<ComponentLoader />}>
                <PlatformPerformanceStatusChart data={data} />
              </Suspense>
            </div>
          </Card>

          <Card className="bg-white border border-slate-200 p-6">
            <div className="pb-4">
              <h3 className="text-lg font-semibold text-slate-900">Leads by Month</h3>
            </div>
            <div className="h-64 ">
              <LeadByMonthChart 
                clientId={clientId}
              />
            </div>
          </Card>

          <Suspense fallback={<ComponentLoader />}>
            <KeyInsights data={data} />
          </Suspense>
        </div>
        
      </LoadingOverlay>
    </div>
  );
};