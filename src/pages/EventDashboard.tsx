import { AgencyHeader } from "@/components/dashboard/AgencyHeader";
import { ClientFacingHeader } from "@/components/dashboard/UnifiedHeader";
import { AppErrorBoundary } from "@/components/error/AppErrorBoundary";
import {
    LoadingOverlay,
    TabLoadingIndicator
} from "@/components/ui/LoadingIndicators";
import { LoadingSpinner, LoadingState } from "@/components/ui/LoadingStates";
import { Button } from "@/components/ui/button-simple";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs-simple";

// Import tab visibility fixes
import "@/styles/tab-visibility-fixes.css";

// ✅ FIX: Tab-specific error boundary to prevent tab disappearance
const TabErrorBoundary = ({ children, tabName }: { children: React.ReactNode; tabName: string }) => {
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    const handleError = (event: Event) => {
      // eslint-disable-next-line no-console
      console.error(`Tab ${tabName} error:`, event.error);
      setHasError(true);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, [tabName]);

  if (hasError) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        <div className="text-center">
          <p className="text-lg font-medium">Unable to load {tabName} tab</p>
          <p className="text-sm">Please try refreshing the page</p>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-4"
            size="sm"
          >
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};


import { useDashboardIntegrationConfig } from '@/hooks/useDashboardIntegrationConfig';
import { useAvailableClients, useClientData } from '@/hooks/useDashboardQueries';
import { usePDFExport } from '@/hooks/usePDFExport';
import { useGoogleTabData, useLeadsTabData, useMetaTabData, useSummaryTabData } from '@/hooks/useTabSpecificData';
import { EventDashboardData } from '@/services/data/eventMetricsService';
import React, { Suspense, lazy, useCallback, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";

// ✅ FIX: Safe lazy loading with proper error handling to prevent TDZ issues
const SummaryMetricsCards = lazy(() => 
  import('@/components/dashboard/SummaryMetricsCards')
    .then(module => ({ default: module.SummaryMetricsCards }))
    .catch(_error => {
      // Component loading failed - return fallback component
      return { default: () => <div>Failed to load component</div> };
    })
);

const MetaAdsMetricsCards = lazy(() => 
  import('@/components/dashboard/MetaAdsMetricsCards')
    .then(module => ({ default: module.MetaAdsMetricsCards }))
    .catch(_error => {
      // Component loading failed - return fallback component
      return { default: () => <div>Failed to load component</div> };
    })
);

const GoogleAdsMetricsCards = lazy(() => 
  import('@/components/dashboard/GoogleAdsMetricsCards')
    .then(module => ({ default: module.GoogleAdsMetricsCards }))
    .catch(_error => {
      // Component loading failed - return fallback component
      return { default: () => <div>Failed to load component</div> };
    })
);

const PlatformPerformanceStatusChart = lazy(() => 
  import('@/components/dashboard/PlatformPerformanceStatusChart')
    .then(module => ({ default: module.PlatformPerformanceStatusChart }))
    .catch(_error => {
      // Component loading failed - return fallback component
      return { default: () => <div>Failed to load component</div> };
    })
);

const KeyInsights = lazy(() => 
  import('@/components/dashboard/KeyInsights')
    .then(module => ({ default: module.KeyInsights }))
    .catch(_error => {
      // Component loading failed - return fallback component
      return { default: () => <div>Failed to load component</div> };
    })
);

const MetaAdsDemographics = lazy(() => 
  import('@/components/dashboard/MetaAdsDemographics')
    .then(module => ({ default: module.MetaAdsDemographics }))
    .catch(_error => {
      // Component loading failed - return fallback component
      return { default: () => <div>Failed to load component</div> };
    })
);

const MetaAdsPlatformBreakdown = lazy(() => 
  import('@/components/dashboard/MetaAdsPlatformBreakdown')
    .then(module => ({ default: module.MetaAdsPlatformBreakdown }))
    .catch(_error => {
      // Component loading failed - return fallback component
      return { default: () => <div>Failed to load component</div> };
    })
);

const GoogleAdsDemographics = lazy(() => 
  import('@/components/dashboard/GoogleAdsDemographics')
    .then(module => ({ default: module.GoogleAdsDemographics }))
    .catch(_error => {
      // Component loading failed - return fallback component
      return { default: () => <div>Failed to load component</div> };
    })
);

const GoogleAdsCampaignBreakdown = lazy(() => 
  import('@/components/dashboard/GoogleAdsCampaignBreakdown')
    .then(module => ({ default: module.GoogleAdsCampaignBreakdown }))
    .catch(_error => {
      // Component loading failed - return fallback component
      return { default: () => <div>Failed to load component</div> };
    })
);


// Chart.js replacements for recharts components
import { LeadByMonthChart } from '@/components/dashboard/LeadByMonthChart';
import { ChartCard, ConditionalChart, ResponsiveChartLayout } from '@/components/dashboard/ResponsiveChartLayout';
import { SmartChartLayout } from '@/components/dashboard/SmartChartLayout';

interface EventDashboardProps {
  isShared?: boolean;
  clientId?: string;
}

  // ✅ FIX: Enhanced loading component with error boundary
const ComponentLoader = () => (
  <div className="flex items-center justify-center h-32">
    <LoadingSpinner size="md" />
  </div>
);

// ✅ COMPREHENSIVE Error boundary for lazy loaded components and TDZ errors
const LazyComponentErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  const [hasError, setHasError] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string>('');

  React.useEffect(() => {
    const handleError = (event: Event) => {
      if (event.error && event.error.message) {
        const message = event.error.message;
        if (message.includes('Cannot access') && message.includes('before initialization')) {
          // TDZ Error detected - reloading page
          setErrorMessage(message);
          setHasError(true);
          // Reload after a short delay
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } else if (message.includes('Cannot read properties of undefined')) {
          // Undefined property error detected - reloading page
          setErrorMessage(message);
          setHasError(true);
          // Reload after a short delay
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      }
    };

    const handleUnhandledRejection = (event: Event) => {
      if (event.reason && event.reason.message) {
        const message = event.reason.message;
        if (message.includes('Cannot access') || message.includes('before initialization')) {
          // TDZ Error in promise detected - reloading page
          setErrorMessage(message);
          setHasError(true);
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  if (hasError) {
    return (
      <div className="flex items-center justify-center h-32 text-red-500">
        <div className="text-center">
          <p>Loading component...</p>
          <p className="text-sm text-gray-500">Please wait while we reload the page</p>
          <p className="text-xs text-gray-400 mt-2">Error: {errorMessage}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// TabErrorBoundary is imported from @/components/error/TabErrorBoundary

const EventDashboard: React.FC<EventDashboardProps> = ({ isShared = false, clientId }) => {
  // ✅ FIX: Initialize ALL hooks first to prevent TDZ issues
  const { clientId: urlClientId } = useParams<{ clientId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedPeriod, setSelectedPeriod] = useState("lastMonth");
  const [exportingPDF, setExportingPDF] = useState(false);
  
  
  // PDF export hook
  const { exportWithPlaywright, isExporting: _isExporting, error: _error } = usePDFExport();
  
  // Get active tab from URL params, default to "summary"
  const activeTab = searchParams.get('tab') || "summary";
  
  // ✅ FIX: Initialize all callbacks and memos AFTER all hooks
  const handleTabChange = useCallback((tab: string) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('tab', tab);
    setSearchParams(newSearchParams);
  }, [searchParams, setSearchParams]);

  // Helper function to get date range based on selected period
  const getDateRange = useCallback((period: string) => {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '14d':
        startDate.setDate(endDate.getDate() - 14);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case 'lastMonth': {
        // Last month: e.g., if today is Oct 10th, show Sep 1st to Sep 30th
        const lastMonth = new Date(endDate.getFullYear(), endDate.getMonth() - 1, 1);
        const lastMonthEnd = new Date(endDate.getFullYear(), endDate.getMonth(), 0);
        startDate.setTime(lastMonth.getTime());
        endDate.setTime(lastMonthEnd.getTime());
        break;
      }
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1y':
        startDate.setDate(endDate.getDate() - 365);
        break;
      default: {
        // Default to last month instead of last 30 days
        const lastMonth = new Date(endDate.getFullYear(), endDate.getMonth() - 1, 1);
        const lastMonthEnd = new Date(endDate.getFullYear(), endDate.getMonth(), 0);
        startDate.setTime(lastMonth.getTime());
        endDate.setTime(lastMonthEnd.getTime());
        break;
      }
    }
    
    return {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    };
  }, []);

  // Get client ID from URL params, props, or URL path
  const actualClientId = useMemo(() => {
    if (urlClientId) {
      return urlClientId;
    }
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/share/')) {
      const urlClientId = window.location.pathname.split('/share/')[1];
      return clientId || urlClientId;
    }
    return clientId;
  }, [clientId, urlClientId]);

  // Use React Query hooks for data fetching
  const dateRange = useMemo(() => getDateRange(selectedPeriod), [selectedPeriod, getDateRange]);

  // ✅ FIX: Declare clientData BEFORE using it in callbacks to prevent TDZ
  const { data: clientData, isLoading: clientLoading, error: clientError } = useClientData(actualClientId);
  const { data: availableClients, isLoading: clientsLoading, error: clientsError } = useAvailableClients();

  // ✅ FIX: Load tab-specific data AFTER all basic hooks and callbacks
  const { data: summaryData, isLoading: summaryLoading, error: summaryError } = useSummaryTabData(
    actualClientId, 
    dateRange
  );
  
  const { data: metaData, isLoading: metaLoading, error: metaError } = useMetaTabData(
    actualClientId, 
    dateRange,
    activeTab
  );
  
  const { data: googleData, isLoading: googleLoading, error: googleError } = useGoogleTabData(
    actualClientId, 
    dateRange,
    activeTab
  );
  
  const { data: leadsData, isLoading: leadsLoading, error: leadsError } = useLeadsTabData(
    actualClientId, 
    dateRange,
    activeTab
  );
  
  // Get client integration settings for dynamic configuration
  const clientIntegrationEnabled = useMemo(() => {
    if (!clientData) return undefined;
    return (clientData as unknown as { integration_enabled?: Record<string, boolean> })?.integration_enabled || {
      facebookAds: true,
      googleAds: true,
      goHighLevel: true,
      googleSheets: true
    };
  }, [clientData]);
  
  // ✅ FIX: clientData already declared above to prevent TDZ

  // Get current tab data based on active tab
  const getCurrentTabData = () => {
    switch (activeTab) {
      case 'summary':
        return summaryData;
      case 'meta':
        return metaData;
      case 'google':
        return googleData;
      case 'leads':
        return leadsData;
      default:
        return summaryData;
    }
  };


  const getCurrentTabError = () => {
    switch (activeTab) {
      case 'summary':
        return summaryError;
      case 'meta':
        return metaError;
      case 'google':
        return googleError;
      case 'leads':
        return leadsError;
      default:
        return summaryError;
    }
  };

  // Helper function to ensure we have valid dashboard data
  const getValidDashboardData = (data: unknown): EventDashboardData | undefined => {
    if (!data || typeof data !== 'object') {
      return undefined;
    }
    // Check if we have the required structure, even if values are 0
    if (Object.prototype.hasOwnProperty.call(data, 'totalLeads') && 
        Object.prototype.hasOwnProperty.call(data, 'facebookMetrics') && 
        Object.prototype.hasOwnProperty.call(data, 'googleMetrics')) {
      return data as EventDashboardData;
    }
    return undefined;
  };

  // Get dashboard data for integration config (needs to be after data fetching)
  const dashboardData = getValidDashboardData(getCurrentTabData());
  
  // ✅ FIX: Use summary data for integration config to prevent tabs from disappearing
  // Summary data includes all integrations, so it provides stable tab visibility
  const stableDashboardData = getValidDashboardData(summaryData);
  
  // Get dynamic integration configuration BEFORE using it in callbacks
  const integrationConfig = useDashboardIntegrationConfig(stableDashboardData, clientIntegrationEnabled);
  
  // ✅ FIX: Create a more stable tab configuration that doesn't change frequently
  const stableTabConfig = useMemo(() => {
    console.log('🔧 EventDashboard: Creating stable tab config', {
      integrationConfig: integrationConfig.visibleTabs,
      hasClientData: !!clientData
    });
    
    return {
      ...integrationConfig,
      visibleTabs: {
        summary: true, // Always show summary tab for stable UI
        meta: integrationConfig.visibleTabs.meta,
        google: integrationConfig.visibleTabs.google,
        leads: integrationConfig.visibleTabs.leads,
      }
    };
  }, [integrationConfig, clientData]); // Only depend on integrationConfig and clientData, not individual tab data

  // Handle PDF export with tabs (moved here to avoid TDZ with integrationConfig)
  const handleExportPDF = useCallback(async () => {
    if (!clientData) {
      console.warn('Client data not available for export');
      return;
    }

    setExportingPDF(true);
    try {
      // Try Playwright export first (server-side rendering - perfect fidelity)
      try {
        await exportWithPlaywright({
          clientName: clientData.name,
          dateRange: `${getDateRange(selectedPeriod).start} to ${getDateRange(selectedPeriod).end}`,
          tabs: ['summary', 'meta', 'google', 'leads'].filter(tab => 
            integrationConfig.visibleTabs[tab as keyof typeof integrationConfig.visibleTabs]
          )
        });
        return; // Success, exit early
      } catch (playwrightError) {
        console.error('Playwright export failed:', playwrightError);
        console.warn('PDF export failed. Please try again or contact support if the issue persists.');
      }
    } catch (_err) {
      // Export failed
      console.warn('Failed to export PDF. Please try again.');
    } finally {
      setExportingPDF(false);
    }
  }, [clientData, selectedPeriod, exportWithPlaywright, getDateRange, integrationConfig]);

  // Helper function to get the best available data for Summary tab
  const getSummaryData = (): EventDashboardData | undefined => {
    // Always prioritize Summary tab data (which includes both Facebook and Google Ads)
    const summaryDataTyped = summaryData as EventDashboardData | undefined;
    // Summary data analysis
    
    if (summaryDataTyped) {
      // Using Summary tab data (includes both Facebook and Google Ads)
      return summaryDataTyped;
    }
    
    // Fallback to Meta tab data only if Summary tab data is not available
    const metaDataTyped = metaData as EventDashboardData | undefined;
    // Checking Meta data as fallback
    
    if (metaDataTyped && metaDataTyped.facebookMetrics && metaDataTyped.facebookMetrics.leads > 0) {
      // Using Meta tab data as fallback (Summary data not available)
      return metaDataTyped;
    }
    
    // No data available for Summary tab
    return undefined;
  };

  const summaryDashboardData = getValidDashboardData(getSummaryData());
  const dashboardError = getCurrentTabError();
  
    // eslint-disable-next-line no-console
    console.log('🔧 EventDashboard: Summary tab active', {
      summaryDataAvailable: !!summaryData,
      metaDataAvailable: !!metaData,
      googleDataAvailable: !!googleData,
      leadsDataAvailable: !!leadsData,
      stableTabConfig: stableTabConfig.visibleTabs
    });
  
  // Transform clients for the dropdown
  const clients = (availableClients || []).map(client => ({
    id: client.id,
    name: client.name,
    logo_url: client.logo_url
  }));

  const handleShare = useCallback(() => {
    if (typeof window !== 'undefined' && actualClientId) {
      const shareUrl = `${window.location.origin}/share/${actualClientId}`;
      
      // Open URL in new window
      window.open(shareUrl, '_blank', 'noopener,noreferrer');
      
      // Copy to clipboard
      navigator.clipboard.writeText(shareUrl).then(() => {
        // Could show a toast notification here
      });
    }
  }, [actualClientId]);

  const handleSettings = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.location.href = '/agency';
    }
  }, []);

  // Handle client selection - simple redirect
  const handleClientSelect = (clientId: string) => {
    window.location.href = `/dashboard/${clientId}`;
  };

  // Show loading state - only require client data, allow dashboard to show with partial data
  if (clientLoading) {
    return <LoadingState message="Loading dashboard..." fullScreen />;
  }

  // Show error state
  if (dashboardError || clientError) {
    // EventDashboard Error occurred
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            {dashboardError?.message || clientError?.message || 'Failed to load dashboard'}
          </div>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  // Show client selection if no client ID
  if (!actualClientId) {
    if (clientsLoading) {
      return <LoadingState message="Loading clients..." fullScreen />;
    }

    if (clientsError) {
      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-600 mb-4">Failed to load clients</div>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-100 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-900 mb-8">Select a Client</h1>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {availableClients?.map((client) => (
              <Card key={client.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{client.name}</h3>
                  <p className="text-sm text-slate-600 mb-4">{client.type}</p>
                  <Button 
                    className="w-full"
                  >
                    View Dashboard
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <LazyComponentErrorBoundary>
      <div className="bg-slate-100 min-h-screen">
      {/* Internal Agency Header with Venue Dropdown - Only for internal users */}
      {!isShared && (
        <AgencyHeader
          clients={clients}
          selectedClientId={actualClientId}
          onClientSelect={handleClientSelect}
          onBackToDashboard={() => {}}
          onGoToAgency={handleSettings}
          onExportPDF={handleExportPDF}
          onShare={handleShare}
          exportingPDF={exportingPDF}
          isShared={isShared}
          showVenueSelector={true}
        />
      )}

      {/* Client-Facing Header - Always shown */}
      <ClientFacingHeader
        clientData={clientData ? { name: clientData.name, logo_url: clientData.logo_url } : undefined}
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        visibleTabs={stableTabConfig.visibleTabs}
      />

      {/* Main Content */}
      <div className="px-20 py-6">
        <div className="mx-auto">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-8">

          {/* Summary Tab */}
          <TabsContent value="summary" className="mt-6">
            <div>
            
            {/* Loading indicator for summary tab */}
            <TabLoadingIndicator 
              tabName="Summary" 
              isLoading={summaryLoading} 
              className="mb-4"
            />
            
            <LazyComponentErrorBoundary>
              <Suspense fallback={<ComponentLoader />}>
                <LoadingOverlay isLoading={summaryLoading} message="Loading summary data...">
                  <SummaryMetricsCards dashboardData={summaryDashboardData} />
                </LoadingOverlay>
              </Suspense>
            </LazyComponentErrorBoundary>
            
            {/* Dynamic Chart Layout - Responsive Grid */}
            <ResponsiveChartLayout className="mt-6" minItemWidth="300px" gap="1.5rem">
              {/* Platform Performance Chart */}
              <ConditionalChart show={integrationConfig.chartConfig.summary.showPlatformPerformance}>
                <ChartCard>
                  <div className="pb-3">
                    <h3 className="text-lg font-semibold text-slate-900">Platform Performance</h3>
                  </div>
                  <div className="h-64">
                    <LazyComponentErrorBoundary>
                      <Suspense fallback={<ComponentLoader />}>
                        <PlatformPerformanceStatusChart data={dashboardData} />
                      </Suspense>
                    </LazyComponentErrorBoundary>
                  </div>
                </ChartCard>
              </ConditionalChart>

              {/* Leads by Month Chart */}
              <ConditionalChart show={integrationConfig.chartConfig.summary.showLeadsByDay}>
                <ChartCard>
        <div className="pb-3">
          <h3 className="text-lg font-semibold text-slate-900">Leads by Month</h3>
        </div>
                  <div className="h-80">
                    <LeadByMonthChart data={summaryDashboardData} clientId={actualClientId} />
                  </div>
                </ChartCard>
              </ConditionalChart>

              {/* Key Insights Chart */}
              <ConditionalChart show={integrationConfig.chartConfig.summary.showKeyInsights}>
                <Suspense fallback={<ComponentLoader />}>
                  <KeyInsights data={dashboardData} />
                </Suspense>
              </ConditionalChart>
            </ResponsiveChartLayout>
            
            </div>
          </TabsContent>

          {/* Meta Ads Tab */}
          {stableTabConfig.visibleTabs.meta && (
            <TabsContent value="meta" className="mt-6">
              <TabErrorBoundary tabName="Meta">
                <div>
                
                {/* Loading indicator for Meta tab */}
                <TabLoadingIndicator 
                  tabName="Meta Ads" 
                  isLoading={metaLoading} 
                  className="mb-4"
                />
                
                <LazyComponentErrorBoundary>
                  <Suspense fallback={<ComponentLoader />}>
                    <LoadingOverlay isLoading={metaLoading} message="Loading Meta Ads data...">
                      <MetaAdsMetricsCards data={dashboardData} />
                    </LoadingOverlay>
                  </Suspense>
                </LazyComponentErrorBoundary>
                
                <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 mt-6">
                  <LazyComponentErrorBoundary>
                    <Suspense fallback={<ComponentLoader />}>
                      <MetaAdsDemographics data={dashboardData} />
                    </Suspense>
                  </LazyComponentErrorBoundary>
                  <LazyComponentErrorBoundary>
                    <Suspense fallback={<ComponentLoader />}>
                      <MetaAdsPlatformBreakdown data={dashboardData} />
                    </Suspense>
                  </LazyComponentErrorBoundary>
                </div>
                </div>
              </TabErrorBoundary>
            </TabsContent>
          )}

          {/* Google Ads Tab */}
          {stableTabConfig.visibleTabs.google && (
            <TabsContent value="google" className="mt-6">
              <TabErrorBoundary tabName="Google">
                <div>
                
                {/* Loading indicator for Google tab */}
                <TabLoadingIndicator 
                  tabName="Google Ads" 
                  isLoading={googleLoading} 
                  className="mb-4"
                />
                
                <LazyComponentErrorBoundary>
                  <Suspense fallback={<ComponentLoader />}>
                    <LoadingOverlay isLoading={googleLoading} message="Loading Google Ads data...">
                      <GoogleAdsMetricsCards data={dashboardData} />
                    </LoadingOverlay>
                  </Suspense>
                </LazyComponentErrorBoundary>
                
                <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 mt-6">
                  <LazyComponentErrorBoundary>
                    <Suspense fallback={<ComponentLoader />}>
                      <GoogleAdsDemographics data={dashboardData} />
                    </Suspense>
                  </LazyComponentErrorBoundary>
                  <LazyComponentErrorBoundary>
                    <Suspense fallback={<ComponentLoader />}>
                      <GoogleAdsCampaignBreakdown data={dashboardData} />
                    </Suspense>
                  </LazyComponentErrorBoundary>
                </div>
                </div>
              </TabErrorBoundary>
            </TabsContent>
          )}

          {/* Lead Info Tab - Venue-Focused Analytics */}
          {stableTabConfig.visibleTabs.leads && (
            <TabsContent value="leads" className="mt-6">
              <TabErrorBoundary tabName="Leads">
                <div>
                
                {/* Loading indicator for Leads tab */}
                <TabLoadingIndicator 
                  tabName="Lead Analytics" 
                  isLoading={leadsLoading} 
                  className="mb-4"
                />
                
                {/* Smart Chart Layout - 2 columns with automatic reordering */}
                <div className="mt-6">
                  <LazyComponentErrorBoundary>
                    <Suspense fallback={<ComponentLoader />}>
                      <AppErrorBoundary>
                        <LoadingOverlay isLoading={leadsLoading} message="Loading lead analytics data...">
                          <SmartChartLayout 
                            dashboardData={dashboardData}
                            dateRange={getDateRange(selectedPeriod)}
                            locationId={dashboardData?.clientAccounts?.goHighLevel || import.meta.env.VITE_DEFAULT_LOCATION_ID}
                            showExtraCharts={integrationConfig.chartConfig.leads.showExtraCharts}
                          />
                        </LoadingOverlay>
                      </AppErrorBoundary>
                    </Suspense>
                  </LazyComponentErrorBoundary>
                </div>
                
                </div>
              </TabErrorBoundary>
            </TabsContent>
          )}

        </Tabs>
        </div>
      </div>
    </div>
    </LazyComponentErrorBoundary>
  );
};

export default EventDashboard;



