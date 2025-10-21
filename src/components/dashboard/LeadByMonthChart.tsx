import { useClientData } from '@/hooks/useDashboardQueries';
import { debugLogger } from '@/lib/debug';
import { AnalyticsOrchestrator } from '@/services/data/analyticsOrchestrator';
import React, { useEffect, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface LeadByMonthChartProps {
  clientId: string;
}

interface MonthlyLeadsData {
  month: string;
  monthLabel: string;
  facebookLeads: number;
  googleLeads: number;
  totalLeads: number;
}


export const LeadByMonthChart: React.FC<LeadByMonthChartProps> = React.memo(({ 
  clientId
}) => {
  const [chartData, setChartData] = useState<MonthlyLeadsData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Use React Query for client data instead of manual fetching
  const { data: client, isLoading: clientLoading } = useClientData(clientId);

  useEffect(() => {
    const fetchMonthlyLeads = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (!client) {
          setError('Client not found');
          return;
        }

        // Use AnalyticsOrchestrator to get monthly data (consistent with other components)
        const monthlyData = await AnalyticsOrchestrator.getMonthlyLeadsData(clientId, client);
        
        if (!monthlyData || monthlyData.length === 0) {
          setChartData([]);
          return;
        }

        // Convert to chart format
        const chartData: MonthlyLeadsData[] = monthlyData.map(data => ({
          month: data.month,
          monthLabel: data.monthLabel,
          facebookLeads: data.facebookLeads,
          googleLeads: data.googleLeads,
          totalLeads: data.totalLeads
        }));

        setChartData(chartData);

      } catch (err) {
        debugLogger.error('LeadByMonthChart', 'Failed to fetch monthly leads', err);
        setError(`Failed to load monthly leads data: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setChartData([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (client) {
      fetchMonthlyLeads();
    }
  }, [clientId, client]);

  const hasData = chartData.length > 0 && chartData.some(month => month.totalLeads > 0);

  // Show loading state
  if (isLoading || clientLoading) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm">Loading monthly leads...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="h-64 flex items-center justify-center text-red-500">
        <div className="text-center">
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // Show message if no data
  if (!hasData || chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500">
        <div className="text-center">
          <p className="text-sm">No leads data available</p>
          <p className="text-xs mt-1">Connect Meta or Google Ads to see monthly lead trends</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart 
          data={chartData} 
          margin={{ top: 20, right: 30, left: 5, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="monthLabel" 
            tick={{ fontSize: 12 }}
            tickLine={{ stroke: '#64748b' }}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickLine={{ stroke: '#64748b' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1e293b', 
              border: '1px solid #334155',
              borderRadius: '6px',
              color: '#f1f5f9'
            }}
            labelStyle={{ color: '#f1f5f9' }}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="facebookLeads" 
            stroke="#3B82F6" 
            strokeWidth={2}
            name="Meta Leads"
            dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
          />
          <Line 
            type="monotone" 
            dataKey="googleLeads" 
            stroke="#10B981" 
            strokeWidth={2}
            name="Google Leads"
            dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
          />
          <Line 
            type="monotone" 
            dataKey="totalLeads" 
            stroke="#6B7280" 
            strokeWidth={3}
            name="Total Leads"
            dot={{ fill: '#6B7280', strokeWidth: 2, r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});