// Leads Tab Content Component
import { AppErrorBoundary } from "@/components/error/AppErrorBoundary";
import { ComponentLoader } from "@/components/ui/ComponentLoader";
import { LoadingOverlay } from "@/components/ui/EnhancedLoadingSystem";
import { useLeadsTabData } from '@/hooks/useTabSpecificData';
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
  clientId: string;
  dateRange: { start: string; end: string };
  clientData?: any;
}

export const LeadsTabContent: React.FC<LeadsTabContentProps> = React.memo(({
  clientId,
  dateRange,
  clientData
}) => {
  const { data, isLoading, error } = useLeadsTabData(clientId, dateRange, clientData);

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">
          <h3 className="text-lg font-semibold mb-2">Error Loading Leads Data</h3>
          <p>{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <LoadingOverlay isLoading={isLoading} message="Loading leads data...">
        
        {/* Lead Info Metrics Cards - Google Sheets Data */}
        <Suspense fallback={<ComponentLoader />}>
          <AppErrorBoundary>
            <LeadInfoMetricsCards 
              data={data} 
              clientData={data?.clientData}
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
                <div className="h-full min-h-[400px]">
                  <EventTypesBreakdown 
                    data={data}
                    dateRange={dateRange}
                  />
                </div>
                
                {/* Guest Count Distribution Chart */}
                <div className="h-full min-h-[400px]">
                  <GuestCountDistribution 
                    data={data}
                  />
                </div>
              </div>
            </AppErrorBoundary>
          </Suspense>
        </div>
        
      </LoadingOverlay>
    </div>
  );
});