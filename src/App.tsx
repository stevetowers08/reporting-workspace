import DebugPanel from "@/components/DebugPanel";
import { PageErrorBoundary } from "@/components/error/EnhancedErrorBoundary";
import { ErrorNotificationContainer } from "@/components/error/ErrorNotification";
import { LoadingProvider as EnhancedLoadingProvider, GlobalLoadingIndicator } from "@/components/ui/EnhancedLoadingSystem";
import { ErrorProvider } from "@/contexts/ErrorContext";
import { LoadingProvider } from "@/contexts/LoadingContext";
import { NetworkStatusIndicator } from "@/hooks/useNetworkStatus";
import { debugLogger } from "@/lib/debug";
import { queryClient } from "@/lib/queryClient";
// Sentry will be loaded lazily to prevent SES conflicts with React
import APITestingPage from "@/pages/APITestingPage";
import AdAccountsOverview from "@/pages/AdAccountsOverview";
import AgencyPanel from "@/pages/AdminPanel";
import ClientEditPage from "@/pages/ClientEditPage";
// ✅ FIX: Lazy load EventDashboard to prevent TDZ issues
import { DashboardSkeleton } from "@/components/ui/UnifiedLoadingSystem";
import FacebookAdsPage from "@/pages/FacebookAdsPage";
import FacebookAdsReporting from "@/pages/FacebookAdsReporting";
import Fallback from "@/pages/Fallback";
import { GHLCallbackPage } from "@/pages/GHLCallbackPage";
import GoogleAdsConfigPage from "@/pages/GoogleAdsConfigPage";
import GoogleAdsPage from "@/pages/GoogleAdsPage";
import HomePageWrapper from "@/pages/HomePageWrapper";
import OAuthCallback from "@/pages/OAuthCallback";
import { HealthCheck } from "@/pages/health";
import { TokenRefreshService } from "@/services/auth/TokenRefreshService";
import { QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy, useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

// V2 Components - New Architecture
import { V2Navigation } from "@/components/dashboard/V2Navigation";
import { GoogleTabContentV2Wrapper, LeadsTabContentV2Wrapper, MetaTabContentV2Wrapper, SummaryTabContentV2Wrapper } from "@/components/dashboard/tabs/V2RouteWrappers";

// ✅ FIX: Lazy load EventDashboard to prevent TDZ issues
const EventDashboard = lazy(() => 
  import("@/pages/EventDashboard")
    .then(module => ({ default: module.default }))
    .catch(_error => {
      return { default: () => <div>Failed to load dashboard</div> };
    })
);

// Health Check Page Component
const HealthCheckPage = () => {
  const [healthStatus, setHealthStatus] = useState<{
    status: string;
    error?: string;
    timestamp: string;
    services: Record<string, unknown>;
    metrics?: {
      responseTime: number;
      memoryUsage: number;
      uptime: number;
    };
    version?: string;
    environment?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        // Add timeout to prevent infinite loading
        const timeoutPromise = new Promise((_, reject) => 
          globalThis.setTimeout(() => reject(new Error('Health check timeout')), 5000)
        );
        
        const statusPromise = HealthCheck();
        const status = await Promise.race([statusPromise, timeoutPromise]) as {
          status: string;
          error?: string;
          timestamp: string;
          services: Record<string, unknown>;
          metrics?: {
            responseTime: number;
            memoryUsage: number;
            uptime: number;
          };
          version?: string;
          environment?: string;
        };
        setHealthStatus(status);
      } catch (error) {
        debugLogger.error('App', 'Health check failed', error);
        setHealthStatus({ 
          status: 'degraded', 
          error: 'Health check failed',
          timestamp: new Date().toISOString(),
          services: {
            database: 'error',
            integrations: 'error', 
            cache: 'error',
            authentication: 'error'
          }
        });
      } finally {
        setLoading(false);
      }
    };

    checkHealth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking system health...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">System Health Check</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Status Overview */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800">Status Overview</h2>
              <div className={`p-4 rounded-lg ${
                healthStatus?.status === 'healthy' ? 'bg-green-100 text-green-800' :
                healthStatus?.status === 'degraded' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-3 ${
                    healthStatus?.status === 'healthy' ? 'bg-green-500' :
                    healthStatus?.status === 'degraded' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}></div>
                  <span className="font-medium capitalize">{healthStatus?.status || 'Unknown'}</span>
                </div>
                <p className="text-sm mt-2">
                  Last checked: {healthStatus?.timestamp ? new Date(healthStatus.timestamp).toLocaleString() : 'Unknown'}
                </p>
              </div>
            </div>

            {/* Services Status */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-800">Services</h2>
              <div className="space-y-2">
                {healthStatus?.services && Object.entries(healthStatus.services).map(([service, status]) => (
                  <div key={service} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="capitalize">{service.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      status === 'connected' || status === 'operational' || status === 'optimal' ? 'bg-green-100 text-green-800' :
                      status === 'degraded' || status === 'disconnected' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {String(status)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Metrics */}
          {healthStatus?.metrics && (
            <div className="mt-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Performance Metrics</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-700">Response Time</h3>
                  <p className="text-2xl font-bold text-blue-600">{healthStatus.metrics.responseTime}ms</p>
                </div>
                {healthStatus.metrics.memoryUsage && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-700">Memory Usage</h3>
                    <p className="text-2xl font-bold text-green-600">{healthStatus.metrics.memoryUsage}MB</p>
                  </div>
                )}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-700">Uptime</h3>
                  <p className="text-2xl font-bold text-purple-600">{Math.round(healthStatus.metrics.uptime)}s</p>
                </div>
              </div>
            </div>
          )}

          {/* Version Info */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Version: {healthStatus?.version || 'Unknown'}</span>
              <span>Environment: {healthStatus?.environment || 'Unknown'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  useEffect(() => {
    // Initialize production monitoring - load Sentry lazily to prevent SES conflicts
    const loadSentry = async () => {
      try {
        const { initSentry } = await import("@/lib/sentry");
        initSentry();
      } catch (error) {
        debugLogger.error('App', 'Failed to load Sentry', error);
      }
    };
    
    // Load Sentry after React is fully initialized
    setTimeout(loadSentry, 0);
    
    // Start automatic token refresh service
    TokenRefreshService.start();
    
    debugLogger.info('App', 'Application started');

    // Add keyboard shortcut for debug panel (Ctrl+Shift+D)
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setShowDebugPanel(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    // Cleanup function
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      TokenRefreshService.stop();
    };
  }, []);

  return (
    <PageErrorBoundary>
      <ErrorProvider>
        <LoadingProvider>
          <EnhancedLoadingProvider>
            <QueryClientProvider client={queryClient}>
              <BrowserRouter>
              <div className="app-shell">
                <Routes>
                  <Route path="/" element={<HomePageWrapper />} />
                  <Route path="/dashboard/:clientId" element={
                    <Suspense fallback={<DashboardSkeleton />}>
                      <EventDashboard />
                    </Suspense>
                  } />
                  
                  {/* V2 Routes - New Architecture Testing */}
                  <Route path="/dashboard/v2/:clientId" element={<V2Navigation />} />
                  <Route path="/dashboard/v2/summary/:clientId" element={<SummaryTabContentV2Wrapper />} />
                  <Route path="/dashboard/v2/meta/:clientId" element={<MetaTabContentV2Wrapper />} />
                  <Route path="/dashboard/v2/google/:clientId" element={<GoogleTabContentV2Wrapper />} />
                  <Route path="/dashboard/v2/leads/:clientId" element={<LeadsTabContentV2Wrapper />} />
                  <Route path="/agency" element={<AgencyPanel />} />
                  <Route path="/agency/clients" element={<AgencyPanel />} />
                  <Route path="/agency/integrations" element={<AgencyPanel />} />
                  <Route path="/agency/ai-insights" element={<AgencyPanel />} />
                  <Route path="/agency/clients/:clientId/edit" element={<ClientEditPage />} />
                  <Route path="/agency/google-ads-config" element={<GoogleAdsConfigPage />} />
                  <Route path="/ad-accounts" element={<AdAccountsOverview />} />
                  <Route path="/facebook-ads" element={<FacebookAdsPage />} />
                  <Route path="/facebook-ads-reporting" element={<FacebookAdsReporting />} />
                  <Route path="/google-ads" element={<GoogleAdsPage />} />
                  <Route path="/api-testing" element={<APITestingPage />} />
                  <Route path="/oauth/callback" element={<OAuthCallback />} />
                  <Route path="/api/leadconnector/oath" element={<GHLCallbackPage />} />
                  <Route path="/leadconnector/oath" element={<GHLCallbackPage />} />
                  <Route path="/share/:clientId" element={
                    <Suspense fallback={<DashboardSkeleton />}>
                      <EventDashboard isShared={true} />
                    </Suspense>
                  } />
                  <Route path="/health" element={<HealthCheckPage />} />
                  {/* Fallback for unknown routes */}
                  <Route path="*" element={<Fallback />} />
                </Routes>

                {/* Error Notifications */}
                <ErrorNotificationContainer />

                {/* Network Status Indicator */}
                <NetworkStatusIndicator />

                {/* Global Loading Indicator */}
                <GlobalLoadingIndicator />

                {/* Debug Panel */}
                <DebugPanel
                  isOpen={showDebugPanel}
                  onClose={() => setShowDebugPanel(false)}
                />
              </div>
            </BrowserRouter>
          </QueryClientProvider>
          </EnhancedLoadingProvider>
        </LoadingProvider>
      </ErrorProvider>
    </PageErrorBoundary>
  );
};

export default App;
