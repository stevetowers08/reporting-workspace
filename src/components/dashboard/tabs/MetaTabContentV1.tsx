// Meta Ads Tab Content Component
import { ComponentLoader } from "@/components/ui/ComponentLoader";
import { LoadingOverlay } from "@/components/ui/EnhancedLoadingSystem";
import { EventDashboardData } from '@/services/data/eventMetricsService';
import React, { Suspense, lazy } from "react";

// Lazy load components
const MetaAdsMetricsCards = lazy(() => 
  import('@/components/dashboard/MetaAdsMetricsCards')
    .then(module => ({ default: module.MetaAdsMetricsCards }))
    .catch(() => ({ 
      default: React.memo(() => <div>Failed to load component</div>) 
    }))
);

const MetaAdsDemographics = lazy(() => 
  import('@/components/dashboard/MetaAdsDemographics')
    .then(module => ({ default: module.MetaAdsDemographics }))
    .catch(() => ({ 
      default: React.memo(() => <div>Failed to load component</div>) 
    }))
);

const MetaAdsPlatformBreakdown = lazy(() => 
  import('@/components/dashboard/MetaAdsPlatformBreakdown')
    .then(module => ({ default: module.MetaAdsPlatformBreakdown }))
    .catch(() => ({ 
      default: React.memo(() => <div>Failed to load component</div>) 
    }))
);

interface MetaTabContentProps {
  metaLoading: boolean;
  dashboardData?: EventDashboardData;
  metaTabRef: React.RefObject<HTMLDivElement>;
}

export const MetaTabContent: React.FC<MetaTabContentProps> = ({
  metaLoading,
  dashboardData,
  metaTabRef
}) => {
  return (
    <div ref={metaTabRef}>
      <LoadingOverlay isLoading={metaLoading} message="Loading Meta Ads data...">
        
        <Suspense fallback={<ComponentLoader />}>
          <MetaAdsMetricsCards data={dashboardData} />
        </Suspense>
        
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 mt-6">
          <Suspense fallback={<ComponentLoader />}>
            <MetaAdsDemographics data={dashboardData} />
          </Suspense>
          <Suspense fallback={<ComponentLoader />}>
            <MetaAdsPlatformBreakdown data={dashboardData} />
          </Suspense>
        </div>
        
      </LoadingOverlay>
    </div>
  );
};
