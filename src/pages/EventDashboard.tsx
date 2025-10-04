import { AdminHeader } from "@/components/dashboard/AdminHeader";
import { ClientFacingHeader } from "@/components/dashboard/UnifiedHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner, LoadingState } from "@/components/ui/LoadingStates";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { PDFExportService } from "@/services/export/pdfExportService";

import { LeadQualityMetricsComponent } from '@/components/analytics/LeadQualityMetrics';
import { LeadQualityTable } from '@/components/analytics/LeadQualityTable';

import { LeadByDayChart } from '@/components/dashboard/LeadByDayChart';
import { useAvailableClients, useClientData, useDashboardData } from '@/hooks/useDashboardQueries';
import React, { lazy, Suspense, useCallback, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

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
  const [selectedPeriod, setSelectedPeriod] = useState("30d");
  const [activeTab, setActiveTab] = useState("summary");
  const [exportingPDF, setExportingPDF] = useState(false);

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
        onTabChange={setActiveTab}
      />

      {/* Main Content */}
      <div className="px-20 py-6">
        <div className="mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">

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

          {/* Lead Info Tab */}
          <TabsContent value="leads" className="mt-6">
            <Suspense fallback={<ComponentLoader />}>
              <LeadInfoMetricsCards data={dashboardData} />
            </Suspense>
            
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 mt-6">
              <Suspense fallback={<ComponentLoader />}>
                <EventTypeBreakdown data={dashboardData} />
              </Suspense>
              
              <Suspense fallback={<ComponentLoader />}>
                <LeadSourceBreakdown data={dashboardData} />
              </Suspense>
            </div>
            
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 mt-6">
              <Suspense fallback={<ComponentLoader />}>
                <GuestCountDistribution data={dashboardData} />
              </Suspense>
              
              <Suspense fallback={<ComponentLoader />}>
                <PreferredDayBreakdown data={dashboardData} />
              </Suspense>
            </div>
            
            <div className="mt-6">
              <Suspense fallback={<ComponentLoader />}>
                <LandingPagePerformance data={dashboardData} />
              </Suspense>
            </div>
          </TabsContent>

          {/* Lead Quality Tab */}
          <TabsContent value="leads" className="mt-6">
            <div className="space-y-6">
              <LeadQualityMetricsComponent metrics={{
                totalLeads: dashboardData?.totalLeads || 0,
                averageQualityScore: 7.5,
                conversionRate: 15.2,
                sourceBreakdown: [
                  { source: 'Meta Ads', count: 150, percentage: 45, avgQualityScore: 8.2, conversionRate: 18.5 },
                  { source: 'Google Ads', count: 120, percentage: 35, avgQualityScore: 7.8, conversionRate: 12.3 }
                ],
                statusBreakdown: [
                  { status: 'New', count: 80, percentage: 30 },
                  { status: 'Contacted', count: 60, percentage: 22 },
                  { status: 'Qualified', count: 40, percentage: 15 },
                  { status: 'Converted', count: 30, percentage: 11 }
                ],
                qualityScoreDistribution: [
                  { range: '8-10', count: 100, percentage: 37 },
                  { range: '6-7', count: 120, percentage: 44 },
                  { range: '4-5', count: 40, percentage: 15 },
                  { range: '1-3', count: 10, percentage: 4 }
                ],
                topPerformingSources: [
                  { source: 'Meta Ads', leads: 150, conversionRate: 18.5, avgBudget: 2500 },
                  { source: 'Google Ads', leads: 120, conversionRate: 12.3, avgBudget: 1800 }
                ],
                recentLeads: []
              }} />
              
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Lead Quality Analysis</h3>
                    <p className="text-sm text-gray-600">Detailed view of all leads with quality scoring and filtering</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm">Import Leads</Button>
                    <Button variant="secondary" size="sm">Export Report</Button>
                  </div>
                </div>
                
                <LeadQualityTable 
                  leads={[]} 
                  onLeadSelect={() => {}}
                />
              </Card>
            </div>
          </TabsContent>

        </Tabs>
        </div>
      </div>
    </div>
  );
};

export default EventDashboard;



