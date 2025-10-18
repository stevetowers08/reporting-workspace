import { Card } from '@/components/ui/card';
import { debugLogger } from '@/lib/debug';
import { LeadData, LeadDataService } from '@/services/data/leadDataService';
import React, { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface EventTypesBreakdownProps {
  data: {
    leadData?: {
      eventTypes?: Array<{
        type: string;
        count: number;
        percentage: number;
      }>;
    };
    clientAccounts?: {
      googleSheets?: string;
      googleSheetsConfig?: { spreadsheetId: string; sheetName: string };
    };
  } | null | undefined;
  dateRange?: { start: string; end: string };
}

export const EventTypesBreakdown: React.FC<EventTypesBreakdownProps> = React.memo(({ data, dateRange: _dateRange }) => {
  const [leadData, setLeadData] = useState<LeadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ FIX: Move useMemo hooks before conditional returns to follow Rules of Hooks
  const eventTypes = useMemo(() => leadData?.eventTypes || [], [leadData?.eventTypes]);
  
  const getEventTypeColor = (eventType: string) => {
    const colorMap: { [key: string]: string } = {
      'Wedding': '#10B981',
      'Corporate': '#3B82F6', 
      'Birthday': '#8B5CF6',
      'Anniversary': '#F59E0B',
      'Holiday': '#EF4444',
      'Other': '#6B7280'
    };
    return colorMap[eventType] || '#6B7280'; // Default gray
  };

  const chartData = useMemo(() => {
    const sortedEventTypes = [...eventTypes].sort((a, b) => b.count - a.count);
    const top6EventTypes = sortedEventTypes.slice(0, 6);
    
    return top6EventTypes.map((eventType, _index) => ({
      name: eventType.type,
      value: eventType.count,
      percentage: eventType.percentage,
      color: getEventTypeColor(eventType.type)
    }));
  }, [eventTypes]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        debugLogger.debug('EventTypesBreakdown', 'Starting to fetch lead data');
        
        // Use client-specific Google Sheets configuration if available
        let leadDataResult;
        if (data?.clientAccounts?.googleSheetsConfig) {
          debugLogger.debug('EventTypesBreakdown', 'Using client-specific Google Sheets config', data.clientAccounts.googleSheetsConfig);
          leadDataResult = await LeadDataService.fetchLeadData(
            data.clientAccounts.googleSheetsConfig.spreadsheetId,
            data.clientAccounts.googleSheetsConfig.sheetName
          );
        } else if (data?.clientAccounts?.googleSheets) {
          debugLogger.debug('EventTypesBreakdown', 'Using client-specific Google Sheets config (legacy)', data.clientAccounts.googleSheets);
          leadDataResult = await LeadDataService.fetchLeadData(
            data.clientAccounts.googleSheets,
            'Event Leads' // Use Event Leads as default sheet name
          );
        } else {
          // No default fallback - require proper configuration
          throw new Error('No Google Sheets configuration available');
        }
        
        debugLogger.debug('EventTypesBreakdown', 'Received lead data', leadDataResult);
        
        if (leadDataResult) {
          debugLogger.debug('EventTypesBreakdown', 'Event types data', leadDataResult.eventTypes);
          setLeadData(leadDataResult);
        } else {
          debugLogger.warn('EventTypesBreakdown', 'No data returned from LeadDataService');
          setLeadData(null);
        }
      } catch (error) {
        debugLogger.error('EventTypesBreakdown', 'Failed to fetch lead data', error);
        setError('Failed to load event types data');
        setLeadData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [data]);

  if (loading) {
    return (
      <Card className="bg-white border border-slate-200 shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                <div className="h-2 bg-slate-200 rounded w-full md:w-full"></div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white border border-slate-200 shadow-sm p-6 w-full md:w-full">
        <div className="pb-3">
          <h3 className="text-lg font-semibold text-slate-900">Event Types</h3>
          <p className="text-sm text-slate-600">What types of events customers are planning</p>
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

  if (eventTypes.length === 0 || !leadData?.availableColumns?.hasTypeColumn) {
    return (
      <Card className="bg-white border border-slate-200 shadow-sm p-6 w-full md:w-full">
        <div className="pb-3">
          <h3 className="text-lg font-semibold text-slate-900">Event Types</h3>
          <p className="text-sm text-slate-600">What types of events customers are planning</p>
        </div>
        <div className="h-64 flex items-center justify-center">
          <div className="text-center text-slate-500">
            {!leadData?.availableColumns?.hasTypeColumn ? (
              <div>
                <p>No 'type' column found in spreadsheet</p>
                <p className="text-xs mt-1">Add a 'type' column to your Google Sheets to show event types</p>
              </div>
            ) : (
              <p>No event type data available</p>
            )}
          </div>
        </div>
      </Card>
    );
  }

  const _COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'];

  return (
    <Card className="bg-white border border-slate-200 shadow-sm p-6 w-full">
      <div className="pb-3">
        <h3 className="text-lg font-semibold text-slate-900">Top 6 Event Types</h3>
        <p className="text-sm text-slate-600">Most popular event categories</p>
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={chartData} 
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <XAxis 
              dataKey="name"
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
            />
            <Tooltip 
              formatter={(value: number, name: string, props: { payload?: { percentage?: number } }) => [
                `${value} events (${props.payload?.percentage?.toFixed(1)}%)`,
                'Count'
              ]}
              labelFormatter={(label, payload) => {
                const data = payload?.[0]?.payload;
                return `${data?.name} - ${data?.percentage?.toFixed(1)}%`;
              }}
              labelStyle={{ color: '#374151' }}
              contentStyle={{ 
                backgroundColor: '#fff', 
                border: '1px solid #E2E8F0',
                borderRadius: '6px'
              }}
            />
            <Bar 
              dataKey="value" 
              fill="#3B82F6"
              radius={[4, 4, 0, 0]}
            >
              <LabelList dataKey="value" position="top" style={{ fontSize: '12px', fill: '#374151' }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
});
