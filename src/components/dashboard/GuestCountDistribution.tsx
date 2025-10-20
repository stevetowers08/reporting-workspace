import { DataSkeleton } from '@/components/ui/UnifiedLoadingSystem';
import { debugLogger } from '@/lib/debug';
import { EventDashboardData } from '@/services/data/eventMetricsService';
import { LeadData, LeadDataService } from '@/services/data/leadDataService';
import React, { useEffect, useState } from 'react';
import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '@/components/ui/card';

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
          debugLogger.debug('GuestCountDistribution', 'Using default Google Sheets config');
          leadDataResult = await LeadDataService.fetchLeadData();
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
      <Card className="bg-white border border-slate-200 p-6">
        <DataSkeleton />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white border border-slate-200 p-6 w-full md:w-full">
        <div className="pb-3">
          <h3 className="text-lg font-semibold text-slate-900">Guest Count Distribution</h3>
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
      <Card className="bg-white border border-slate-200 p-6 w-full md:w-full">
        <div className="pb-3">
          <h3 className="text-lg font-semibold text-slate-900">Guest Count Distribution</h3>
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
  
  // Prepare chart data
  const chartData = leadData.guestRanges.map((range, index) => ({
    name: range.range,
    value: range.count,
    percentage: range.percentage,
    color: ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'][index % 5]
  }));

  return (
    <Card className="bg-white border border-slate-200 p-6 w-full">
      <div className="pb-3">
        <h3 className="text-lg font-semibold text-slate-900">Guest Count Distribution</h3>
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
                `${value} leads (${props.payload?.percentage?.toFixed(1) || '0'}%)`,
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
