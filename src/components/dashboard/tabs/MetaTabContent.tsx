// Meta Ads Tab Content Component
import { ComponentLoader } from "@/components/ui/ComponentLoader";
import { LoadingOverlay } from "@/components/ui/EnhancedLoadingSystem";
import { useMetaTabData } from '@/hooks/useTabSpecificData';
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
  clientId: string;
  dateRange: { start: string; end: string };
  clientData?: any;
}

export const MetaTabContent: React.FC<MetaTabContentProps> = React.memo(({
  clientId,
  dateRange,
  clientData
}) => {
  const { data, isLoading, error, isFetching } = useMetaTabData(clientId, dateRange, clientData);

  React.useEffect(() => {
    // State tracking for debugging if needed
  }, [isLoading, isFetching, data, error]);

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">
          <h3 className="text-lg font-semibold mb-2">Error Loading Meta Data</h3>
          <p>{error.message}</p>
        </div>
      </div>
    );
  }

  // Check if Facebook Ads integration is missing based on clientData
  const hasFacebookAdsIntegration = data?.clientData?.accounts?.facebookAds && 
    data.clientData.accounts.facebookAds !== 'none';

  // Show message if no Facebook Ads integration (only after loading completes)
  if (!isLoading && data && !hasFacebookAdsIntegration) {
    return (
      <div className="p-6">
        <div className="text-center text-slate-500">
          <h3 className="text-lg font-semibold mb-2">No Facebook Ads Integration</h3>
          <p>Please connect a Facebook Ads account to view analytics data.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <LoadingOverlay isLoading={isLoading} message="Loading Meta Ads data...">
        
        <Suspense fallback={<ComponentLoader />}>
          <MetaAdsMetricsCards data={data} />
        </Suspense>
        
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 mt-6">
          <Suspense fallback={<ComponentLoader />}>
            <MetaAdsDemographics data={data} />
          </Suspense>
          <Suspense fallback={<ComponentLoader />}>
            <MetaAdsPlatformBreakdown data={data} />
          </Suspense>
        </div>
        
      </LoadingOverlay>
    </div>
  );
});