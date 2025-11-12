import { DataSkeleton } from '@/components/ui/UnifiedLoadingSystem';
import { Card } from '@/components/ui/card';
import { debugLogger } from '@/lib/debug';
import { EventDashboardData } from '@/services/data/eventMetricsService';
import { LeadData, LeadDataService } from '@/services/data/leadDataService';
import React, { useEffect, useState } from 'react';
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface GuestCountDistributionProps {
  data: EventDashboardData | null | undefined;
}

export const GuestCountDistribution: React.FC<GuestCountDistributionProps> = React.memo(({ data }) => {
  const [leadData, setLeadData] = useState<LeadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        
        // Get googleSheetsConfig from clientAccounts
        const googleSheetsConfig = data?.clientAccounts?.googleSheetsConfig;
        const googleSheets = data?.clientAccounts?.googleSheets;
        debugLogger.debug('GuestCountDistribution', 'Starting to fetch lead data', {
          hasData: !!data,
          hasClientAccounts: !!data?.clientAccounts,
          hasGoogleSheetsConfig: !!googleSheetsConfig,
          googleSheetsConfig: googleSheetsConfig
        });
        
        // Check if client has Google Sheets configuration
        if (!googleSheetsConfig && !googleSheets) {
          debugLogger.warn('GuestCountDistribution', 'No Google Sheets configuration found for client');
          setError('Google Sheets not configured for this client');
          setLeadData(null);
          setLoading(false);
          return;
        }
        
        // Use client-specific Google Sheets configuration if available
        let leadDataResult;
        const dateRange = data?.dateRange;
        
        if (googleSheetsConfig) {
          const { spreadsheetId, sheetName } = googleSheetsConfig;
          debugLogger.debug('GuestCountDistribution', 'Using client-specific Google Sheets config', {
            spreadsheetId,
            sheetName,
            config: googleSheetsConfig,
            dateRange
          });
          
          if (!spreadsheetId || !sheetName) {
            debugLogger.error('GuestCountDistribution', 'Missing spreadsheetId or sheetName', {
              spreadsheetId,
              sheetName
            });
            setError('Invalid Google Sheets configuration');
            setLeadData(null);
            setLoading(false);
            return;
          }
          
          leadDataResult = await LeadDataService.fetchLeadData(spreadsheetId, sheetName, dateRange);
        } else if (googleSheets) {
          debugLogger.debug('GuestCountDistribution', 'Using client-specific Google Sheets config (legacy)', { googleSheets, dateRange });
          leadDataResult = await LeadDataService.fetchLeadData(
            googleSheets,
            'Event Leads', // Use Event Leads as default sheet name
            dateRange
          );
        }
        
        debugLogger.debug('GuestCountDistribution', 'Received lead data', {
          hasResult: !!leadDataResult,
          totalLeads: leadDataResult?.totalLeads,
          guestRangesCount: leadDataResult?.guestRanges?.length,
          eventTypesCount: leadDataResult?.eventTypes?.length
        });
        
        if (leadDataResult) {
          debugLogger.debug('GuestCountDistribution', 'Guest ranges data', leadDataResult.guestRanges);
          setLeadData(leadDataResult);
        } else {
          debugLogger.warn('GuestCountDistribution', 'No data returned from LeadDataService');
          setLeadData(null);
        }
      } catch (error) {
        debugLogger.error('GuestCountDistribution', 'Failed to fetch lead data', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to load guest count data';
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

  // Hide component if there's an error or no data
  if (error || !leadData) {
    return null;
  }
  
  // Always show guest count distribution (this component is specifically for guest counts)
  // Calculate average - use averageGuestsPerLead from LeadData if available
  const averageGuests = leadData.averageGuestsPerLead || 0;
  
  // Prepare chart data - always use guest ranges for this component
  // Keep ranges in order (1-50, 51-100, etc.) for histogram-style visualization
  // Don't sort - maintain natural order for distribution
  debugLogger.debug('GuestCountDistribution', 'Preparing chart data', {
    guestRangesLength: leadData.guestRanges?.length,
    isArray: Array.isArray(leadData.guestRanges)
  });
  
  // Define the order of ranges for histogram
  const rangeOrder = ['1-50 guests', '51-100 guests', '101-200 guests', '201-300 guests', '300+ guests'];
  
  const chartData = leadData.guestRanges && Array.isArray(leadData.guestRanges) && leadData.guestRanges.length > 0
    ? rangeOrder.map((rangeName) => {
        // Find the range in the data
        const range = leadData.guestRanges.find(r => r.range === rangeName) || {
          range: rangeName,
          count: 0,
          percentage: 0
        };
        
        // Use a single color gradient for histogram-style (darker = more, lighter = less)
        // Calculate intensity based on count
        const counts = leadData.guestRanges.map(r => r.count);
        const maxCount = counts.length > 0 ? Math.max(...counts, 1) : 1;
        const intensity = range.count > 0 ? range.count / maxCount : 0;
        
        // Green gradient: darker green for higher counts
        const colorIntensity = Math.max(0.3, intensity); // Minimum 30% opacity
        const color = range.count > 0 
          ? `rgba(16, 185, 129, ${0.4 + colorIntensity * 0.6})` // Green with variable opacity
          : 'rgba(148, 163, 184, 0.2)'; // Light gray for empty ranges
        
        return {
          name: range.range,
          value: range.count,
          percentage: range.percentage,
          color: color,
          isHighest: range.count === maxCount && range.count > 0,
          isEmpty: range.count === 0
        };
      })
    : [];
  
  // Check if there's any valid guest count data (any range with count > 0)
  const hasValidData = chartData.some(range => range.value > 0);
  
  // Hide component if no valid guest count data found
  if (!hasValidData) {
    debugLogger.debug('GuestCountDistribution', 'No valid guest count data found, hiding component');
    return null;
  }
  
  debugLogger.debug('GuestCountDistribution', 'Chart data prepared', {
    chartDataLength: chartData.length,
    hasValidData
  });

  return (
    <Card className="h-full flex flex-col">
      <div className="pb-6 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">
            Guest Count Distribution
          </h3>
          {averageGuests > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Average:</span>
              <span className="text-sm font-semibold text-slate-900">
                {averageGuests.toFixed(1)} guests
              </span>
            </div>
          )}
        </div>
        <p className="text-xs text-slate-500">
          Based on {leadData.totalLeads} {leadData.totalLeads === 1 ? 'lead' : 'leads'}
        </p>
      </div>
      
      <div className="flex-1 min-h-0 -mx-2">
        <div className="h-64 px-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={chartData} 
              margin={{ top: 20, right: 30, left: 20, bottom: chartData.length > 5 ? 60 : 40 }}
              barCategoryGap={0}
              barGap={0}
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
                  value: 'Number of Leads', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fontSize: '12px', fill: '#64748B', fontWeight: 500 }
                }}
              />
              <Tooltip 
                formatter={(value: number, name: string, props: any) => [
                  `${value} ${value === 1 ? 'lead' : 'leads'} (${props.payload?.percentage?.toFixed(1) || '0'}%)`,
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
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color}
                    stroke={entry.isEmpty ? '#E2E8F0' : 'none'}
                    strokeWidth={entry.isEmpty ? 1 : 0}
                  />
                ))}
                <LabelList 
                  dataKey="value" 
                  position="top" 
                  style={{ 
                    fontSize: '12px', 
                    fill: '#374151', 
                    fontWeight: 600 
                  }}
                  formatter={(label: React.ReactNode) => {
                    const value = typeof label === 'number' ? label : 0;
                    return value > 0 ? value : '';
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="mt-6 pt-4 border-t border-slate-200">
        <p className="text-xs text-slate-500">
          Distribution by guest count range
        </p>
      </div>
    </Card>
  );
});
