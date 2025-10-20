import { AgencyHeader } from "@/components/dashboard/AgencyHeader";
import { ClientFacingHeader } from "@/components/dashboard/UnifiedHeader";
import { EnhancedPageLoader, useLoading } from "@/components/ui/EnhancedLoadingSystem";
import { SummaryTabContent, MetaTabContent, GoogleTabContent, LeadsTabContent } from "@/components/dashboard/tabs";
import { Button } from "@/components/ui/button-simple";
import { Tabs, TabsContent } from "@/components/ui/tabs-simple";


import { useAvailableClients, useClientData } from '@/hooks/useDashboardQueries';
import { usePDFExport } from '@/hooks/usePDFExport';
import { useGoogleTabData, useLeadsTabData, useMetaTabData, useSummaryTabData } from '@/hooks/useTabSpecificData';
import { EventDashboardData } from '@/services/data/eventMetricsService';
import React, { useCallback, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";

interface EventDashboardProps {
  isShared?: boolean;
  clientId?: string;
}

// Global type declarations
declare global {
  interface ErrorEvent {
    error: Error;
    message: string;
  }
  interface PromiseRejectionEvent {
    reason: Error;
  }
  interface HTMLElement {
    // HTMLElement is already defined globally
  }
  interface HTMLDivElement {
    // HTMLDivElement is already defined globally
  }
  function alert(message: string): void;
}

// ✅ COMPREHENSIVE Error boundary for lazy loaded components and TDZ errors
const LazyComponentErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  const [hasError, setHasError] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string>('');

  React.useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.error && event.error.message) {
        const message = event.error.message;
        if (message.includes('Cannot access') && message.includes('before initialization')) {
          setErrorMessage(message);
          setHasError(true);
          // Reload after a short delay
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } else if (message.includes('Cannot read properties of undefined')) {
          setErrorMessage(message);
          setHasError(true);
          // Reload after a short delay
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason && event.reason.message) {
        const message = event.reason.message;
        if (message.includes('Cannot access') || message.includes('before initialization')) {
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

const EventDashboard: React.FC<EventDashboardProps> = ({ isShared = false, clientId }) => {
  // ✅ FIX: Initialize ALL hooks first to prevent TDZ issues
  const { clientId: urlClientId } = useParams<{ clientId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedPeriod, setSelectedPeriod] = useState("30d");
  const [exportingPDF, setExportingPDF] = useState(false);
  
  // Enhanced loading states
  const { startLoading: _startLoading, stopLoading: _stopLoading, isLoading: _isDashboardLoading } = useLoading('dashboard');
  
  // Refs for each tab content
  const summaryTabRef = useRef<HTMLDivElement>(null);
  const metaTabRef = useRef<HTMLDivElement>(null);
  const googleTabRef = useRef<HTMLDivElement>(null);
  const leadsTabRef = useRef<HTMLDivElement>(null);
  
  // PDF export hook
  const { exportTabsToPDF, isExporting: _isExporting, error: _error } = usePDFExport();
  
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
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1y':
        startDate.setDate(endDate.getDate() - 365);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }
    
    return {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    };
  }, []);

  // Get client ID from URL params, props, or URL path
  const actualClientId = useMemo(() => {
    if (urlClientId) {return urlClientId;}
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/share/')) {
      const urlClientId = window.location.pathname.split('/share/')[1];
      return clientId || urlClientId;
    }
    return clientId;
  }, [clientId, urlClientId]);

  // Use React Query hooks for data fetching
  const dateRange = getDateRange(selectedPeriod);

  // ✅ FIX: Declare clientData BEFORE using it in callbacks to prevent TDZ
  const { data: clientData, isLoading: clientLoading, error: clientError } = useClientData(actualClientId);
  const { data: availableClients, isLoading: clientsLoading, error: clientsError } = useAvailableClients();

  // Handle PDF export with tabs
  const handleExportPDF = useCallback(async () => {
    if (!clientData) {
      alert('Client data not available for export');
      return;
    }

    setExportingPDF(true);
    try {
      // Collect tab elements
      const tabElements: { [key: string]: HTMLElement } = {};
      
      if (summaryTabRef.current) {tabElements.summary = summaryTabRef.current;}
      if (metaTabRef.current) {tabElements.meta = metaTabRef.current;}
      if (googleTabRef.current) {tabElements.google = googleTabRef.current;}
      if (leadsTabRef.current) {tabElements.leads = leadsTabRef.current;}

      // Export all tabs as separate pages
      await exportTabsToPDF(tabElements, {
        clientName: clientData.name,
        logoUrl: clientData.logo_url,
        dateRange: getDateRange(selectedPeriod),
        includeAllTabs: true,
        includeCharts: true,
        includeDetailedMetrics: true
      });
    } catch (_err) {
      alert('Failed to export PDF. Please try again.');
    } finally {
      setExportingPDF(false);
    }
  }, [clientData, selectedPeriod, exportTabsToPDF, getDateRange]);

  // ✅ FIX: Load tab-specific data AFTER all basic hooks and callbacks
  const { data: summaryData, isLoading: summaryLoading, error: summaryError } = useSummaryTabData(
    actualClientId, 
    dateRange
  );
  
  const { data: metaData, isLoading: metaLoading, error: metaError } = useMetaTabData(
    actualClientId, 
    dateRange
  );
  
  const { data: googleData, isLoading: googleLoading, error: googleError } = useGoogleTabData(
    actualClientId, 
    dateRange
  );
  
  const { data: leadsData, isLoading: leadsLoading, error: leadsError } = useLeadsTabData(
    actualClientId, 
    dateRange
  );
  
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

  const getCurrentTabLoading = () => {
    switch (activeTab) {
      case 'summary':
        return summaryLoading;
      case 'meta':
        return metaLoading;
      case 'google':
        return googleLoading;
      case 'leads':
        return leadsLoading;
      default:
        return summaryLoading;
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

  // Helper function to get the best available data for Summary tab
  const getSummaryData = (): EventDashboardData | undefined => {
    // Always prioritize Summary tab data (which includes both Facebook and Google Ads)
    const summaryDataTyped = summaryData as EventDashboardData | undefined;
    
    if (summaryDataTyped) {
      return summaryDataTyped;
    }
    
    // Fallback to Meta tab data only if Summary tab data is not available
    const metaDataTyped = metaData as EventDashboardData | undefined;
    
    if (metaDataTyped && metaDataTyped.facebookMetrics && metaDataTyped.facebookMetrics.leads > 0) {
      return metaDataTyped;
    }
    
    return undefined;
  };

  const dashboardData = getValidDashboardData(getCurrentTabData());
  const summaryDashboardData = getValidDashboardData(getSummaryData());
  const dashboardLoading = getCurrentTabLoading();
  const dashboardError = getCurrentTabError();
  
  // Debug logging
  
  // Add alert for debugging
  if (activeTab === 'summary') {
    // Force a comparison with Meta tab data
    const _metaDataTyped = metaData as EventDashboardData | undefined;
  }
  
  // Transform clients for the dropdown
  const clients = (availableClients || []).map(client => ({
    id: client.id,
    name: client.name,
    logo_url: client.logo_url
  }));

  const handleShare = useCallback(() => {
    if (typeof window !== 'undefined' && actualClientId) {
      const shareUrl = `${window.location.origin}/share/${actualClientId}`;
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

  // Show loading state while any critical data is loading
  if (clientLoading || dashboardLoading) {
    return <EnhancedPageLoader 
      message="Loading Analytics Dashboard..." 
      showProgress={true}
      progress={clientLoading ? 30 : dashboardLoading ? 70 : 100}
    />;
  }

  // Show error state
  if (dashboardError || clientError) {
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
      return <EnhancedPageLoader 
        message="Loading Available Clients..." 
        showProgress={true}
        progress={50}
      />;
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
              <Card key={client.id} className="cursor-pointer transition-shadow">
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
      />

      {/* Main Content */}
      <div className="px-20 py-6">
        <div className="mx-auto">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-8">

          {/* Summary Tab */}
          <TabsContent value="summary" className="mt-6">
            <SummaryTabContent
              summaryLoading={summaryLoading}
              summaryDashboardData={summaryDashboardData}
              dashboardData={dashboardData}
              summaryTabRef={summaryTabRef}
            />
          </TabsContent>

          {/* Meta Ads Tab */}
          <TabsContent value="meta" className="mt-6">
            <MetaTabContent
              metaLoading={metaLoading}
              dashboardData={dashboardData}
              metaTabRef={metaTabRef}
            />
          </TabsContent>

          {/* Google Ads Tab */}
          <TabsContent value="google" className="mt-6">
            <GoogleTabContent
              googleLoading={googleLoading}
              dashboardData={dashboardData}
              googleTabRef={googleTabRef}
            />
          </TabsContent>

          {/* Lead Info Tab - Venue-Focused Analytics */}
          <TabsContent value="leads" className="mt-6">
            <LeadsTabContent
              leadsLoading={leadsLoading}
              dashboardData={dashboardData}
              clientData={clientData}
              dateRange={getDateRange(selectedPeriod)}
              leadsTabRef={leadsTabRef}
            />
          </TabsContent>

        </Tabs>
        </div>
      </div>
    </div>
    </LazyComponentErrorBoundary>
  );
};

export default EventDashboard;



