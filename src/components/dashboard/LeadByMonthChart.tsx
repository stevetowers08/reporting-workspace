import { useClientData } from '@/hooks/useDashboardQueries';
import { debugLogger } from '@/lib/debug';
import { AnalyticsOrchestrator } from '@/services/data/analyticsOrchestrator';
import React, { useEffect, useMemo, useState } from 'react';
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';

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

// Modern color palette - accessible and professional
const CHART_COLORS = {
  facebook: '#1877F2', // Meta blue
  google: '#34A853',   // Google green
  total: '#6366F1',    // Indigo
  grid: '#E2E8F0',     // Light gray
  text: '#475569',     // Slate gray
  background: '#F8FAFC' // Very light gray
} as const;

// Custom tooltip component for better UX
const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 min-w-[200px]">
        <p className="font-semibold text-slate-900 mb-2">{label}</p>
        <div className="space-y-1">
          {payload.map((entry, index: number) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-slate-600">{entry.name}</span>
              </div>
              <span className="font-medium text-slate-900">{entry.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};


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
        console.log('[LeadByMonthChart] Starting fetch', clientId, 'hasClient:', !!client);
        setIsLoading(true);
        setError(null);

        if (!client) {
          console.warn('[LeadByMonthChart] No client data');
          setError('Client not found');
          return;
        }

        console.log('[LeadByMonthChart] Client data - facebookAds:', client.accounts?.facebookAds, 'googleAds:', client.accounts?.googleAds);

        // Use AnalyticsOrchestrator to get monthly data (consistent with other components)
        const monthlyData = await AnalyticsOrchestrator.getMonthlyLeadsData(clientId, client);
        
        console.log('[LeadByMonthChart] Monthly data received - hasData:', !!monthlyData, 'length:', monthlyData?.length || 0);
        if (monthlyData && monthlyData.length > 0) {
          console.log('[LeadByMonthChart] Sample data:', JSON.stringify(monthlyData[0], null, 2));
          console.log('[LeadByMonthChart] Full data:', JSON.stringify(monthlyData, null, 2));
        }
        
        debugLogger.info('LeadByMonthChart', 'Monthly data received', {
          hasData: !!monthlyData,
          dataLength: monthlyData?.length || 0,
          sample: monthlyData?.[0]
        });
        
        if (!monthlyData || monthlyData.length === 0) {
          console.warn('[LeadByMonthChart] No monthly data available');
          debugLogger.warn('LeadByMonthChart', 'No monthly data available');
          setChartData([]);
          return;
        }

        // Convert to chart format
        const chartData: MonthlyLeadsData[] = monthlyData.map(data => ({
          month: data.month,
          monthLabel: data.monthLabel,
          facebookLeads: data.facebookLeads || 0,
          googleLeads: data.googleLeads || 0,
          totalLeads: data.totalLeads || 0
        }));

        console.log('[LeadByMonthChart] Chart data prepared - length:', chartData.length, 'hasData:', chartData.some(d => d.totalLeads > 0));
        console.log('[LeadByMonthChart] Chart data:', JSON.stringify(chartData, null, 2));

        debugLogger.info('LeadByMonthChart', 'Chart data prepared', {
          chartDataLength: chartData.length,
          hasData: chartData.some(d => d.totalLeads > 0)
        });

        setChartData(chartData);

      } catch (err) {
        console.error('[LeadByMonthChart] Error fetching monthly leads', err);
        debugLogger.error('LeadByMonthChart', 'Failed to fetch monthly leads', err);
        setError(`Failed to load monthly leads data: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setChartData([]);
      } finally {
        setIsLoading(false);
        console.log('[LeadByMonthChart] Fetch completed', { isLoading: false });
      }
    };

    if (client) {
      fetchMonthlyLeads();
    } else {
      console.log('[LeadByMonthChart] Waiting for client data', { clientLoading });
    }
  }, [clientId, client, clientLoading]);

  // Memoize chart configuration for performance
  const chartConfig = useMemo(() => ({
    margin: { top: 10, right: 50, left: 10, bottom: 0 },
    gridStrokeDasharray: "1 4",
    lineStrokeWidth: 3,
    dotRadius: 5,
    activeDotRadius: 7
  }), []);


  // Check if we have chart data (even if all values are 0, we should show the chart)
  const hasChartData = chartData.length > 0;
  const hasNonZeroData = chartData.some(month => month.totalLeads > 0);

  console.log('[LeadByMonthChart] Render state - isLoading:', isLoading, 'clientLoading:', clientLoading, 'hasChartData:', hasChartData, 'hasNonZeroData:', hasNonZeroData, 'chartDataLength:', chartData.length, 'error:', error);
  if (chartData.length > 0) {
    console.log('[LeadByMonthChart] First 2 chart data items:', JSON.stringify(chartData.slice(0, 2), null, 2));
  }

  // Show loading state with modern spinner
  if (isLoading || clientLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-blue-600 mx-auto mb-3"></div>
            <div className="absolute inset-0 rounded-full h-8 w-8 border-4 border-transparent border-t-blue-300 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>
          <p className="text-slate-600 font-medium text-sm">Loading monthly leads...</p>
          <p className="text-slate-400 text-xs mt-1">Fetching data from connected platforms</p>
        </div>
      </div>
    );
  }

  // Show error state with retry option
  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg">
        <div className="text-center max-w-sm px-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-red-800 mb-2">Unable to Load Data</h3>
          <p className="text-red-600 text-sm mb-3">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show message if no chart data at all
  if (!hasChartData) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center max-w-sm px-4">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-slate-700 mb-2">No Lead Data Available</h3>
          <p className="text-slate-500 text-sm mb-3">No monthly data found. Connect Meta Ads or Google Ads to see monthly lead trends.</p>
          <div className="flex justify-center space-x-3 text-xs text-slate-400">
            <span className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
              Meta Ads
            </span>
            <span className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
              Google Ads
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Chart Container */}
      <div className="flex-1 p-0 min-h-0" style={{ minHeight: '200px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart 
            data={chartData} 
            margin={chartConfig.margin}
          >
            {/* Subtle grid lines */}
            <CartesianGrid 
              stroke={CHART_COLORS.grid} 
              strokeDasharray={chartConfig.gridStrokeDasharray}
              strokeOpacity={0.6}
            />
            
            {/* X-Axis with clean styling */}
            <XAxis 
              dataKey="monthLabel" 
              tick={{ 
                fontSize: 12, 
                fill: CHART_COLORS.text,
                fontWeight: 500
              }}
              tickLine={{ stroke: CHART_COLORS.grid, strokeWidth: 1 }}
              axisLine={{ stroke: CHART_COLORS.grid, strokeWidth: 1 }}
              height={40}
            />
            
            {/* Y-Axis with clean styling */}
            <YAxis 
              tick={{ 
                fontSize: 12, 
                fill: CHART_COLORS.text,
                fontWeight: 500
              }}
              tickLine={{ stroke: CHART_COLORS.grid, strokeWidth: 1 }}
              axisLine={{ stroke: CHART_COLORS.grid, strokeWidth: 1 }}
              width={50}
              tickFormatter={(value) => value.toLocaleString()}
            />
            
            {/* Custom tooltip */}
            <Tooltip content={<CustomTooltip />} />
            
            {/* Facebook Leads Line */}
            <Line 
              type="monotone" 
              dataKey="facebookLeads" 
              stroke={CHART_COLORS.facebook}
              strokeWidth={chartConfig.lineStrokeWidth}
              dot={{ 
                fill: CHART_COLORS.facebook, 
                strokeWidth: 2, 
                r: chartConfig.dotRadius,
                stroke: '#ffffff'
              }}
              activeDot={{ 
                r: chartConfig.activeDotRadius, 
                stroke: CHART_COLORS.facebook,
                strokeWidth: 3,
                fill: '#ffffff'
              }}
              connectNulls={false}
            />
            
            {/* Google Leads Line */}
            <Line 
              type="monotone" 
              dataKey="googleLeads" 
              stroke={CHART_COLORS.google}
              strokeWidth={chartConfig.lineStrokeWidth}
              dot={{ 
                fill: CHART_COLORS.google, 
                strokeWidth: 2, 
                r: chartConfig.dotRadius,
                stroke: '#ffffff'
              }}
              activeDot={{ 
                r: chartConfig.activeDotRadius, 
                stroke: CHART_COLORS.google,
                strokeWidth: 3,
                fill: '#ffffff'
              }}
              connectNulls={false}
            />
            
            {/* Total Leads Line */}
            <Line 
              type="monotone" 
              dataKey="totalLeads" 
              stroke="#6B7280"
              strokeWidth={chartConfig.lineStrokeWidth + 1}
              dot={{ 
                fill: '#6B7280', 
                strokeWidth: 2, 
                r: chartConfig.dotRadius + 1,
                stroke: '#ffffff'
              }}
              activeDot={{ 
                r: chartConfig.activeDotRadius + 1, 
                stroke: '#6B7280',
                strokeWidth: 3,
                fill: '#ffffff'
              }}
              connectNulls={false}
            />
            
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Simple Legend */}
      <div className="px-4 pt-1 pb-2 flex-shrink-0">
        <div className="flex items-center justify-center space-x-4 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-4 h-1 bg-blue-500"></div>
            <span className="text-slate-600">Meta Leads</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-4 h-1 bg-green-500"></div>
            <span className="text-slate-600">Google Leads</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-4 h-1 bg-gray-500"></div>
            <span className="text-slate-600">Total Leads</span>
          </div>
        </div>
      </div>
    </div>
  );
});