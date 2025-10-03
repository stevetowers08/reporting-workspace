import DebugPanel from "@/components/DebugPanel";
import { debugLogger } from "@/lib/debug";
import AdAccountsOverview from "@/pages/AdAccountsOverview";
import AdminPanel from "@/pages/AdminPanel";
import ErrorBoundary from "@/pages/ErrorBoundary";
import EventDashboard from "@/pages/EventDashboard";
import FacebookAdsPage from "@/pages/FacebookAdsPage";
import Fallback from "@/pages/Fallback";
import GoogleAdsPage from "@/pages/GoogleAdsPage";
import IntegrationSetup from "@/pages/IntegrationSetup";
import OAuthCallback from "@/pages/OAuthCallback";
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
    <ErrorBoundary>
      <BrowserRouter>
        <div className="page-bg-light">
          <Routes>
            <Route path="/" element={<EventDashboard />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/admin/integrations" element={<IntegrationSetup />} />
            <Route path="/ad-accounts" element={<AdAccountsOverview />} />
            <Route path="/facebook-ads" element={<FacebookAdsPage />} />
            <Route path="/google-ads" element={<GoogleAdsPage />} />
            <Route path="/oauth/callback" element={<OAuthCallback />} />
            <Route path="/share/:clientId" element={<EventDashboard isShared={true} />} />
            {/* Fallback for unknown routes */}
            <Route path="*" element={<Fallback />} />
          </Routes>

          {/* Debug Panel */}
          <DebugPanel
            isOpen={showDebugPanel}
            onClose={() => setShowDebugPanel(false)}
          />
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
