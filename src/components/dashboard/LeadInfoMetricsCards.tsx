import { Card } from '@/components/ui/card';
import { debugLogger } from '@/lib/debug';
import { Client } from '@/services/data/databaseService';
import { EventDashboardData } from '@/services/data/eventMetricsService';
import { LeadData, LeadDataService } from '@/services/data/leadDataService';
import React, { useEffect, useState } from 'react';
import { GHLReconnectPrompt } from './GHLReconnectPrompt';

interface LeadInfoMetricsCardsProps {
  data: EventDashboardData | null | undefined;
  clientData?: Client | null;
  dateRange?: { start: string; end: string };
}

export const LeadInfoMetricsCards: React.FC<LeadInfoMetricsCardsProps> = ({ data, clientData, dateRange }) => {
  const [leadData, setLeadData] = useState<LeadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [ghlNeedsReconnect, setGhlNeedsReconnect] = useState(false);

  const handleGHLReconnect = () => {
    // Navigate to agency integrations page
    window.location.href = '/agency/integrations';
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        debugLogger.info('LeadInfoMetricsCards', 'Starting to fetch lead data', { clientData });
        
        // Use client-specific Google Sheets configuration if available
        let leadDataResult;
        if (clientData?.accounts?.googleSheetsConfig) {
          debugLogger.info('LeadInfoMetricsCards', 'Using client-specific Google Sheets config', clientData.accounts.googleSheetsConfig);
          leadDataResult = await LeadDataService.fetchLeadData(
            clientData.accounts.googleSheetsConfig.spreadsheetId,
            clientData.accounts.googleSheetsConfig.sheetName
          );
        } else {
          debugLogger.info('LeadInfoMetricsCards', 'Using default Google Sheets config');
          leadDataResult = await LeadDataService.fetchLeadData();
        }
        
        debugLogger.info('LeadInfoMetricsCards', 'Received lead data', leadDataResult);
        setLeadData(leadDataResult);
      } catch (error) {
        debugLogger.error('LeadInfoMetricsCards', 'Failed to fetch lead data', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [clientData]);

  // Use dashboard data if available, otherwise show loading
  const isLoading = loading || !data;

  const handleTestAPI = async () => {
    debugLogger.info('LeadInfoMetricsCards', 'Testing Google Sheets API');
    try {
      let result;
      if (clientData?.accounts?.googleSheetsConfig) {
        debugLogger.info('LeadInfoMetricsCards', 'Testing with client-specific config', clientData.accounts.googleSheetsConfig);
        result = await LeadDataService.fetchLeadData(
          clientData.accounts.googleSheetsConfig.spreadsheetId,
          clientData.accounts.googleSheetsConfig.sheetName
        );
      } else {
        debugLogger.info('LeadInfoMetricsCards', 'Testing with default config');
        result = await LeadDataService.fetchLeadData();
      }
      
      debugLogger.info('LeadInfoMetricsCards', 'API Test Result', result);
      if (result) {
        alert(`API Test Success! Found ${result.totalLeads} leads via Supabase Edge Function`);
      } else {
        alert('API Test Failed: No data returned');
      }
    } catch (error) {
      debugLogger.error('LeadInfoMetricsCards', 'API Test Error', error);
      alert(`API Test Error: ${error}`);
    }
  };

  if (isLoading) {
    return (
      <div className="mb-6 grid gap-4 grid-cols-1 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-white border border-slate-200 shadow-sm p-5 h-24">
            <div className="animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-slate-200 rounded w-1/2"></div>
            </div>
          </Card>
        ))}
        <div className="col-span-4 flex justify-center mt-4">
          <button 
            onClick={handleTestAPI}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Test Supabase Edge Function
          </button>
        </div>
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

  // Use Google Sheets data for lead counts (PRIMARY SOURCE)
  const totalLeads = leadData?.totalLeads || 0;
  const facebookLeads = leadData?.facebookLeads || 0;
  const googleLeads = leadData?.googleLeads || 0;
  
  // Use GoHighLevel data for contact count (REAL DATA)
  const ghlMetrics = data.ghlMetrics || {};
  const totalContacts = ghlMetrics.totalContacts || 0; // GHL contact count (REAL)
  
  // ✅ FIX: Check if GoHighLevel is actually connected (has valid OAuth)
  const isGHLConnected = data.ghlMetrics !== null && data.ghlMetrics !== undefined;
  const hasGHLData = isGHLConnected && totalContacts > 0;
  const shouldShowReconnectPrompt = data.clientAccounts?.goHighLevel && data.clientAccounts.goHighLevel !== 'none' && !isGHLConnected;
  
  debugLogger.debug('LeadInfoMetricsCards', 'GHL Reconnect Check', {
    isGHLConnected,
    hasGHLData,
    shouldShowReconnectPrompt,
    totalContacts,
    loading,
    ghlAccount: data.clientAccounts?.goHighLevel
  });
  
  // Remove fake funnel data - we don't have real page analytics

  return (
    <div className="mb-6 grid gap-4 grid-cols-1 md:grid-cols-1">
      {shouldShowReconnectPrompt && (
        <GHLReconnectPrompt onReconnect={handleGHLReconnect} />
      )}
      <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600 mb-2">Total Contacts</p>
            {isGHLConnected ? (
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-slate-900">{totalContacts.toLocaleString()}</p>
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
              {isGHLConnected ? 'API: POST /contacts/search' : 'GoHighLevel integration not configured'}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};