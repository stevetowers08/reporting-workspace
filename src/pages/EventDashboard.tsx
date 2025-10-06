import { AdminHeader } from "@/components/dashboard/AdminHeader";
import { ClientFacingHeader } from "@/components/dashboard/UnifiedHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner, LoadingState } from "@/components/ui/LoadingStates";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { PDFExportService } from "@/services/export/pdfExportService";


import { LeadByDayChart } from '@/components/dashboard/LeadByDayChart';
import { useAvailableClients, useClientData, useDashboardData } from '@/hooks/useDashboardQueries';
import React, { lazy, Suspense, useCallback, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

// Lazy load dashboard components for better performance
const SummaryMetricsCards = lazy(() => import('@/components/dashboard/SummaryMetricsCards').then(m => ({ default: m.SummaryMetricsCards })));
const MetaAdsMetricsCards = lazy(() => import('@/components/dashboard/MetaAdsMetricsCards').then(m => ({ default: m.MetaAdsMetricsCards })));
const GoogleAdsMetricsCards = lazy(() => import('@/components/dashboard/GoogleAdsMetricsCards').then(m => ({ default: m.GoogleAdsMetricsCards })));
const LeadInfoMetricsCards = lazy(() => import('@/components/dashboard/LeadInfoMetricsCards').then(m => ({ default: m.LeadInfoMetricsCards })));
const PlatformPerformanceStatusChart = lazy(() => import('@/components/dashboard/PlatformPerformanceStatusChart').then(m => ({ default: m.PlatformPerformanceStatusChart })));
const KeyInsights = lazy(() => import('@/components/dashboard/KeyInsights').then(m => ({ default: m.KeyInsights })));
const MetaAdsDemographics = lazy(() => import('@/components/dashboard/MetaAdsDemographics').then(m => ({ default: m.MetaAdsDemographics })));
const MetaAdsPlatformBreakdown = lazy(() => import('@/components/dashboard/MetaAdsPlatformBreakdown').then(m => ({ default: m.MetaAdsPlatformBreakdown })));
const GoogleAdsDemographics = lazy(() => import('@/components/dashboard/GoogleAdsDemographics').then(m => ({ default: m.GoogleAdsDemographics })));
const GoogleAdsCampaignBreakdown = lazy(() => import('@/components/dashboard/GoogleAdsCampaignBreakdown').then(m => ({ default: m.GoogleAdsCampaignBreakdown })));
const EventTypeBreakdown = lazy(() => import('@/components/dashboard/EventTypeBreakdown').then(m => ({ default: m.EventTypeBreakdown })));
const LeadSourceBreakdown = lazy(() => import('@/components/dashboard/LeadSourceBreakdown').then(m => ({ default: m.LeadSourceBreakdown })));
const GuestCountDistribution = lazy(() => import('@/components/dashboard/GuestCountDistribution').then(m => ({ default: m.GuestCountDistribution })));
const PreferredDayBreakdown = lazy(() => import('@/components/dashboard/PreferredDayBreakdown').then(m => ({ default: m.PreferredDayBreakdown })));
const LandingPagePerformance = lazy(() => import('@/components/dashboard/LandingPagePerformance').then(m => ({ default: m.LandingPagePerformance })));

// GHL-specific components
const GHLContactQualityCards = lazy(() => import('@/components/dashboard/GHLContactQualityCards').then(m => ({ default: m.GHLContactQualityCards })));
const GHLFunnelChart = lazy(() => import('@/components/dashboard/GHLFunnelChart').then(m => ({ default: m.GHLFunnelChart })));
const GHLFunnelAnalytics = lazy(() => import('@/components/dashboard/GHLFunnelAnalytics').then(m => ({ default: m.GHLFunnelAnalytics })));
const GHLPageAnalytics = lazy(() => import('@/components/dashboard/GHLPageAnalytics').then(m => ({ default: m.GHLPageAnalytics })));
const GHLPipelineStages = lazy(() => import('@/components/dashboard/GHLPipelineStages').then(m => ({ default: m.GHLPipelineStages })));
const GHLPageViewsAnalytics = lazy(() => import('@/components/dashboard/GHLPageViewsAnalytics').then(m => ({ default: m.GHLPageViewsAnalytics })));

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

  // Use React Query hooks for data fetching
  const { data: dashboardData, isLoading: dashboardLoading, error: dashboardError } = useDashboardData(actualClientId);
  const { data: clientData, isLoading: clientLoading, error: clientError } = useClientData(actualClientId);
  const { data: availableClients, isLoading: clientsLoading, error: clientsError } = useAvailableClients();
  
  // Transform clients for the dropdown
  const clients = (availableClients || []).map(client => ({
    id: client.id,
    name: client.name,
    logo_url: client.logo_url
  }));

  const handleExportPDF = useCallback(async () => {
    if (!dashboardData || !clientData) {return;}
    
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
      window.location.href = '/admin';
    }
  }, []);

  // Handle client selection - simple redirect
  const handleClientSelect = (clientId: string) => {
    window.location.href = `/dashboard/${clientId}`;
  };

  // Show loading state
  if (dashboardLoading || clientLoading) {
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
      {/* Internal Admin Header with Venue Dropdown - Only for internal users */}
      {!isShared && (
        <AdminHeader
          clients={clients}
          selectedClientId={actualClientId}
          onClientSelect={handleClientSelect}
          onBackToDashboard={() => {}}
          onGoToAdmin={handleSettings}
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

          {/* Lead Info Tab - Simplified for Venue Owners */}
          <TabsContent value="leads" className="mt-6">
            {/* Core Lead Metrics - Most Valuable for Venue Owners */}
            <Suspense fallback={<ComponentLoader />}>
              <LeadInfoMetricsCards data={dashboardData} />
            </Suspense>
            
            {/* Lead Source Performance - Shows which channels work best */}
            <div className="mt-6">
              <Suspense fallback={<ComponentLoader />}>
                <LeadSourceBreakdown data={dashboardData} />
              </Suspense>
            </div>
            
            {/* Guest Count Distribution - Shows venue capacity planning */}
            <div className="mt-6">
              <Suspense fallback={<ComponentLoader />}>
                <GuestCountDistribution data={dashboardData} />
              </Suspense>
            </div>
            
        {/* Conversion Funnel - Shows customer journey from page views to bookings */}
        <div className="mt-6">
          <Suspense fallback={<ComponentLoader />}>
            <GHLFunnelChart 
              locationId={dashboardData?.clientAccounts?.goHighLevel || 'V7bzEjKiigXzh8r6sQq0'} 
              dateRange={{ start: '2024-01-01', end: '2024-12-31' }} 
            />
          </Suspense>
        </div>

        {/* Funnel Analytics - Detailed funnel performance */}
        <div className="mt-6">
          <Suspense fallback={<ComponentLoader />}>
            <GHLFunnelAnalytics 
              locationId={dashboardData?.clientAccounts?.goHighLevel || 'V7bzEjKiigXzh8r6sQq0'} 
              dateRange={{ start: '2024-01-01', end: '2024-12-31' }} 
            />
          </Suspense>
        </div>

        {/* Page Analytics - Landing page performance */}
        <div className="mt-6">
          <Suspense fallback={<ComponentLoader />}>
            <GHLPageAnalytics 
              locationId={dashboardData?.clientAccounts?.goHighLevel || 'V7bzEjKiigXzh8r6sQq0'} 
              dateRange={{ start: '2024-01-01', end: '2024-12-31' }} 
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



