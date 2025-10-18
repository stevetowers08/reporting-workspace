import { Card } from '@/components/ui/card';
import { debugLogger } from '@/lib/debug';
import { LeadData } from '@/services/data/leadDataService';
import React, { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface LeadQualityBySourceProps {
  data: {
    leadData?: LeadData;
    clientAccounts?: {
      googleSheets?: string;
      googleSheetsConfig?: { spreadsheetId: string; sheetName: string };
    };
  } | null | undefined;
  dateRange?: { start: string; end: string };
}

interface LeadQualityData {
  source: string;
  totalLeads: number;
  totalGuests: number;
  avgGuestsPerLead: number;
  eventTypes: { [key: string]: number };
  guestRanges: { [key: string]: number };
}

interface LeadQualityComparison {
  allTime: LeadQualityData[];
  lastMonth: LeadQualityData[];
}

export const LeadQualityBySource: React.FC<LeadQualityBySourceProps> = React.memo(({ data, dateRange: _dateRange }) => {
  const [leadQualityComparison, setLeadQualityComparison] = useState<LeadQualityComparison>({ allTime: [], lastMonth: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Color mapping for different sources
  const getSourceColor = (source: string) => {
    const colorMap: { [key: string]: string } = {
      'Facebook Ads': '#1877F2',
      'Google Ads': '#4285F4',
      'Website': '#10B981',
      'Referral': '#8B5CF6',
      'Instagram': '#E4405F',
      'Other': '#6B7280'
    };
    return colorMap[source] || '#6B7280';
  };

  // Process LeadData to get lead quality metrics by source
  const processLeadQualityDataFromLeadData = async (leadData: LeadData) => {
    if (!leadData || !leadData.leadSources || leadData.leadSources.length === 0) {
      return [];
    }

    // Calculate total leads and guests for proper averaging
    const totalLeads = leadData.totalLeads;
    const totalGuests = leadData.totalGuests;

    // Convert LeadData leadSources to LeadQualityData format
    return leadData.leadSources.map(source => {
      // Calculate average guests per lead for this specific source
      // We'll use the overall average as an approximation since we don't have source-specific guest data
      const avgGuestsPerLead = leadData.averageGuestsPerLead;
      
      return {
        source: source.type,
        totalLeads: source.count,
        totalGuests: Math.round(source.count * avgGuestsPerLead),
        avgGuestsPerLead: avgGuestsPerLead,
        eventTypes: {},
        guestRanges: {}
      };
    });
  };

  // Process raw data for a specific date range
  const processLeadQualityDataForDateRange = async (rawData: any, startDate: string, endDate: string) => {
    if (!rawData?.values || rawData.values.length < 2) {
      return [];
    }

    const headers = rawData.values[0];
    const rows = rawData.values.slice(1);
    
    // Find column indices
    const sourceIndex = headers.findIndex((h: string) => h.toLowerCase().includes('source'));
    const eventTypeIndex = headers.findIndex((h: string) => h.toLowerCase().includes('type'));
    const guestCountIndex = headers.findIndex((h: string) => h.toLowerCase().includes('guest'));
    const dateIndex = headers.findIndex((h: string) => h.toLowerCase().includes('date'));
    
    if (sourceIndex === -1) {
      debugLogger.warn('LeadQualityBySource', 'No source column found');
      return [];
    }

    const sourceData: { [key: string]: LeadQualityData } = {};

    rows.forEach((row: string[]) => {
      // Check if row is within date range
      if (dateIndex >= 0) {
        const rowDate = row[dateIndex];
        if (rowDate) {
          const date = new Date(rowDate);
          const start = new Date(startDate);
          const end = new Date(endDate);
          
          if (date < start || date > end) {
            return; // Skip rows outside date range
          }
        }
      }

      const source = row[sourceIndex]?.trim() || 'Unknown';
      const eventType = eventTypeIndex >= 0 ? row[eventTypeIndex]?.trim() || 'Unknown' : 'Unknown';
      const guestCountRaw = guestCountIndex >= 0 ? row[guestCountIndex] || '0' : '0';
      const guestCount = parseInt(guestCountRaw) || 0;

      if (!sourceData[source]) {
        sourceData[source] = {
          source,
          totalLeads: 0,
          totalGuests: 0,
          avgGuestsPerLead: 0,
          eventTypes: {},
          guestRanges: {}
        };
      }

      sourceData[source].totalLeads++;
      sourceData[source].totalGuests += guestCount;
      
      // Track event types
      sourceData[source].eventTypes[eventType] = (sourceData[source].eventTypes[eventType] || 0) + 1;
      
      // Track guest ranges
      let guestRange = 'Unknown';
      if (guestCount > 0) {
        if (guestCount <= 50) guestRange = '1-50';
        else if (guestCount <= 100) guestRange = '51-100';
        else if (guestCount <= 200) guestRange = '101-200';
        else if (guestCount <= 300) guestRange = '201-300';
        else guestRange = '300+';
      }
      sourceData[source].guestRanges[guestRange] = (sourceData[source].guestRanges[guestRange] || 0) + 1;
    });

    // Calculate averages and convert to array
    return Object.values(sourceData).map(data => ({
      ...data,
      avgGuestsPerLead: data.totalLeads > 0 ? data.totalGuests / data.totalLeads : 0
    }));
  };

  // Process raw data to get lead quality metrics by source
  const processLeadQualityData = async (rawData: any) => {
    if (!rawData?.values || rawData.values.length < 2) {
      return [];
    }

    const headers = rawData.values[0];
    const rows = rawData.values.slice(1);
    
    // Find column indices
    const sourceIndex = headers.findIndex((h: string) => h.toLowerCase().includes('source'));
    const eventTypeIndex = headers.findIndex((h: string) => h.toLowerCase().includes('type'));
    const guestCountIndex = headers.findIndex((h: string) => h.toLowerCase().includes('guest'));
    
    if (sourceIndex === -1) {
      debugLogger.warn('LeadQualityBySource', 'No source column found');
      return [];
    }

    const sourceData: { [key: string]: LeadQualityData } = {};

    rows.forEach((row: string[]) => {
      const source = row[sourceIndex]?.trim() || 'Unknown';
      const eventType = eventTypeIndex >= 0 ? row[eventTypeIndex]?.trim() || 'Unknown' : 'Unknown';
      const guestCountRaw = guestCountIndex >= 0 ? row[guestCountIndex] || '0' : '0';
      const guestCount = parseInt(guestCountRaw) || 0;

      if (!sourceData[source]) {
        sourceData[source] = {
          source,
          totalLeads: 0,
          totalGuests: 0,
          avgGuestsPerLead: 0,
          eventTypes: {},
          guestRanges: {}
        };
      }

      sourceData[source].totalLeads++;
      sourceData[source].totalGuests += guestCount;
      
      // Track event types
      sourceData[source].eventTypes[eventType] = (sourceData[source].eventTypes[eventType] || 0) + 1;
      
      // Track guest ranges
      let guestRange = 'Unknown';
      if (guestCount > 0) {
        if (guestCount <= 50) guestRange = '1-50';
        else if (guestCount <= 100) guestRange = '51-100';
        else if (guestCount <= 200) guestRange = '101-200';
        else if (guestCount <= 300) guestRange = '201-300';
        else guestRange = '300+';
      }
      sourceData[source].guestRanges[guestRange] = (sourceData[source].guestRanges[guestRange] || 0) + 1;
    });

    // Calculate averages and convert to array
    return Object.values(sourceData).map(data => ({
      ...data,
      avgGuestsPerLead: data.totalLeads > 0 ? data.totalGuests / data.totalLeads : 0
    }));
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        debugLogger.debug('LeadQualityBySource', 'Starting to fetch lead quality comparison data');
        
        // Use client-specific Google Sheets configuration if available
        let spreadsheetId: string;
        let sheetName: string;
        
        if (data?.clientAccounts?.googleSheetsConfig) {
          debugLogger.debug('LeadQualityBySource', 'Using client-specific Google Sheets config', data.clientAccounts.googleSheetsConfig);
          spreadsheetId = data.clientAccounts.googleSheetsConfig.spreadsheetId;
          sheetName = data.clientAccounts.googleSheetsConfig.sheetName;
        } else if (data?.clientAccounts?.googleSheets) {
          debugLogger.debug('LeadQualityBySource', 'Using client-specific Google Sheets config (legacy)', data.clientAccounts.googleSheets);
          spreadsheetId = data.clientAccounts.googleSheets;
          sheetName = 'Event Leads';
        } else {
          throw new Error('No Google Sheets configuration available');
        }
        
        // Fetch raw data from Google Sheets to get source-specific guest counts
        const { GoogleSheetsService } = await import('@/services/api/googleSheetsService');
        
        // Get all-time data
        const allTimeRawData = await GoogleSheetsService.getSpreadsheetData(spreadsheetId, sheetName);
        const allTimeData = allTimeRawData ? await processLeadQualityData(allTimeRawData) : [];
        
        // Calculate last month date range
        const endDate = new Date();
        const lastMonthStart = new Date(endDate.getFullYear(), endDate.getMonth() - 1, 1);
        const lastMonthEnd = new Date(endDate.getFullYear(), endDate.getMonth(), 0);
        
        // Get last month data (we'll need to filter this from the raw data)
        const lastMonthData = allTimeRawData ? await processLeadQualityDataForDateRange(
          allTimeRawData, 
          lastMonthStart.toISOString().split('T')[0],
          lastMonthEnd.toISOString().split('T')[0]
        ) : [];
        
        debugLogger.debug('LeadQualityBySource', 'Processed lead quality comparison data', { allTimeData, lastMonthData });
        setLeadQualityComparison({ allTime: allTimeData, lastMonth: lastMonthData });
      } catch (error) {
        debugLogger.error('LeadQualityBySource', 'Failed to fetch lead quality comparison data', error);
        setError('Failed to load lead quality comparison data');
        setLeadQualityComparison({ allTime: [], lastMonth: [] });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [data]);

  // Chart data for comparison between all-time and last month
  const chartData = useMemo(() => {
    const allTimeSources = leadQualityComparison.allTime;
    const lastMonthSources = leadQualityComparison.lastMonth;
    
    // Get all unique sources from both datasets
    const allSources = new Set([
      ...allTimeSources.map(s => s.source),
      ...lastMonthSources.map(s => s.source)
    ]);
    
    return Array.from(allSources).map(source => {
      const allTimeData = allTimeSources.find(s => s.source === source);
      const lastMonthData = lastMonthSources.find(s => s.source === source);
      
      return {
        source,
        allTime: allTimeData ? Math.round(allTimeData.avgGuestsPerLead) : 0,
        lastMonth: lastMonthData ? Math.round(lastMonthData.avgGuestsPerLead) : 0,
        allTimeLeads: allTimeData?.totalLeads || 0,
        lastMonthLeads: lastMonthData?.totalLeads || 0,
        color: getSourceColor(source)
      };
    }).filter(item => item.allTimeLeads > 0 || item.lastMonthLeads > 0);
  }, [leadQualityComparison]);

  if (loading) {
    return (
      <Card className="bg-white border border-slate-200 shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                <div className="h-2 bg-slate-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white border border-slate-200 shadow-sm p-6">
        <div className="pb-3">
          <h3 className="text-lg font-semibold text-slate-900">Lead Quality by Source</h3>
          <p className="text-sm text-slate-600">Average guests per lead by lead source</p>
        </div>
        <div className="h-64 flex items-center justify-center">
          <div className="text-center">
            <div className="text-slate-500 mb-2">{error}</div>
            <div className="text-xs text-slate-400">
              Check console for details. Proxy server may not be running.
            </div>
          </div>
        </div>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className="bg-white border border-slate-200 shadow-sm p-6">
        <div className="pb-3">
          <h3 className="text-lg font-semibold text-slate-900">Lead Quality by Source</h3>
          <p className="text-sm text-slate-600">Average guests per lead by lead source</p>
        </div>
        <div className="h-64 flex items-center justify-center">
          <div className="text-center text-slate-500">
            <p>No lead source data available</p>
            <p className="text-xs mt-1">Add a 'source' column to your Google Sheets to show lead quality analysis</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-white border border-slate-200 shadow-sm p-6 w-full overflow-hidden">
      <div className="pb-3">
        <h3 className="text-lg font-semibold text-slate-900">Average Guests per Lead by Source</h3>
        <p className="text-sm text-slate-600">Comparison between all-time and last month</p>
      </div>
      
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={chartData} 
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <XAxis 
              dataKey="source"
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              label={{ value: 'Avg Guests', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              formatter={(value: number, name: string, props: any) => [
                `${value} guests per lead`,
                name === 'allTime' ? 'All Time' : 'Last Month'
              ]}
              labelFormatter={(label, payload) => {
                const data = payload?.[0]?.payload;
                return `${data?.source}`;
              }}
              labelStyle={{ color: '#374151' }}
              contentStyle={{ 
                backgroundColor: '#fff', 
                border: '1px solid #E2E8F0',
                borderRadius: '6px'
              }}
            />
            <Legend />
            <Bar 
              dataKey="allTime" 
              name="All Time"
              fill="#8b5cf6"
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              dataKey="lastMonth" 
              name="Last Month"
              fill="#ec4899"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Summary stats */}
      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div className="text-center p-2 bg-slate-50 rounded">
          <div className="font-semibold text-slate-900">
            {chartData.reduce((sum, item) => sum + item.allTimeLeads, 0)}
          </div>
          <div className="text-slate-600">Total Leads (All Time)</div>
        </div>
        <div className="text-center p-2 bg-slate-50 rounded">
          <div className="font-semibold text-slate-900">
            {chartData.reduce((sum, item) => sum + item.lastMonthLeads, 0)}
          </div>
          <div className="text-slate-600">Total Leads (Last Month)</div>
        </div>
      </div>
    </Card>
  );
});
