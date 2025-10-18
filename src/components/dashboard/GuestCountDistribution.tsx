import { Card } from '@/components/ui/card';
import { debugLogger } from '@/lib/debug';
import { EventDashboardData } from '@/services/data/eventMetricsService';
import { LeadData, LeadDataService } from '@/services/data/leadDataService';
import React, { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface GuestCountDistributionProps {
  data: EventDashboardData | null | undefined;
}

export const GuestCountDistribution: React.FC<GuestCountDistributionProps> = React.memo(({ data }) => {
  const [leadData, setLeadData] = useState<LeadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ FIX: Move useMemo before conditional returns to follow Rules of Hooks
  const chartData = useMemo(() => {
    if (!leadData?.guestRanges) return [];
    
    // Sort guest ranges in ascending order by extracting the first number from the range
    const sortedRanges = [...leadData.guestRanges].sort((a, b) => {
      const getFirstNumber = (range: string) => {
        const match = range.match(/(\d+)/);
        return match ? parseInt(match[1]) : 0;
      };
      return getFirstNumber(a.range) - getFirstNumber(b.range);
    });
    
    return sortedRanges.map((range, index) => ({
      name: range.range,
      value: range.count,
      percentage: range.percentage,
      color: ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'][index % 5]
    }));
  }, [leadData?.guestRanges]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        debugLogger.debug('GuestCountDistribution', 'Starting to fetch lead data');
        
        // Use client-specific Google Sheets configuration if available
        let leadDataResult;
        if (data?.clientAccounts?.googleSheetsConfig) {
          debugLogger.debug('GuestCountDistribution', 'Using client-specific Google Sheets config', data.clientAccounts.googleSheetsConfig);
          leadDataResult = await LeadDataService.fetchLeadData(
            data.clientAccounts.googleSheetsConfig.spreadsheetId,
            data.clientAccounts.googleSheetsConfig.sheetName
          );
        } else if (data?.clientAccounts?.googleSheets) {
          debugLogger.debug('GuestCountDistribution', 'Using client-specific Google Sheets config (legacy)', data.clientAccounts.googleSheets);
          leadDataResult = await LeadDataService.fetchLeadData(
            data.clientAccounts.googleSheets,
            'Event Leads' // Use Event Leads as default sheet name
          );
        } else {
          // No default fallback - require proper configuration
          throw new Error('No Google Sheets configuration available');
        }
        
        debugLogger.debug('GuestCountDistribution', 'Received lead data', leadDataResult);
        
        if (leadDataResult) {
          debugLogger.debug('GuestCountDistribution', 'Guest ranges data', leadDataResult.guestRanges);
          setLeadData(leadDataResult);
        } else {
          debugLogger.warn('GuestCountDistribution', 'No data returned from LeadDataService');
          setLeadData(null);
        }
      } catch (error) {
        debugLogger.error('GuestCountDistribution', 'Failed to fetch lead data', error);
        setError('Failed to load guest count data');
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
              <div key={i} className="flex items-center justify-between">
                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                <div className="h-4 bg-slate-200 rounded w-1/4"></div>
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
        <div className="pb-4">
          <h3 className="text-lg font-semibold text-slate-900">Guest Count Distribution</h3>
          <p className="text-sm text-slate-500">Average: 88 guests per lead</p>
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

  if (!leadData) {
    return (
      <Card className="bg-white border border-slate-200 shadow-sm p-6 w-full md:w-full">
        <div className="pb-4">
          <h3 className="text-lg font-semibold text-slate-900">Guest Count Distribution</h3>
          <p className="text-sm text-slate-500">Average: 88 guests per lead</p>
        </div>
        <div className="h-64 flex items-center justify-center">
          <div className="text-center">
            <div className="text-slate-500 mb-2">No guest count data available</div>
            <div className="text-xs text-slate-400">
              Check console for details. Proxy server may not be running.
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // If no guest data, show empty state
  if (chartData.length === 0) {
    return (
      <Card className="bg-white border border-slate-200 shadow-sm p-6 w-full">
        <div className="pb-3">
          <h3 className="text-lg font-semibold text-slate-900">Guest Count Distribution</h3>
          <p className="text-sm text-slate-600">Average: {leadData?.averageGuestsPerLead?.toFixed(0) || 0} guests per lead</p>
        </div>
        <div className="h-64 flex items-center justify-center">
          <div className="text-slate-500">No guest count data available</div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-white border border-slate-200 shadow-sm p-6 w-full">
      <div className="pb-3">
        <h3 className="text-lg font-semibold text-slate-900">Guest Count Distribution</h3>
        <p className="text-sm text-slate-600">Average: {leadData?.averageGuestsPerLead?.toFixed(0) || 0} guests per lead</p>
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
                `${value} leads (${props.payload?.percentage?.toFixed(1)}%)`,
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
              fill="#10B981"
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
