import { AgencyHeader } from "@/components/dashboard/AgencyHeader";
import { ClientFacingHeader } from "@/components/dashboard/UnifiedHeader";
import { GoogleTabContent, LeadsTabContent, MetaTabContent, SummaryTabContent } from "@/components/dashboard/tabs";
import { PDFExportOptionsModal } from "@/components/export/PDFExportOptionsModal";
import { EnhancedPageLoader, useLoading } from "@/components/ui/EnhancedLoadingSystem";
import { Button } from "@/components/ui/button-simple";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs-simple";
import { useQueryClient } from '@tanstack/react-query';

import { useAvailableClients, useClientData } from '@/hooks/useDashboardQueries';
import { simpleClientPDFService } from '@/services/export/simpleClientPDFService';
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";

interface EventDashboardProps {
  isShared?: boolean;
  clientId?: string;
}

// Global type declarations
declare global {
  interface ErrorEvent extends Event {
    error: Error;
    message: string;
    filename?: string;
    lineno?: number;
    colno?: number;
  }
  interface PromiseRejectionEvent extends Event {
    promise: Promise<any>;
    reason: Error;
  }
  interface Window {
    alert: (message: string) => void;
  }
  interface HTMLElement extends Element {
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
  const [showExportModal, setShowExportModal] = useState(false);
  
  // Enhanced loading states
  const { startLoading: _startLoading, stopLoading: _stopLoading, isLoading: _isDashboardLoading } = useLoading('dashboard');
  
  // Refs for each tab content
  const summaryTabRef = useRef<HTMLDivElement>(null);
  const metaTabRef = useRef<HTMLDivElement>(null);
  const googleTabRef = useRef<HTMLDivElement>(null);
  const leadsTabRef = useRef<HTMLDivElement>(null);
  
  // PDF export hook
  
  // Get active tab from URL params, default to "summary"
  const activeTab = searchParams.get('tab') || "summary";
  
  // Check if this is a shared view (no agency header)
  const isSharedView = searchParams.get('shared') === 'true';
  
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
        // OPTIMIZED: Include period for API preset optimization
        startDate.setDate(endDate.getDate() - 30);
        return {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0],
          period: '30d'
        };
      case 'lastMonth':
        // For lastMonth, let the API handle it with date_preset
        return {
          start: '',
          end: '',
          period: 'lastMonth'
        };
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '3m':
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case '1y':
        startDate.setDate(endDate.getDate() - 365);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }
    
    return {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0],
      period: period // Include period for API preset handling
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

  // Memoize date range to ensure React Query detects changes
  const dateRange = useMemo(() => getDateRange(selectedPeriod), [selectedPeriod, getDateRange]);
  
  const queryClient = useQueryClient();

  // Invalidate cache when date range changes
  useEffect(() => {
    if (actualClientId) {
      queryClient.invalidateQueries({
        queryKey: ['dashboard-data', actualClientId],
      });
      queryClient.invalidateQueries({
        queryKey: ['summary-tab-data', actualClientId],
      });
      queryClient.invalidateQueries({
        queryKey: ['meta-tab-data', actualClientId],
      });
      queryClient.invalidateQueries({
        queryKey: ['google-tab-data', actualClientId],
      });
      queryClient.invalidateQueries({
        queryKey: ['leads-tab-data', actualClientId],
      });
    }
  }, [dateRange, actualClientId, queryClient]);

  // ✅ FIX: Declare clientData BEFORE using it in callbacks to prevent TDZ
  const { data: clientData, isLoading: clientLoading, error: clientError } = useClientData(actualClientId);
  const { data: availableClients, isLoading: clientsLoading, error: clientsError } = useAvailableClients();

  // Handle PDF export with enhanced options
  const handleExportPDF = useCallback(() => {
    if (!clientData) {
      alert('Client data not available for export');
      return;
    }
    setShowExportModal(true);
  }, [clientData]);

  const handleExportWithOptions = useCallback(async (options: any) => {
    if (!clientData) {
      alert('Client data not available for export');
      return;
    }

    setExportingPDF(true);
    setShowExportModal(false);
    
    try {
      // Simple Puppeteer-based export
      await simpleClientPDFService.exportWithProgress({
        clientId: clientData.id,
        clientName: clientData.name,
        tabs: [
          { id: 'summary', name: 'Summary', url: `${window.location.origin}/dashboard/${clientData.id}?tab=summary&shared=true` },
          { id: 'meta', name: 'Meta', url: `${window.location.origin}/dashboard/${clientData.id}?tab=meta&shared=true` },
          { id: 'google', name: 'Google', url: `${window.location.origin}/dashboard/${clientData.id}?tab=google&shared=true` },
          { id: 'leads', name: 'Leads', url: `${window.location.origin}/dashboard/${clientData.id}?tab=leads&shared=true` }
        ],
        dateRange: dateRange,
        quality: options.quality || 'email'
      });
      
    } catch (err) {
      console.error('PDF export failed:', err);
      
      // User-friendly error messages
      let errorMessage = 'Failed to export PDF. Please try again.';
      
      if (err instanceof Error) {
        if (err.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (err.message.includes('timeout')) {
          errorMessage = 'Export timed out. Please try again with fewer tabs.';
        } else {
          errorMessage = `Export failed: ${err.message}`;
        }
      }
      
      alert(errorMessage);
    } finally {
      setExportingPDF(false);
    }
  }, [clientData, selectedPeriod, getDateRange]);
  
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
  if (clientLoading) {
    return <EnhancedPageLoader 
      message="Loading Analytics Dashboard..." 
      showProgress={true}
      progress={clientLoading ? 30 : 100}
    />;
  }

  // Show error state
  if (clientError) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            {clientError?.message || 'Failed to load dashboard'}
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
      {!isShared && !isSharedView && (
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
          <TabsContent value="summary" className="mt-6" ref={summaryTabRef}>
            <SummaryTabContent
              clientId={actualClientId}
              dateRange={dateRange}
              clientData={clientData}
            />
          </TabsContent>

          {/* Meta Ads Tab */}
          <TabsContent value="meta" className="mt-6" ref={metaTabRef}>
            <MetaTabContent
              clientId={actualClientId}
              dateRange={dateRange}
              clientData={clientData}
            />
          </TabsContent>

          {/* Google Ads Tab */}
          <TabsContent value="google" className="mt-6" ref={googleTabRef}>
            <GoogleTabContent
              clientId={actualClientId}
              dateRange={dateRange}
              clientData={clientData}
            />
          </TabsContent>

          {/* Lead Info Tab - Venue-Focused Analytics */}
          <TabsContent value="leads" className="mt-6" ref={leadsTabRef}>
            <LeadsTabContent
              clientId={actualClientId}
              dateRange={dateRange}
              clientData={clientData}
            />
          </TabsContent>

        </Tabs>
        </div>
      </div>
      
      {/* PDF Export Options Modal */}
      <PDFExportOptionsModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExportWithOptions}
        clientName={clientData?.name || ''}
        dateRange={dateRange}
        availableTabs={['summary', 'meta', 'google', 'leads']}
        isExporting={exportingPDF}
      />
    </div>
    </LazyComponentErrorBoundary>
  );
};

export default EventDashboard;



