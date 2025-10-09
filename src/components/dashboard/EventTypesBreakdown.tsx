import { Card } from '@/components/ui/card';
import { LeadData, LeadDataService } from '@/services/data/leadDataService';
import React, { useEffect, useState } from 'react';
import { ChartWrapper } from '@/components/ui/chart-wrapper';

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

export const EventTypesBreakdown: React.FC<EventTypesBreakdownProps> = ({ data, dateRange }) => {
  const [leadData, setLeadData] = useState<LeadData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('EventTypesBreakdown: Starting to fetch lead data...');
        
        // Use client-specific Google Sheets configuration if available
        let leadDataResult;
        if (data?.clientAccounts?.googleSheetsConfig) {
          console.log('EventTypesBreakdown: Using client-specific Google Sheets config:', data.clientAccounts.googleSheetsConfig);
          leadDataResult = await LeadDataService.fetchLeadData(
            data.clientAccounts.googleSheetsConfig.spreadsheetId,
            data.clientAccounts.googleSheetsConfig.sheetName
          );
        } else {
          console.log('EventTypesBreakdown: Using default Google Sheets config');
          leadDataResult = await LeadDataService.fetchLeadData();
        }
        
        console.log('EventTypesBreakdown: Received lead data:', leadDataResult);
        
        if (leadDataResult) {
          console.log('EventTypesBreakdown: Event types data:', leadDataResult.eventTypes);
          setLeadData(leadDataResult);
        } else {
          console.warn('EventTypesBreakdown: No data returned from LeadDataService');
        }
      } catch (error) {
        console.error('EventTypesBreakdown: Failed to fetch lead data:', error);
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

  if (!leadData) {
    return (
      <Card className="bg-white border border-slate-200 shadow-sm p-6 w-full md:w-full">
        <div className="pb-3">
          <h3 className="text-lg font-semibold text-slate-900">Event Types</h3>
          <p className="text-sm text-slate-600">What types of events customers are planning</p>
        </div>
        <div className="h-64 flex items-center justify-center">
          <div className="text-center">
            <div className="text-slate-500 mb-2">Failed to load event type data</div>
            <div className="text-xs text-slate-400">
              Check console for details. Proxy server may not be running.
            </div>
          </div>
        </div>
      </Card>
    );
  }

  const eventTypes = leadData.eventTypes || [];

  if (eventTypes.length === 0) {
    return (
      <Card className="bg-white border border-slate-200 shadow-sm p-6 w-full md:w-full">
        <div className="pb-3">
          <h3 className="text-lg font-semibold text-slate-900">Event Types</h3>
          <p className="text-sm text-slate-600">What types of events customers are planning</p>
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
  const chartData = eventTypes.map((eventType, index) => ({
    name: eventType.type,
    value: eventType.count,
    percentage: eventType.percentage,
    color: getEventTypeColor(eventType.type)
  }));

  const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'];

  return (
    <Card className="bg-white border border-slate-200 shadow-sm p-6 w-full">
      <div className="pb-3">
        <h3 className="text-lg font-semibold text-slate-900">Event Types</h3>
        <p className="text-sm text-slate-600">
          {dateRange ? 
            `Event types for ${new Date(dateRange.start).toLocaleDateString()} - ${new Date(dateRange.end).toLocaleDateString()}` :
            'What types of events customers are planning'
          }
        </p>
        <div className="text-xs text-slate-400 mt-1">
          API: GET /spreadsheets/{id}/values | Smart detection: Event type column
        </div>
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
};
