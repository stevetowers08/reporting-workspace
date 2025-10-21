// Google Ads Tab Content Component
import { ComponentLoader } from "@/components/ui/ComponentLoader";
import { LoadingOverlay } from "@/components/ui/EnhancedLoadingSystem";
import { useGoogleTabData } from '@/hooks/useTabSpecificData';
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
  clientId: string;
  dateRange: { start: string; end: string };
}

export const GoogleTabContent: React.FC<GoogleTabContentProps> = ({
  clientId,
  dateRange
}) => {
  const { data, isLoading, error } = useGoogleTabData(clientId, dateRange);

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">
          <h3 className="text-lg font-semibold mb-2">Error Loading Google Data</h3>
          <p>{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <LoadingOverlay isLoading={isLoading} message="Loading Google Ads data...">
        
        <Suspense fallback={<ComponentLoader />}>
          <GoogleAdsMetricsCards data={data} />
        </Suspense>
        
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 mt-6">
          <Suspense fallback={<ComponentLoader />}>
            <GoogleAdsDemographics data={data} />
          </Suspense>
          <Suspense fallback={<ComponentLoader />}>
            <GoogleAdsCampaignBreakdown data={data} />
          </Suspense>
        </div>
        
      </LoadingOverlay>
    </div>
  );
};