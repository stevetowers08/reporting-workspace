import { DataSkeleton } from '@/components/ui/UnifiedLoadingSystem';
import { Card } from '@/components/ui/card';
import { debugLogger } from '@/lib/debug';
import { Client } from '@/services/data/databaseService';
import { EventDashboardData } from '@/services/data/eventMetricsService';
import React, { useMemo } from 'react';

interface LeadInfoMetricsCardsProps {
  data: EventDashboardData | null | undefined;
  clientData?: Client | null;
  dateRange?: { start: string; end: string };
}

export const LeadInfoMetricsCards: React.FC<LeadInfoMetricsCardsProps> = React.memo(({ data, clientData: _clientData, dateRange: _dateRange }) => {

  // Extract lead data from the dashboard data (already fetched by useLeadsTabData)
  const leadData = useMemo(() => (data as any)?.leadData || null, [data]);
  
  // Use dashboard data if available, otherwise show loading
  const isLoading = useMemo(() => !data, [data]);

  // Use Google Sheets data for lead counts (PRIMARY SOURCE) - memoized
  const _leadMetrics = useMemo(() => ({
    totalLeads: leadData?.totalLeads || 0,
    facebookLeads: leadData?.facebookLeads || 0,
    googleLeads: leadData?.googleLeads || 0
  }), [leadData]);
  
  
  if (isLoading) {
    return (
      <div className="mb-6 grid gap-4 grid-cols-1 md:grid-cols-1">
        <DataSkeleton />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mb-6 grid gap-4 grid-cols-1 md:grid-cols-4">
        <Card className="bg-white border border-slate-200 p-5 h-24">
          <div className="text-center text-slate-500">Failed to load dashboard data</div>
        </Card>
      </div>
    );
  }

  return null;
});