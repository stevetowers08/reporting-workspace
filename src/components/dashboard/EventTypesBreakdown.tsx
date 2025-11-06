import { DataSkeleton } from '@/components/ui/UnifiedLoadingSystem';
import { Card } from '@/components/ui/card';
import { debugLogger } from '@/lib/debug';
import { EventDashboardData } from '@/services/data/eventMetricsService';
import { LeadData, LeadDataService } from '@/services/data/leadDataService';
import React, { useEffect, useState } from 'react';
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface EventTypesBreakdownProps {
  data: EventDashboardData | null | undefined;
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
        console.log('🔍 EventTypesBreakdown: Starting fetch');
        debugLogger.debug('EventTypesBreakdown', 'Starting to fetch lead data');
        
        // Try to get googleSheetsConfig from either clientAccounts or clientData (same pattern as GuestCountDistribution)
        const googleSheetsConfig = data?.clientAccounts?.googleSheetsConfig || data?.clientData?.accounts?.googleSheetsConfig;
        const googleSheets = data?.clientAccounts?.googleSheets || data?.clientData?.accounts?.googleSheets;
        
        console.log('  - googleSheetsConfig:', googleSheetsConfig);
        console.log('  - googleSheets:', googleSheets);
        
        // Check if client has Google Sheets configuration
        if (!googleSheetsConfig && !googleSheets) {
          console.warn('⚠️ EventTypesBreakdown: No Google Sheets config found');
          debugLogger.warn('EventTypesBreakdown', 'No Google Sheets configuration found for client');
          setError('Google Sheets not configured for this client');
          setLeadData(null);
          setLoading(false);
          return;
        }
        
        // Use client-specific Google Sheets configuration
        let leadDataResult;
        const dateRange = data?.dateRange;
        
        if (googleSheetsConfig) {
          const { spreadsheetId, sheetName } = googleSheetsConfig;
          console.log('  - Using googleSheetsConfig:', { spreadsheetId, sheetName, dateRange });
          debugLogger.debug('EventTypesBreakdown', 'Using client-specific Google Sheets config', { googleSheetsConfig, dateRange });
          leadDataResult = await LeadDataService.fetchLeadData(spreadsheetId, sheetName, dateRange);
        } else if (googleSheets) {
          console.log('  - Using legacy googleSheets:', googleSheets, dateRange);
          debugLogger.debug('EventTypesBreakdown', 'Using client-specific Google Sheets config (legacy)', { googleSheets, dateRange });
          leadDataResult = await LeadDataService.fetchLeadData(
            googleSheets,
            'Event Leads', // Use Event Leads as default sheet name
            dateRange
          );
        }
        
        console.log('📊 EventTypesBreakdown: Received lead data', {
          hasResult: !!leadDataResult,
          eventTypesCount: leadDataResult?.eventTypes?.length,
          eventTypes: leadDataResult?.eventTypes
        });
        debugLogger.debug('EventTypesBreakdown', 'Received lead data', leadDataResult);
        
        if (leadDataResult) {
          console.log('✅ EventTypesBreakdown: Data received', {
            eventTypes: leadDataResult.eventTypes
          });
          debugLogger.debug('EventTypesBreakdown', 'Event types data', leadDataResult.eventTypes);
          setLeadData(leadDataResult);
        } else {
          console.error('❌ EventTypesBreakdown: No data returned from LeadDataService');
          debugLogger.warn('EventTypesBreakdown', 'No data returned from LeadDataService');
          setLeadData(null);
        }
      } catch (error) {
        debugLogger.error('EventTypesBreakdown', 'Failed to fetch lead data', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to load event types data';
        setError(errorMessage);
        setLeadData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [data]);

  if (loading) {
    return (
      <Card className="h-full">
        <DataSkeleton />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full flex flex-col">
        <div className="pb-4">
          <h3 className="text-lg font-semibold text-slate-900">Event Types</h3>
        </div>
        <div className="flex-1 flex items-center justify-center min-h-0">
          <div className="text-center">
            <div className="text-slate-500">No event type data available</div>
          </div>
        </div>
      </Card>
    );
  }

  if (!leadData || !leadData.eventTypes) {
    return (
      <Card className="h-full flex flex-col">
        <div className="pb-4">
          <h3 className="text-lg font-semibold text-slate-900">Event Types</h3>
        </div>
        <div className="flex-1 flex items-center justify-center min-h-0">
          <div className="text-center">
            <div className="text-slate-500">No event type data available</div>
          </div>
        </div>
      </Card>
    );
  }

  const eventTypes = leadData.eventTypes;

  if (eventTypes.length === 0) {
    return (
      <Card className="h-full flex flex-col">
        <div className="pb-4">
          <h3 className="text-lg font-semibold text-slate-900">Event Types</h3>
        </div>
        <div className="flex-1 flex items-center justify-center min-h-0">
          <div className="text-slate-500">No event type data available</div>
        </div>
      </Card>
    );
  }

  // Color palette for event types
  const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#8B5CF6'];
  
  // Sort event types by count (descending) for better visualization
  const sortedEventTypes = [...eventTypes].sort((a, b) => b.count - a.count);

  // Prepare chart data with colors
  const chartData = sortedEventTypes.map((eventType, index) => ({
    name: eventType.type,
    value: eventType.count,
    percentage: eventType.percentage,
    color: COLORS[index % COLORS.length]
  }));

  return (
    <Card className="h-full flex flex-col">
      <div className="pb-6">
        <h3 className="text-lg font-semibold text-slate-900">Event Types</h3>
      </div>
      
      <div className="flex-1 min-h-0 -mx-2">
        <div className="h-64 px-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={chartData} 
              margin={{ top: 20, right: 30, left: 20, bottom: chartData.length > 5 ? 60 : 40 }}
            >
              <XAxis 
                dataKey="name"
                tick={{ fontSize: 11, fill: '#64748B' }}
                angle={chartData.length > 5 ? -45 : 0}
                textAnchor={chartData.length > 5 ? 'end' : 'middle'}
                height={chartData.length > 5 ? 60 : 40}
                axisLine={{ stroke: '#E2E8F0' }}
                tickLine={{ stroke: '#E2E8F0' }}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#64748B' }}
                axisLine={{ stroke: '#E2E8F0' }}
                tickLine={{ stroke: '#E2E8F0' }}
                label={{ 
                  value: 'Event Count', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fontSize: '12px', fill: '#64748B', fontWeight: 500 }
                }}
              />
              <Tooltip 
                formatter={(value: number, name: string, props: any) => [
                  `${value} events (${props.payload?.percentage?.toFixed(1) || '0'}%)`,
                  'Count'
                ]}
                labelStyle={{ 
                  color: '#111827', 
                  fontWeight: 600, 
                  marginBottom: '6px',
                  fontSize: '13px'
                }}
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  padding: '12px'
                }}
                cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
              />
              <Bar 
                dataKey="value" 
                radius={[4, 4, 0, 0]}
                animationDuration={800}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
                <LabelList 
                  dataKey="value" 
                  position="top" 
                  style={{ fontSize: '12px', fill: '#374151', fontWeight: 600 }} 
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {chartData.length > 0 && (
        <div className="mt-6 pt-4 border-t border-slate-200">
          <p className="text-xs text-slate-500">
            Showing {sortedEventTypes.length} event {sortedEventTypes.length === 1 ? 'type' : 'types'} from {leadData.totalLeads} {leadData.totalLeads === 1 ? 'lead' : 'leads'}
          </p>
        </div>
      )}
    </Card>
  );
});
