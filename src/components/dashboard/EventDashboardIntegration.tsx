// Example integration in EventDashboard.tsx
import { ClientFacingHeader, InternalAdminHeader } from '@/components/dashboard/UnifiedHeader';

// In your EventDashboard component, replace the existing header sections with:

return (
  <div className="bg-slate-100 min-h-screen">
    {/* Internal Admin Header - Only shown for internal users */}
    <InternalAdminHeader
      clientData={clientData}
      onBackToDashboard={() => window.location.href = '/'}
      onGoToAdmin={() => window.location.href = '/admin'}
      onExportPDF={handleExportPDF}
      onShare={handleShare}
      onSettings={handleSettings}
      exportingPDF={exportingPDF}
      isShared={isShared}
    />

    {/* Client-Facing Header - Always shown */}
    <ClientFacingHeader
      clientData={clientData}
      selectedPeriod={selectedPeriod}
      onPeriodChange={setSelectedPeriod}
    />

    {/* Rest of your dashboard content */}
    <div className="max-w-full mx-auto px-12 py-2">
      {/* Your existing tab content */}
    </div>
  </div>
);
