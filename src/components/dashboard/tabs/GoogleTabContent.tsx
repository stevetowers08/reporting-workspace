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

const GoogleAdsCampaignBreakdown = lazy(() => 
  import('@/components/dashboard/GoogleAdsCampaignBreakdown')
    .then(module => ({ default: module.GoogleAdsCampaignBreakdown }))
    .catch(() => ({ 
      default: React.memo(() => <div>Failed to load component</div>) 
    }))
);

interface GoogleTabContentProps {
  clientId: string;
  dateRange: { start: string; end: string; period?: string };
  clientData?: any;
}

export const GoogleTabContent: React.FC<GoogleTabContentProps> = ({
  clientId,
  dateRange,
  clientData
}) => {
  const { data, isLoading, error } = useGoogleTabData(clientId, dateRange, clientData);

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

  // Check if Google Ads integration is missing based on clientData
  const hasGoogleAdsIntegration = data?.clientData?.accounts?.googleAds && 
    data.clientData.accounts.googleAds !== 'none';
  
  const hasMainMetrics = !!data?.googleMetrics;
  const hasBreakdown = !!data?.googleMetrics?.campaignBreakdown;
  
  const breakdownLoading = hasMainMetrics && !hasBreakdown;

  // Show message if no Google Ads integration (only after loading completes)
  if (!isLoading && data && !hasGoogleAdsIntegration) {
    return (
      <div className="p-6">
        <div className="text-center text-slate-500">
          <h3 className="text-lg font-semibold mb-2">No Google Ads Integration</h3>
          <p>Please connect a Google Ads account to view analytics data.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <LoadingOverlay isLoading={isLoading} message="Loading Google Ads data...">
        <Suspense fallback={<ComponentLoader />}>
          <GoogleAdsMetricsCards data={data} isLoading={isLoading} />
        </Suspense>
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 mt-6">
          <Suspense fallback={<ComponentLoader />}>
            {breakdownLoading ? (
              <div className="bg-white border border-slate-200 p-6 rounded-lg">
                <div className="text-sm text-slate-500">Loading campaign breakdown...</div>
              </div>
            ) : hasMainMetrics ? (
              <GoogleAdsCampaignBreakdown data={data} isLoading={breakdownLoading} />
            ) : (
              <div className="bg-white border border-slate-200 p-6 rounded-lg">
                <div className="text-sm text-slate-500">Loading campaign breakdown...</div>
              </div>
            )}
          </Suspense>
        </div>
      </LoadingOverlay>
    </div>
  );
};