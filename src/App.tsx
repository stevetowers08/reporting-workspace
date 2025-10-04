import DebugPanel from "@/components/DebugPanel";
import { AppErrorBoundary } from "@/components/error/AppErrorBoundary";
import { ErrorNotificationContainer } from "@/components/error/ErrorNotification";
import { ErrorProvider } from "@/contexts/ErrorContext";
import { NetworkStatusIndicator } from "@/hooks/useNetworkStatus";
import { debugLogger } from "@/lib/debug";
import { queryClient } from "@/lib/queryClient";
import AdAccountsOverview from "@/pages/AdAccountsOverview";
import AdminPanel from "@/pages/AdminPanel";
import EventDashboard from "@/pages/EventDashboard";
import FacebookAdsPage from "@/pages/FacebookAdsPage";
import Fallback from "@/pages/Fallback";
import GoogleAdsConfigPage from "@/pages/GoogleAdsConfigPage";
import GoogleAdsPage from "@/pages/GoogleAdsPage";
import HomePageWrapper from "@/pages/HomePageWrapper";
import OAuthCallback from "@/pages/OAuthCallback";
import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

const App = () => {
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  useEffect(() => {
    debugLogger.info('APP', 'Application started');

    // Add keyboard shortcut for debug panel (Ctrl+Shift+D)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setShowDebugPanel(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <AppErrorBoundary>
      <ErrorProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <div className="page-bg-light">
              <Routes>
                <Route path="/" element={<HomePageWrapper />} />
                <Route path="/dashboard/:clientId" element={<EventDashboard />} />
                <Route path="/admin" element={<AdminPanel />} />
                <Route path="/admin/google-ads-config" element={<GoogleAdsConfigPage />} />
                <Route path="/ad-accounts" element={<AdAccountsOverview />} />
                <Route path="/facebook-ads" element={<FacebookAdsPage />} />
                <Route path="/google-ads" element={<GoogleAdsPage />} />
                <Route path="/oauth/callback" element={<OAuthCallback />} />
                <Route path="/share/:clientId" element={<EventDashboard isShared={true} />} />
                {/* Fallback for unknown routes */}
                <Route path="*" element={<Fallback />} />
              </Routes>

              {/* Error Notifications */}
              <ErrorNotificationContainer />

              {/* Network Status Indicator */}
              <NetworkStatusIndicator />

              {/* Debug Panel */}
              <DebugPanel
                isOpen={showDebugPanel}
                onClose={() => setShowDebugPanel(false)}
              />
            </div>
          </BrowserRouter>
        </QueryClientProvider>
      </ErrorProvider>
    </AppErrorBoundary>
  );
};

export default App;
