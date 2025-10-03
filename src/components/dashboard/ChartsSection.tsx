import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EventDashboardData } from "@/services/eventMetricsService";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js';
import { Line, Pie, Bar } from 'react-chartjs-2';

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface ChartsSectionProps {
  dashboardData: EventDashboardData | null;
  selectedPeriod: string;
}

// Meta Ads Daily Chart Component
const MetaAdsDailyChart: React.FC<{ data?: any }> = ({ data }) => {
  const generateDailyData = () => {
    const days = [];
    const leadsData = [];
    const spendData = [];

    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

      const totalLeads = data?.facebookMetrics?.leads || 234;
      const totalSpend = data?.facebookMetrics?.spend || 6200;
      
      const baseLeads = (totalLeads / 30) + (Math.random() - 0.5) * (totalLeads / 30) * 0.4;
      const baseSpend = (totalSpend / 30) + (Math.random() - 0.5) * (totalSpend / 30) * 0.4;

      leadsData.push(Math.max(0, Math.round(baseLeads)));
      spendData.push(Math.max(0, Math.round(baseSpend)));
    }

    return { days, leadsData, spendData };
  };

  const { days, leadsData, spendData } = generateDailyData();

  const chartData = {
    labels: days,
    datasets: [
      {
        label: 'Leads',
        data: leadsData,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        yAxisID: 'y',
      },
      {
        label: 'Spend ($)',
        data: spendData,
        borderColor: 'rgb(245, 158, 11)',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        tension: 0.4,
        yAxisID: 'y1',
      },
    ],
  };

  const options = {
    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Date'
        }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Leads'
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Spend ($)'
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Meta Ads Performance (Last 30 Days)'
      }
    }
  };

  return <Line data={chartData} options={options} />;
};

// Google Ads Daily Chart Component
const GoogleAdsDailyChart: React.FC<{ data?: any }> = ({ data }) => {
  const generateDailyData = () => {
    const days = [];
    const clicksData = [];
    const costData = [];

    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

      const totalClicks = data?.googleMetrics?.clicks || 1890;
      const totalCost = data?.googleMetrics?.cost || 4200;
      
      const baseClicks = (totalClicks / 30) + (Math.random() - 0.5) * (totalClicks / 30) * 0.3;
      const baseCost = (totalCost / 30) + (Math.random() - 0.5) * (totalCost / 30) * 0.3;

      clicksData.push(Math.max(0, Math.round(baseClicks)));
      costData.push(Math.max(0, Math.round(baseCost)));
    }

    return { days, clicksData, costData };
  };

  const { days, clicksData, costData } = generateDailyData();

  const chartData = {
    labels: days,
    datasets: [
      {
        label: 'Clicks',
        data: clicksData,
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
        yAxisID: 'y',
      },
      {
        label: 'Cost ($)',
        data: costData,
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
        yAxisID: 'y1',
      },
    ],
  };

  const options = {
    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Date'
        }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Clicks'
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Cost ($)'
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Google Ads Performance (Last 30 Days)'
      }
    }
  };

  return <Line data={chartData} options={options} />;
};

// Event Type Distribution Chart
const EventTypeChart: React.FC<{ data?: any }> = ({ data }) => {
  const eventTypes = data?.eventMetrics?.eventTypeBreakdown || [
    { type: 'Wedding', count: 45, percentage: 35 },
    { type: 'Corporate', count: 32, percentage: 25 },
    { type: 'Birthday', count: 28, percentage: 22 },
    { type: 'Anniversary', count: 15, percentage: 12 },
    { type: 'Other', count: 8, percentage: 6 }
  ];

  const chartData = {
    labels: eventTypes.map((item: any) => item.type),
    datasets: [
      {
        data: eventTypes.map((item: any) => item.count),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(147, 51, 234, 0.8)',
        ],
        borderColor: [
          'rgba(59, 130, 246, 1)',
          'rgba(34, 197, 94, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(239, 68, 68, 1)',
          'rgba(147, 51, 234, 1)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      title: {
        display: true,
        text: 'Event Type Distribution'
      }
    }
  };

  return <Pie data={chartData} options={options} />;
};

// Budget Distribution Chart
const BudgetChart: React.FC<{ data?: any }> = ({ data }) => {
  const budgetRanges = data?.eventMetrics?.budgetDistribution || [
    { range: '$0-5K', count: 25, percentage: 20 },
    { range: '$5K-10K', count: 35, percentage: 28 },
    { range: '$10K-20K', count: 40, percentage: 32 },
    { range: '$20K+', count: 25, percentage: 20 }
  ];

  const chartData = {
    labels: budgetRanges.map((item: any) => item.range),
    datasets: [
      {
        label: 'Number of Events',
        data: budgetRanges.map((item: any) => item.count),
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Number of Events'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Budget Range'
        }
      }
    },
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Event Budget Distribution'
      }
    }
  };

  return <Bar data={chartData} options={options} />;
};

export const ChartsSection: React.FC<ChartsSectionProps> = ({
  dashboardData,
  selectedPeriod
}) => {
  if (!dashboardData) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 mb-8">
      {/* Meta Ads Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Meta Ads Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <MetaAdsDailyChart data={dashboardData} />
        </CardContent>
      </Card>

      {/* Google Ads Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Google Ads Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <GoogleAdsDailyChart data={dashboardData} />
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Event Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <EventTypeChart data={dashboardData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Budget Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <BudgetChart data={dashboardData} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
