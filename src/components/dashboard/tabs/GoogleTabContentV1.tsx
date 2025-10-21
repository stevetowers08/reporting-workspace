// Google Ads Tab Content Component
import { ComponentLoader } from "@/components/ui/ComponentLoader";
import { LoadingOverlay } from "@/components/ui/EnhancedLoadingSystem";
import { EventDashboardData } from '@/services/data/eventMetricsService';
import React, { Suspense, lazy } from "react";

// Lazy load components
const GoogleAdsMetricsCards = lazy(() => 
  import('@/components/dashboard/GoogleAdsMetricsCards')
    .then(module => ({ default: module.GoogleAdsMetricsCards }))
    .catch(() => ({ 
      default: React.memo(() => <div>Failed to load component</div>) 
    }))
);

const GoogleAdsDemographics = lazy(() => 
  import('@/components/dashboard/GoogleAdsDemographics')
    .then(module => ({ default: module.GoogleAdsDemographics }))
    .catch(() => ({ 
      default: React.memo(() => <div>Failed to load component</div>) 
    }))
);

const GoogleAdsCampaignBreakdown = lazy(() => 
  import('@/components/dashboard/GoogleAdsCampaignBreakdown')
    .then(module => ({ default: module.GoogleAdsCampaignBreakdown }))
    .catch(() => ({ 
      default: React.memo(() => <div>Failed to load component</div>) 
    }))
);

interface GoogleTabContentProps {
  googleLoading: boolean;
  dashboardData?: EventDashboardData;
  googleTabRef: React.RefObject<HTMLDivElement>;
}

export const GoogleTabContent: React.FC<GoogleTabContentProps> = ({
  googleLoading,
  dashboardData,
  googleTabRef
}) => {
  return (
    <div ref={googleTabRef}>
      <LoadingOverlay isLoading={googleLoading} message="Loading Google Ads data...">
        
        <Suspense fallback={<ComponentLoader />}>
          <GoogleAdsMetricsCards data={dashboardData} />
        </Suspense>
        
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 mt-6">
          <Suspense fallback={<ComponentLoader />}>
            <GoogleAdsDemographics data={dashboardData} />
          </Suspense>
          <Suspense fallback={<ComponentLoader />}>
            <GoogleAdsCampaignBreakdown data={dashboardData} />
          </Suspense>
        </div>
        
      </LoadingOverlay>
    </div>
  );
};
