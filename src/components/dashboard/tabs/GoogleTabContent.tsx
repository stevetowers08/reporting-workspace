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

  // Check if Google Ads integration is missing
  // Only check if data exists (query has completed)
  const hasGoogleAdsIntegration = data?.clientData?.accounts?.googleAds && 
    data.clientData.accounts.googleAds !== 'none';
  
  // Show loading only if we're actually loading AND we have an integration (or don't know yet)
  // If we know there's no integration, don't show loading
  const hasMainMetrics = !!data?.googleMetrics;
  const hasBreakdown = !!data?.googleMetrics?.campaignBreakdown;
  
  // Show loading if:
  // 1. We're still loading AND we don't know if there's an integration yet, OR
  // 2. We're still loading AND there IS an integration (waiting for data)
  const isDataLoading = isLoading && (hasGoogleAdsIntegration !== false);
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
      <LoadingOverlay isLoading={isDataLoading} message="Loading Google Ads data...">
        <Suspense fallback={<ComponentLoader />}>
          <GoogleAdsMetricsCards data={data} isLoading={isDataLoading} />
        </Suspense>
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 mt-6">
          <Suspense fallback={<ComponentLoader />}>
            {breakdownLoading ? (
              <div className="bg-white border border-slate-200 p-6 rounded-lg">
                <div className="text-sm text-slate-500">Loading campaign breakdown...</div>
              </div>
            ) : hasMainMetrics ? (
              <GoogleAdsCampaignBreakdown data={data} />
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