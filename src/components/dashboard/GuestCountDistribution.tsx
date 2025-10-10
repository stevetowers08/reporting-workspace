import { Card } from '@/components/ui/card';
import { EventDashboardData } from '@/services/data/eventMetricsService';
import { LeadData, LeadDataService } from '@/services/data/leadDataService';
import React, { useEffect, useState } from 'react';
import { ChartWrapper } from '@/components/ui/chart-wrapper';

interface GuestCountDistributionProps {
  data: EventDashboardData | null | undefined;
}

export const GuestCountDistribution: React.FC<GuestCountDistributionProps> = React.memo(({ data }) => {
  const [leadData, setLeadData] = useState<LeadData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        debugLogger.debug('GuestCountDistribution', 'Starting to fetch lead data');
        
        // Use client-specific Google Sheets configuration if available
        let leadDataResult;
        if (data?.clientAccounts?.googleSheetsConfig) {
          debugLogger.debug('GuestCountDistribution', 'Using client-specific Google Sheets config', data.clientAccounts.googleSheetsConfig);
          leadDataResult = await LeadDataService.fetchLeadData(
            data.clientAccounts.googleSheetsConfig.spreadsheetId,
            data.clientAccounts.googleSheetsConfig.sheetName
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
        }
      } catch (error) {
        debugLogger.error('GuestCountDistribution', 'Failed to fetch lead data', error);
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

  if (!leadData) {
    return (
      <Card className="bg-white border border-slate-200 shadow-sm p-6 w-full md:w-full">
        <div className="pb-4">
          <h3 className="text-lg font-semibold text-slate-900">Guest Count Distribution</h3>
          <p className="text-sm text-slate-500">Average: 88 guests per lead</p>
        </div>
        <div className="h-64 flex items-center justify-center">
          <div className="text-center">
            <div className="text-slate-500 mb-2">Failed to load guest count data</div>
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
    <Card className="bg-white border border-slate-200 shadow-sm p-6 w-full">
      <div className="pb-4">
        <h3 className="text-lg font-semibold text-slate-900">Guest Count Distribution</h3>
        <p className="text-sm text-slate-500">Average: {leadData.averageGuestsPerLead.toFixed(0)} guests per lead</p>
        <div className="text-xs text-slate-400 mt-1">
          API: GET /spreadsheets/{id}/values | Guest count analysis
        </div>
      </div>
      
      <div className="h-64">
        <ChartWrapper
          type="bar"
          data={{
            labels: chartData.map(item => item.name),
            datasets: [{
              label: 'Leads',
              data: chartData.map(item => item.value),
              backgroundColor: '#10B981',
              borderColor: '#10B981',
              borderWidth: 1,
            }]
          }}
          options={{
            plugins: {
              tooltip: {
                callbacks: {
                  label: function(context) {
                    const percentage = chartData[context.dataIndex]?.percentage?.toFixed(1) || '0';
                    return `${context.parsed.y} leads (${percentage}%)`;
                  }
                }
              }
            }
          }}
        />
      </div>
    </Card>
  );
};
