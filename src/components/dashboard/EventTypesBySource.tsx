import { Card } from '@/components/ui/card';
import { debugLogger } from '@/lib/debug';
import React, { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface EventTypesBySourceProps {
  data: {
    leadData?: any;
    clientAccounts?: {
      googleSheets?: string;
      googleSheetsConfig?: { spreadsheetId: string; sheetName: string };
    };
  } | null | undefined;
  dateRange?: { start: string; end: string };
}

interface SourceEventTypeData {
  source: string;
  eventTypes: { [key: string]: number };
  totalLeads: number;
}

export const EventTypesBySource: React.FC<EventTypesBySourceProps> = React.memo(({ data, dateRange: _dateRange }) => {
  const [sourceEventData, setSourceEventData] = useState<SourceEventTypeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Color mapping for event types
  const getEventTypeColor = (eventType: string) => {
    const colorMap: { [key: string]: string } = {
      'Wedding': '#10B981',
      'Corporate': '#3B82F6', 
      'Birthday': '#8B5CF6',
      'Anniversary': '#F59E0B',
      'Holiday': '#EF4444',
      'Private Event': '#06B6D4',
      'Other': '#6B7280'
    };
    return colorMap[eventType] || '#6B7280';
  };

  // Process raw data to get event types by source
  const processEventTypesBySource = async (rawData: any) => {
    if (!rawData?.values || rawData.values.length < 2) {
      return [];
    }

    const headers = rawData.values[0];
    const rows = rawData.values.slice(1);
    
    // Find column indices
    const sourceIndex = headers.findIndex((h: string) => h.toLowerCase().includes('source'));
    const eventTypeIndex = headers.findIndex((h: string) => h.toLowerCase().includes('type'));
    
    if (sourceIndex === -1) {
      debugLogger.warn('EventTypesBySource', 'No source column found');
      return [];
    }

    const sourceData: { [key: string]: SourceEventTypeData } = {};

    rows.forEach((row: string[]) => {
      const source = row[sourceIndex]?.trim() || 'Unknown';
      const eventType = eventTypeIndex >= 0 ? row[eventTypeIndex]?.trim() || 'Unknown' : 'Unknown';

      if (!sourceData[source]) {
        sourceData[source] = {
          source,
          eventTypes: {},
          totalLeads: 0
        };
      }

      sourceData[source].totalLeads++;
      sourceData[source].eventTypes[eventType] = (sourceData[source].eventTypes[eventType] || 0) + 1;
    });

    return Object.values(sourceData);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        debugLogger.debug('EventTypesBySource', 'Starting to fetch event types by source data');
        
        // Use client-specific Google Sheets configuration if available
        let rawData;
        if (data?.clientAccounts?.googleSheetsConfig) {
          debugLogger.debug('EventTypesBySource', 'Using client-specific Google Sheets config', data.clientAccounts.googleSheetsConfig);
          const { GoogleSheetsService } = await import('@/services/api/googleSheetsService');
          rawData = await GoogleSheetsService.getSpreadsheetData(
            data.clientAccounts.googleSheetsConfig.spreadsheetId,
            data.clientAccounts.googleSheetsConfig.sheetName
          );
        } else if (data?.clientAccounts?.googleSheets) {
          debugLogger.debug('EventTypesBySource', 'Using client-specific Google Sheets config (legacy)', data.clientAccounts.googleSheets);
          const { GoogleSheetsService } = await import('@/services/api/googleSheetsService');
          rawData = await GoogleSheetsService.getSpreadsheetData(
            data.clientAccounts.googleSheets,
            'Event Leads'
          );
        } else {
          throw new Error('No Google Sheets configuration available');
        }
        
        debugLogger.debug('EventTypesBySource', 'Received raw data', rawData);
        
        if (rawData) {
          const processedData = await processEventTypesBySource(rawData);
          debugLogger.debug('EventTypesBySource', 'Processed event types by source data', processedData);
          setSourceEventData(processedData);
        } else {
          debugLogger.warn('EventTypesBySource', 'No data returned from GoogleSheetsService');
          setSourceEventData([]);
        }
      } catch (error) {
        debugLogger.error('EventTypesBySource', 'Failed to fetch event types by source data', error);
        setError('Failed to load event types by source data');
        setSourceEventData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [data]);

  // Chart data for stacked bar chart
  const chartData = useMemo(() => {
    if (sourceEventData.length === 0) return [];

    // Get all unique event types across all sources
    const allEventTypes = new Set<string>();
    sourceEventData.forEach(source => {
      Object.keys(source.eventTypes).forEach(eventType => {
        allEventTypes.add(eventType);
      });
    });

    const eventTypesArray = Array.from(allEventTypes);

    // Create chart data with sources as categories
    return sourceEventData.map(source => {
      const dataPoint: any = { source: source.source };
      
      eventTypesArray.forEach(eventType => {
        dataPoint[eventType] = source.eventTypes[eventType] || 0;
      });
      
      return dataPoint;
    });
  }, [sourceEventData]);

  // Get all event types for the bars
  const eventTypes = useMemo(() => {
    const allEventTypes = new Set<string>();
    sourceEventData.forEach(source => {
      Object.keys(source.eventTypes).forEach(eventType => {
        allEventTypes.add(eventType);
      });
    });
    return Array.from(allEventTypes);
  }, [sourceEventData]);

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
          <h3 className="text-lg font-semibold text-slate-900">Event Types by Source</h3>
          <p className="text-sm text-slate-600">Distribution of event types across lead sources</p>
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
          <h3 className="text-lg font-semibold text-slate-900">Event Types by Source</h3>
          <p className="text-sm text-slate-600">Distribution of event types across lead sources</p>
        </div>
        <div className="h-64 flex items-center justify-center">
          <div className="text-center text-slate-500">
            <p>No event type data available</p>
            <p className="text-xs mt-1">Add 'source' and 'type' columns to your Google Sheets to show event type analysis</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-white border border-slate-200 shadow-sm p-6 w-full overflow-hidden">
      <div className="pb-3">
        <h3 className="text-lg font-semibold text-slate-900">Event Types by Source</h3>
        <p className="text-sm text-slate-600">Distribution of event types across lead sources</p>
      </div>
      
      <div className="h-80 w-full">
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
              label={{ value: 'Number of Leads', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              formatter={(value: number, name: string) => [
                `${value} leads`,
                name
              ]}
              labelFormatter={(label) => `Source: ${label}`}
              labelStyle={{ color: '#374151' }}
              contentStyle={{ 
                backgroundColor: '#fff', 
                border: '1px solid #E2E8F0',
                borderRadius: '6px'
              }}
            />
            <Legend />
            {eventTypes.map((eventType, index) => (
              <Bar 
                key={eventType}
                dataKey={eventType} 
                stackId="a"
                fill={getEventTypeColor(eventType)}
                name={eventType}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Summary stats */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        {eventTypes.slice(0, 6).map(eventType => {
          const totalCount = sourceEventData.reduce((sum, source) => 
            sum + (source.eventTypes[eventType] || 0), 0
          );
          return (
            <div key={eventType} className="text-center p-2 bg-slate-50 rounded">
              <div className="font-semibold text-slate-900">{totalCount}</div>
              <div className="text-slate-600 truncate">{eventType}</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
});
