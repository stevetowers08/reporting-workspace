import { AgencyHeader } from "@/components/dashboard/AgencyHeader";
import { ClientFacingHeader } from "@/components/dashboard/UnifiedHeader";
import { Button } from "@/components/ui/button-simple";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner, LoadingState } from "@/components/ui/LoadingStates";
import { Tabs, TabsContent } from "@/components/ui/tabs-simple";
import { PDFExportService } from "@/services/export/pdfExportService";


import { LeadByDayChart } from '@/components/dashboard/LeadByDayChart';
import { useAvailableClients, useClientData } from '@/hooks/useDashboardQueries';
import { useGoogleTabData, useLeadsTabData, useMetaTabData, useSummaryTabData } from '@/hooks/useTabSpecificData';
import { Client } from '@/services/data/databaseService';
import { EventDashboardData } from '@/services/data/eventMetricsService';
import React, { lazy, Suspense, useCallback, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

// Lazy load chart components to avoid circular dependencies
const SummaryMetricsCards = lazy(() => import('@/components/dashboard/SummaryMetricsCards').then(module => ({ default: module.SummaryMetricsCards })));
const MetaAdsMetricsCards = lazy(() => import('@/components/dashboard/MetaAdsMetricsCards').then(module => ({ default: module.MetaAdsMetricsCards })));
const GoogleAdsMetricsCards = lazy(() => import('@/components/dashboard/GoogleAdsMetricsCards').then(module => ({ default: module.GoogleAdsMetricsCards })));
const PlatformPerformanceStatusChart = lazy(() => import('@/components/dashboard/PlatformPerformanceStatusChart').then(module => ({ default: module.PlatformPerformanceStatusChart })));
const KeyInsights = lazy(() => import('@/components/dashboard/KeyInsights').then(module => ({ default: module.KeyInsights })));
const MetaAdsDemographics = lazy(() => import('@/components/dashboard/MetaAdsDemographics').then(module => ({ default: module.MetaAdsDemographics })));
const MetaAdsPlatformBreakdown = lazy(() => import('@/components/dashboard/MetaAdsPlatformBreakdown').then(module => ({ default: module.MetaAdsPlatformBreakdown })));
const GoogleAdsDemographics = lazy(() => import('@/components/dashboard/GoogleAdsDemographics').then(module => ({ default: module.GoogleAdsDemographics })));
const GoogleAdsCampaignBreakdown = lazy(() => import('@/components/dashboard/GoogleAdsCampaignBreakdown').then(module => ({ default: module.GoogleAdsCampaignBreakdown })));
const EventTypeBreakdown = lazy(() => import('@/components/dashboard/EventTypeBreakdown').then(module => ({ default: module.EventTypeBreakdown })));
const LeadSourceBreakdown = lazy(() => import('@/components/dashboard/LeadSourceBreakdown').then(module => ({ default: module.LeadSourceBreakdown })));
const GuestCountDistribution = lazy(() => import('@/components/dashboard/GuestCountDistribution').then(module => ({ default: module.GuestCountDistribution })));
const PreferredDayBreakdown = lazy(() => import('@/components/dashboard/PreferredDayBreakdown').then(module => ({ default: module.PreferredDayBreakdown })));
const LandingPagePerformance = lazy(() => import('@/components/dashboard/LandingPagePerformance').then(module => ({ default: module.LandingPagePerformance })));
const SmartChartLayout = lazy(() => import('@/components/dashboard/SmartChartLayout').then(module => ({ default: module.SmartChartLayout })));
const LeadInfoMetricsCards = lazy(() => import('@/components/dashboard/LeadInfoMetricsCards').then(module => ({ default: module.LeadInfoMetricsCards })));
const GHLContactQualityCards = lazy(() => import('@/components/dashboard/GHLContactQualityCards').then(module => ({ default: module.GHLContactQualityCards })));
// Chart.js replacements for recharts components
import { SimpleChart } from '@/components/dashboard/SimpleChart';
import { CHART_COLORS } from '@/components/ui/chart-wrapper';

interface EventDashboardProps {
  isShared?: boolean;
  clientId?: string;
}

// Loading component for Suspense fallback
const ComponentLoader = () => (
  <div className="flex items-center justify-center h-32">
    <LoadingSpinner size="md" />
  </div>
);

const EventDashboard: React.FC<EventDashboardProps> = ({ isShared = false, clientId }) => {
  const { clientId: urlClientId } = useParams<{ clientId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState("30d");
  const [exportingPDF, setExportingPDF] = useState(false);
  
  // Get active tab from URL params, default to "summary"
  const activeTab = searchParams.get('tab') || "summary";
  
  // Handle tab change by updating URL params
  const handleTabChange = useCallback((tab: string) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('tab', tab);
    setSearchParams(newSearchParams);
  }, [searchParams, setSearchParams]);

  // Get client ID from URL params, props, or URL path
  const actualClientId = useMemo(() => {
    if (urlClientId) {return urlClientId;}
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/share/')) {
      const urlClientId = window.location.pathname.split('/share/')[1];
      return clientId || urlClientId;
    }
    return clientId;
  }, [clientId, urlClientId]);

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

  // Use React Query hooks for data fetching
  const dateRange = getDateRange(selectedPeriod);
  
  // Load tab-specific data based on active tab
  const { data: summaryData, isLoading: summaryLoading, error: summaryError } = useSummaryTabData(
    actualClientId, 
    activeTab === 'summary' ? dateRange : undefined
  );
  
  const { data: metaData, isLoading: metaLoading, error: metaError } = useMetaTabData(
    actualClientId, 
    activeTab === 'meta' ? dateRange : undefined
  );
  
  const { data: googleData, isLoading: googleLoading, error: googleError } = useGoogleTabData(
    actualClientId, 
    activeTab === 'google' ? dateRange : undefined
  );
  
  const { data: leadsData, isLoading: leadsLoading, error: leadsError } = useLeadsTabData(
    actualClientId, 
    activeTab === 'leads' ? dateRange : undefined
  );
  
  const { data: clientData, isLoading: clientLoading, error: clientError } = useClientData(actualClientId);
  const { data: availableClients, isLoading: clientsLoading, error: clientsError } = useAvailableClients();

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
  const getValidDashboardData = (data: any): EventDashboardData | undefined => {
    if (!data || typeof data !== 'object') {
      return undefined;
    }
    // Check if we have the required structure, even if values are 0
    if (data.hasOwnProperty('totalLeads') && 
        data.hasOwnProperty('facebookMetrics') && 
        data.hasOwnProperty('googleMetrics')) {
      return data as EventDashboardData;
    }
    return undefined;
  };

  const dashboardData = getValidDashboardData(getCurrentTabData());
  const dashboardLoading = getCurrentTabLoading();
  const dashboardError = getCurrentTabError();
  
  // Debug logging
  console.log('🔍 EventDashboard: Active tab:', activeTab);
  console.log('🔍 EventDashboard: Current tab data:', getCurrentTabData());
  console.log('🔍 EventDashboard: Valid dashboard data:', dashboardData);
  console.log('🔍 EventDashboard: Dashboard loading:', dashboardLoading);
  console.log('🔍 EventDashboard: Dashboard error:', dashboardError);
  
  // Transform clients for the dropdown
  const clients = (availableClients || []).map(client => ({
    id: client.id,
    name: client.name,
    logo_url: client.logo_url
  }));

  const handleExportPDF = useCallback(async () => {
    if (!dashboardData || !clientData) {
      return;
    }
    
    setExportingPDF(true);
    try {
      await PDFExportService.exportDashboardToPDF(dashboardData, { 
        clientName: clientData?.name || 'Dashboard',
        logoUrl: clientData?.logo_url,
        dateRange: selectedPeriod,
        includeCharts: true,
        includeDetailedMetrics: true
      });
    } catch {
      // Handle error silently or show user-friendly message
    } finally {
      setExportingPDF(false);
    }
  }, [dashboardData, clientData, selectedPeriod]);

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

  // Show loading state - only require client data, allow dashboard to show with partial data
  if (clientLoading) {
    return <LoadingState message="Loading dashboard..." fullScreen />;
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
            <Suspense fallback={<ComponentLoader />}>
              <SummaryMetricsCards dashboardData={dashboardData} />
            </Suspense>
            
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-3 mt-6">
              <Card className="bg-white border border-slate-200 shadow-sm p-6">
                <div className="pb-3">
                  <h3 className="text-lg font-semibold text-slate-900">Platform Performance</h3>
                </div>
                <div className="h-64">
                  <Suspense fallback={<ComponentLoader />}>
                    <PlatformPerformanceStatusChart data={dashboardData} />
                  </Suspense>
                </div>
              </Card>

              <Card className="bg-white border border-slate-200 shadow-sm p-6">
                <div className="pb-3">
                  <h3 className="text-lg font-semibold text-slate-900">Leads by Day</h3>
                </div>
                <div className="h-64">
                  <LeadByDayChart data={dashboardData} />
                </div>
              </Card>

              <Suspense fallback={<ComponentLoader />}>
                <KeyInsights data={dashboardData} />
              </Suspense>
            </div>
          </TabsContent>

          {/* Meta Ads Tab */}
          <TabsContent value="meta" className="mt-6">
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
          </TabsContent>

          {/* Google Ads Tab */}
          <TabsContent value="google" className="mt-6">
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
          </TabsContent>

          {/* Lead Info Tab - Venue-Focused Analytics */}
          <TabsContent value="leads" className="mt-6">
            {/* Lead Info Metrics Cards - Google Sheets Data */}
            <Suspense fallback={<ComponentLoader />}>
              <LeadInfoMetricsCards 
                data={dashboardData} 
                clientData={clientData as Client | null}
                dateRange={getDateRange(selectedPeriod)}
              />
            </Suspense>
            
            {/* Top-Level Funnel Metrics - Very Top */}
              <SimpleChart 
                title="Funnel Metrics"
                type="bar"
                data={{
                  labels: ['Leads', 'Contacts', 'Opportunities', 'Deals'],
                  datasets: [{
                    label: 'Count',
                    data: [150, 120, 80, 45],
                    backgroundColor: CHART_COLORS.palette[0],
                  }]
                }}
              />
            
            {/* Smart Chart Layout - 2 columns with automatic reordering */}
            <div className="mt-6">
              <Suspense fallback={<ComponentLoader />}>
                <SmartChartLayout 
                  dashboardData={dashboardData}
                  dateRange={getDateRange(selectedPeriod)}
                  locationId={dashboardData?.clientAccounts?.goHighLevel || 'V7bzEjKiigXzh8r6sQq0'}
                />
              </Suspense>
            </div>
            
          </TabsContent>

        </Tabs>
        </div>
      </div>
    </div>
  );
};

export default EventDashboard;



