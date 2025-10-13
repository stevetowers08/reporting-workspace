import { Card } from '@/components/ui/card';
import { debugLogger } from '@/lib/debug';
import { Client } from '@/services/data/databaseService';
import { EventDashboardData } from '@/services/data/eventMetricsService';
import React, { useCallback, useMemo, useState } from 'react';
import { GHLReconnectPrompt } from './GHLReconnectPrompt';

interface LeadInfoMetricsCardsProps {
  data: EventDashboardData | null | undefined;
  clientData?: Client | null;
  dateRange?: { start: string; end: string };
}

export const LeadInfoMetricsCards: React.FC<LeadInfoMetricsCardsProps> = React.memo(({ data, clientData: _clientData, dateRange: _dateRange }) => {
  const [ghlNeedsReconnect, setGhlNeedsReconnect] = useState(false);

  const handleGHLReconnect = useCallback(() => {
    // Navigate to agency integrations page
    window.location.href = '/agency/integrations';
  }, []);

  // Extract lead data from the dashboard data (already fetched by useLeadsTabData)
  const leadData = useMemo(() => (data as any)?.leadData || null, [data]);
  
  // Use dashboard data if available, otherwise show loading
  const isLoading = useMemo(() => !data, [data]);

  // Use Google Sheets data for lead counts (PRIMARY SOURCE) - memoized
  const leadMetrics = useMemo(() => ({
    totalLeads: leadData?.totalLeads || 0,
    facebookLeads: leadData?.facebookLeads || 0,
    googleLeads: leadData?.googleLeads || 0
  }), [leadData]);
  
  // Use GoHighLevel data for contact count (REAL DATA) - memoized
  const ghlMetrics = useMemo(() => data?.ghlMetrics || null, [data?.ghlMetrics]);
  const totalContacts = useMemo(() => ghlMetrics?.totalContacts || 0, [ghlMetrics?.totalContacts]);
  
  // ✅ FIX: Check if GoHighLevel is actually connected (has valid OAuth) - memoized
  const ghlConnectionStatus = useMemo(() => {
    const isGHLConnected = data?.ghlMetrics !== null && data?.ghlMetrics !== undefined;
    const hasGHLData = isGHLConnected && totalContacts > 0;
    const shouldShowReconnectPrompt = data?.clientAccounts?.goHighLevel && 
      data.clientAccounts.goHighLevel !== 'none' && !isGHLConnected;
    
    return { isGHLConnected, hasGHLData, shouldShowReconnectPrompt };
  }, [data?.ghlMetrics, data?.clientAccounts?.goHighLevel, totalContacts]);
  
  debugLogger.debug('LeadInfoMetricsCards', 'GHL Reconnect Check', {
    isGHLConnected: ghlConnectionStatus.isGHLConnected,
    hasGHLData: ghlConnectionStatus.hasGHLData,
    shouldShowReconnectPrompt: ghlConnectionStatus.shouldShowReconnectPrompt,
    totalContacts,
    loading: isLoading,
    ghlAccount: data?.clientAccounts?.goHighLevel
  });
  
  // Remove fake funnel data - we don't have real page analytics

  if (isLoading) {
    return (
      <div className="mb-6 grid gap-4 grid-cols-1 md:grid-cols-1">
        <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
          <div className="animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-slate-200 rounded w-1/2"></div>
          </div>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mb-6 grid gap-4 grid-cols-1 md:grid-cols-4">
        <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
          <div className="text-center text-slate-500">Failed to load dashboard data</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mb-6 grid gap-4 grid-cols-1 md:grid-cols-1">
      {ghlConnectionStatus.shouldShowReconnectPrompt && (
        <GHLReconnectPrompt onReconnect={handleGHLReconnect} />
      )}
      <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600 mb-2">Total Contacts</p>
            {ghlConnectionStatus.isGHLConnected ? (
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-slate-900">
                  {totalContacts > 0 ? totalContacts.toLocaleString() : '—'}
                </p>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-blue-600 font-medium">GHL</span>
                  <span className="text-xs text-slate-500">(All Time)</span>
                </div>
              </div>
            ) : (
              <div className="flex items-baseline gap-2">
                <p className="text-lg font-medium text-slate-400">Not Connected</p>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-slate-400 font-medium">GHL</span>
                  <span className="text-xs text-slate-400">(Setup Required)</span>
                </div>
              </div>
            )}
            <div className="text-xs text-slate-400 mt-1">
              {ghlConnectionStatus.isGHLConnected ? 'API: POST /contacts/search' : 'GoHighLevel integration not configured'}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
});