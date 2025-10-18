import {
    CHART_COLORS,
    getDefaultChartOptions
} from '@/lib/chartConfig';
import { EventDashboardData } from '@/services/data/eventMetricsService';
import React, { useEffect, useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';

interface LeadByMonthChartProps {
  data: EventDashboardData | null | undefined;
  clientId?: string; // Add clientId prop to make chart independent of dashboard data
}

interface MonthlyData {
  month: string;
  facebookLeads: number;
  googleLeads: number;
  totalLeads: number;
  facebookSpend: number;
  googleSpend: number;
  totalSpend: number;
}

export const LeadByMonthChart: React.FC<LeadByMonthChartProps> = React.memo(({ data, clientId }) => {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMonthlyData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Use clientId prop if available, otherwise fall back to data
        const actualClientId = clientId || 'client-id';
        const clientAccounts = data?.clientAccounts;
        const clientIntegrationEnabled = data?.clientIntegrationEnabled || {};

        if (!clientAccounts) {
          setMonthlyData([]);
          return;
        }

        // Import EventMetricsService dynamically
        const { EventMetricsService } = await import('@/services/data/eventMetricsService');
        
        const monthlyHistoricalData = await EventMetricsService.getMonthlyHistoricalData(
          actualClientId,
          clientAccounts,
          clientIntegrationEnabled
        );

        console.log('🔍 LeadByMonthChart: Monthly data received', monthlyHistoricalData);
        console.log('🔍 LeadByMonthChart: Data length:', monthlyHistoricalData.length);
        console.log('🔍 LeadByMonthChart: First few items:', monthlyHistoricalData.slice(0, 3));
        console.log('🔍 LeadByMonthChart: Last few items:', monthlyHistoricalData.slice(-3));
        setMonthlyData(monthlyHistoricalData);

      } catch (err) {
        console.error('❌ LeadByMonthChart: Error fetching monthly data', err);
        setError('Failed to load monthly data');
        setMonthlyData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMonthlyData();
  }, [clientId, data?.clientAccounts, data?.clientIntegrationEnabled]);

  // Generate chart data from monthly data
  const chartData = useMemo(() => {
    if (monthlyData.length === 0) {
      return {
        labels: [],
        datasets: []
      };
    }

    // Get only the last 4 months with valid data, ordered ascending (oldest to newest)
    const validMonths = monthlyData.filter(item => 
      item.month && 
      typeof item.totalLeads === 'number' && 
      typeof item.facebookLeads === 'number' && 
      typeof item.googleLeads === 'number'
    );
    const last4Months = validMonths.slice(-4); // Keep ascending order (oldest to newest)
    
    console.log('🔍 Chart data processing:', {
      totalMonths: monthlyData.length,
      validMonths: validMonths.length,
      last4Months: last4Months.length,
      last4MonthsData: last4Months.map(item => ({
        month: item.month,
        totalLeads: item.totalLeads,
        facebookLeads: item.facebookLeads,
        googleLeads: item.googleLeads
      }))
    });

        // Format month labels using proper date formatting
        const labels = last4Months.map(item => {
          const [year, month] = item.month.split('-');
          const date = new Date(parseInt(year), parseInt(month) - 1, 1);
          return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        });

        const facebookLeadsData = last4Months.map(item => item.facebookLeads);
        const googleLeadsData = last4Months.map(item => item.googleLeads);

        return {
          labels,
          datasets: [
            {
              label: 'Facebook Leads',
              data: facebookLeadsData,
              borderColor: '#1877F2', // Facebook blue
              backgroundColor: 'transparent',
              tension: 0.4,
              fill: false,
              pointBackgroundColor: '#1877F2',
              pointBorderColor: CHART_COLORS.background,
              pointBorderWidth: 2,
              pointRadius: 3, // Smaller dots
              pointHoverRadius: 5,
              borderWidth: 3,
            },
            {
              label: 'Google Leads',
              data: googleLeadsData,
              borderColor: '#34A853', // Google green
              backgroundColor: 'transparent',
              tension: 0.4,
              fill: false,
              pointBackgroundColor: '#34A853',
              pointBorderColor: CHART_COLORS.background,
              pointBorderWidth: 2,
              pointRadius: 3, // Smaller dots
              pointHoverRadius: 5,
              borderWidth: 3,
            }
          ]
        };
  }, [monthlyData]);

  const options = useMemo(() => ({
    ...getDefaultChartOptions(),
    plugins: {
      ...getDefaultChartOptions().plugins,
      title: {
        display: false // Remove the chart title since we have the card title
      },
          legend: {
            display: true,
            position: 'top' as const,
            labels: {
              usePointStyle: true,
              padding: 20
            }
          }
    },
    scales: {
      ...getDefaultChartOptions().scales,
      y: {
        ...getDefaultChartOptions().scales?.y,
        title: {
          display: false
        },
        beginAtZero: true,
        ticks: {
          padding: 20
        }
      },
      x: {
        ...getDefaultChartOptions().scales?.x,
        title: {
          display: false
        },
        ticks: {
          padding: 10
        }
      }
    },
        layout: {
          padding: {
            top: 0,
            bottom: 0,
            left: 0,
            right: 0
          }
        },
    responsive: true,
    maintainAspectRatio: false
  }), []);

  // Show loading state
  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm">Loading monthly trends...</p>
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
          <p className="text-xs mt-1">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  // Show message if no data
  if (monthlyData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-sm">No monthly data available</p>
          <p className="text-xs mt-1">Connect Facebook or Google Ads to see monthly trends</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Chart */}
      <div className="h-80">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
});

LeadByMonthChart.displayName = 'LeadByMonthChart';
