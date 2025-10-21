import { DataSkeleton } from '@/components/ui/UnifiedLoadingSystem';
import { Card } from '@/components/ui/card';
import { debugLogger } from '@/lib/debug';
import { LeadData, LeadDataService } from '@/services/data/leadDataService';
import React, { useEffect, useState } from 'react';
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
      googleSheetsConfig?: {
        spreadsheetId: string;
        sheetName: string;
      };
    };
  } | null | undefined;
  dateRange?: { start: string; end: string };
}

export const EventTypesBreakdown: React.FC<EventTypesBreakdownProps> = React.memo(({ data, dateRange: _dateRange }) => {
  const [leadData, setLeadData] = useState<LeadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        } else {
          debugLogger.debug('EventTypesBreakdown', 'Using default Google Sheets config');
          leadDataResult = await LeadDataService.fetchLeadData();
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
      <Card className="bg-white border border-slate-200 p-6">
        <DataSkeleton />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white border border-slate-200 p-6 w-full md:w-full">
        <div className="pb-4">
          <h3 className="text-lg font-semibold text-slate-900">Event Types</h3>
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

  const eventTypes = leadData?.eventTypes || [];

  if (eventTypes.length === 0) {
    return (
      <Card className="bg-white border border-slate-200 p-6 w-full md:w-full">
        <div className="pb-4">
          <h3 className="text-lg font-semibold text-slate-900">Event Types</h3>
        </div>
        <div className="h-64 flex items-center justify-center">
          <div className="text-slate-500">No event type data available</div>
        </div>
      </Card>
    );
  }

  // Helper function to get color for event type
  const getEventTypeColor = (eventType: string): string => {
    const colorMap: { [key: string]: string } = {
      'Wedding': '#10B981',      // Green
      'Corporate Event': '#3B82F6',  // Blue
      'Birthday Party': '#8B5CF6',   // Purple
      'Other': '#F59E0B'         // Orange
    };
    return colorMap[eventType] || '#6B7280'; // Default gray
  };

  // Prepare chart data
  const chartData = eventTypes.map((eventType, _index) => ({
    name: eventType.type,
    value: eventType.count,
    percentage: eventType.percentage,
    color: getEventTypeColor(eventType.type)
  }));

  const _COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'];

  return (
    <Card className="bg-white border border-slate-200 p-6 w-full">
      <div className="pb-4">
        <h3 className="text-lg font-semibold text-slate-900">Event Types</h3>
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={chartData} 
            margin={{ top: 20, right: 30, left: 5, bottom: 20 }}
          >
            <XAxis 
              dataKey="name"
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
            />
            <Tooltip 
              formatter={(value: number, name: string, props: any) => [
                `${value} events (${props.payload?.percentage?.toFixed(1) || '0'}%)`,
                'Count'
              ]}
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
