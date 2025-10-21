// Leads Tab Content Component
import { AppErrorBoundary } from "@/components/error/AppErrorBoundary";
import { ComponentLoader } from "@/components/ui/ComponentLoader";
import { LoadingOverlay } from "@/components/ui/EnhancedLoadingSystem";
import { Client } from '@/services/data/databaseService';
import { EventDashboardData } from '@/services/data/eventMetricsService';
import React, { Suspense, lazy } from "react";

// Lazy load components
const LeadInfoMetricsCards = lazy(() => 
  import('@/components/dashboard/LeadInfoMetricsCards')
    .then(module => ({ default: module.LeadInfoMetricsCards }))
    .catch(() => ({ 
      default: React.memo(() => <div>Failed to load component</div>) 
    }))
);

const EventTypesBreakdown = lazy(() => 
  import('@/components/dashboard/EventTypesBreakdown')
    .then(module => ({ default: module.EventTypesBreakdown }))
    .catch(() => ({ 
      default: React.memo(() => <div>Failed to load component</div>) 
    }))
);

const GuestCountDistribution = lazy(() => 
  import('@/components/dashboard/GuestCountDistribution')
    .then(module => ({ default: module.GuestCountDistribution }))
    .catch(() => ({ 
      default: React.memo(() => <div>Failed to load component</div>) 
    }))
);

interface LeadsTabContentProps {
  leadsLoading: boolean;
  dashboardData?: EventDashboardData;
  clientData?: Client | null;
  dateRange: { start: string; end: string };
  leadsTabRef: React.RefObject<HTMLDivElement>;
}

export const LeadsTabContent: React.FC<LeadsTabContentProps> = ({
  leadsLoading,
  dashboardData,
  clientData,
  dateRange,
  leadsTabRef
}) => {
  return (
    <div ref={leadsTabRef}>
      <LoadingOverlay isLoading={leadsLoading} message="Loading leads data...">
        
        {/* Lead Info Metrics Cards - Google Sheets Data */}
        <Suspense fallback={<ComponentLoader />}>
          <AppErrorBoundary>
            <LeadInfoMetricsCards 
              data={dashboardData} 
              clientData={clientData}
              dateRange={dateRange}
            />
          </AppErrorBoundary>
        </Suspense>
        
        {/* Event Types and Guest Count Charts Only */}
        <div className="mt-6">
          <Suspense fallback={<ComponentLoader />}>
            <AppErrorBoundary>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Event Types Chart */}
                <div className="min-h-[300px]">
                  <EventTypesBreakdown 
                    data={dashboardData}
                    dateRange={dateRange}
                  />
                </div>
                
                {/* Guest Count Distribution Chart */}
                <div className="min-h-[300px]">
                  <GuestCountDistribution 
                    data={dashboardData}
                  />
                </div>
              </div>
            </AppErrorBoundary>
          </Suspense>
        </div>
        
      </LoadingOverlay>
    </div>
  );
};
