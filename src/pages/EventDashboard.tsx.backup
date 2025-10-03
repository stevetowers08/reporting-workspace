import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EventDashboardData, EventMetricsService } from "@/services/eventMetricsService";
import { PDFExportService } from "@/services/pdfExportService";
import { LeadQualityTable } from '@/components/LeadQualityTable';
import { LeadQualityMetricsComponent } from '@/components/LeadQualityMetrics';
import InsightsCard from '@/components/InsightsCard';
import AllVenuesGoogleAdsTable from '@/components/AllVenuesGoogleAdsTable';
import { LeadQualityService } from '@/services/leadQualityService';
import { LeadRecord, LeadQualityMetrics } from '@/types/dashboard';
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
import {
  BarChart3,
  Calendar,
  DollarSign,
  FileText,
  FileDown,
  Settings,
  Share2,
  Users
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
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

interface EventDashboardProps {
  isShared?: boolean;
  clientId?: string;
}

// Meta Ads Daily Chart Component
const MetaAdsDailyChart: React.FC<{ data?: any }> = ({ data }) => {
  // Use real data from dashboardData or fallback to mock data
  const generateDailyData = () => {
    const days = [];
    const leadsData = [];
    const spendData = [];

    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

      // Use real data if available, otherwise generate realistic mock data
      const totalLeads = data?.facebookMetrics?.leads || 234;
      const totalSpend = data?.facebookMetrics?.spend || 6200;
      
      // Distribute total data across 30 days with realistic variation
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
    maintainAspectRatio: false,
    layout: {
      padding: 0
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          padding: 4,
          font: {
            size: 10
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              if (context.dataset.label === 'Spend ($)') {
                label += '$' + context.parsed.y;
              } else {
                label += context.parsed.y;
              }
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Date',
          font: {
            size: 10
          }
        },
        ticks: {
          font: {
            size: 9
          }
        }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Leads',
          font: {
            size: 10
          }
        },
        beginAtZero: true,
        suggestedMax: 15,
        ticks: {
          stepSize: 2,
          font: {
            size: 9
          }
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Spend ($)',
          font: {
            size: 10
          }
        },
        beginAtZero: true,
        suggestedMax: 200,
        ticks: {
          stepSize: 40,
          font: {
            size: 9
          }
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  return <Line data={chartData} options={options} />;
};

// Platform Performance Status Chart Component
const PlatformPerformanceStatusChart: React.FC<{ data?: any }> = ({ data }) => {
  const metaLeads = data?.facebookMetrics?.leads || 234;
  const metaSpend = data?.facebookMetrics?.spend || 6200;
  const googleLeads = data?.googleMetrics?.leads || 190;
  const googleSpend = data?.googleMetrics?.cost || 6550;
  
  const totalLeads = metaLeads + googleLeads;
  const totalSpend = metaSpend + googleSpend;
  
  const metaLeadsPercentage = totalLeads > 0 ? (metaLeads / totalLeads) * 100 : 0;
  const googleLeadsPercentage = totalLeads > 0 ? (googleLeads / totalLeads) * 100 : 0;
  
  const metaSpendPercentage = totalSpend > 0 ? (metaSpend / totalSpend) * 100 : 0;
  const googleSpendPercentage = totalSpend > 0 ? (googleSpend / totalSpend) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Leads Performance */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-slate-700">Leads Distribution</h3>
          <span className="text-xs text-slate-500">{totalLeads.toLocaleString()} total leads</span>
        </div>
        
        {/* Combined Leads Progress Bar */}
        <div className="w-full bg-slate-200 rounded-full h-5 relative overflow-hidden">
          <div
            className="bg-blue-500 h-5 rounded-l-full transition-all duration-700 ease-out flex items-center justify-center"
            style={{ width: `${metaLeadsPercentage}%` }}
          >
            {metaLeadsPercentage > 20 && (
              <span className="text-xs font-normal text-white">
                ({metaLeadsPercentage.toFixed(1)}%)
              </span>
            )}
          </div>
          <div
            className="bg-red-500 h-5 rounded-r-full transition-all duration-700 ease-out absolute top-0 flex items-center justify-center"
            style={{
              width: `${googleLeadsPercentage}%`,
              left: `${metaLeadsPercentage}%`
            }}
          >
            {googleLeadsPercentage > 20 && (
              <span className="text-xs font-normal text-white">
                ({googleLeadsPercentage.toFixed(1)}%)
              </span>
            )}
          </div>
        </div>
        
        {/* Labels */}
        <div className="flex justify-between items-center mt-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span className="text-xs font-medium text-slate-700">Meta Ads</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span className="text-xs font-medium text-slate-700">Google Ads</span>
          </div>
        </div>
      </div>
      
      {/* Spend Performance */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-slate-700">Spend Distribution</h3>
          <span className="text-xs text-slate-500">${totalSpend.toLocaleString()} total spend</span>
        </div>
        
        {/* Combined Spend Progress Bar */}
        <div className="w-full bg-slate-200 rounded-full h-5 relative overflow-hidden">
          <div
            className="bg-blue-500 h-5 rounded-l-full transition-all duration-700 ease-out flex items-center justify-center"
            style={{ width: `${metaSpendPercentage}%` }}
          >
            {metaSpendPercentage > 20 && (
              <span className="text-xs font-normal text-white">
                ({metaSpendPercentage.toFixed(1)}%)
              </span>
            )}
          </div>
          <div
            className="bg-red-500 h-5 rounded-r-full transition-all duration-700 ease-out absolute top-0 flex items-center justify-center"
            style={{
              width: `${googleSpendPercentage}%`,
              left: `${metaSpendPercentage}%`
            }}
          >
            {googleSpendPercentage > 20 && (
              <span className="text-xs font-normal text-white">
                ({googleSpendPercentage.toFixed(1)}%)
              </span>
            )}
          </div>
        </div>
        
        {/* Labels */}
        <div className="flex justify-between items-center mt-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span className="text-xs font-medium text-slate-700">Meta Ads</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span className="text-xs font-medium text-slate-700">Google Ads</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Lead by Day Chart Component
const LeadByDayChart: React.FC<{ data?: any }> = () => {
  // Generate daily data for the last 30 days
  const generateDailyData = () => {
    const days = [];
    const leadsData = [];

    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

      // Generate realistic daily data with some variation and trends
      const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const baseLeads = isWeekend ? 8 + Math.random() * 4 : 12 + Math.random() * 8; // Lower on weekends
      leadsData.push(Math.round(baseLeads));
    }

    return { days, leadsData };
  };

  const { days, leadsData } = generateDailyData();
  const totalLeads = leadsData.reduce((sum, leads) => sum + leads, 0);
  const avgDailyLeads = (totalLeads / leadsData.length).toFixed(1);

  const chartData = {
    labels: days,
    datasets: [
      {
        label: 'Daily Leads',
        data: leadsData,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
        tension: 0.3,
        fill: true,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: 'white',
        pointBorderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
        borderWidth: 2,
      }
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 10,
        bottom: 10,
        left: 5,
        right: 5
      }
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        titleFont: {
          size: 12,
          weight: 'bold'
        },
        bodyFont: {
          size: 11
        },
        callbacks: {
          title: function(context: any) {
            return context[0].label;
          },
          label: function (context: any) {
            return `${context.parsed.y} leads`;
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 9
          },
          color: '#64748b',
          maxTicksLimit: 7,
          callback: function(value: any, index: any) {
            // Show every 4th day to avoid crowding
            return index % 4 === 0 ? this.getLabelForValue(value) : '';
          }
        }
      },
      y: {
        display: true,
        beginAtZero: true,
        grid: {
          color: 'rgba(148, 163, 184, 0.1)',
          drawBorder: false
        },
        ticks: {
          font: {
            size: 9
          },
          color: '#64748b',
          stepSize: 5,
          callback: function(value: any) {
            return value;
          }
        }
      }
    }
  };

  return (
    <div>
      {/* Chart Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <div className="text-sm font-medium text-slate-700">Daily Lead Trends</div>
          <div className="text-xs text-slate-500">Last 30 days</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-blue-600">{totalLeads}</div>
          <div className="text-xs text-slate-500">Total • {avgDailyLeads} avg/day</div>
        </div>
      </div>
      
                  {/* Chart */}
                  <div className="h-48">
                    <Line data={chartData} options={options} />
                  </div>
    </div>
  );
};

// Google Ads Daily Chart Component
const GoogleAdsDailyChart: React.FC<{ data?: any }> = ({ data }) => {
  // Use real data from dashboardData or fallback to mock data
  const generateDailyData = () => {
    const days = [];
    const leadsData = [];
    const spendData = [];

    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

      // Use real data if available, otherwise generate realistic mock data
      const totalLeads = data?.googleMetrics?.leads || 190;
      const totalSpend = data?.googleMetrics?.cost || 6550;
      
      // Distribute total data across 30 days with realistic variation
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
        borderColor: 'rgb(220, 38, 38)',
        backgroundColor: 'rgba(220, 38, 38, 0.1)',
        tension: 0.4,
        yAxisID: 'y',
      },
      {
        label: 'Spend ($)',
        data: spendData,
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
        yAxisID: 'y1',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              if (context.dataset.label === 'Spend ($)') {
                label += '$' + context.parsed.y;
              } else {
                label += context.parsed.y;
              }
            }
            return label;
          }
        }
      }
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
        },
        beginAtZero: true,
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Spend ($)'
        },
        beginAtZero: true,
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  return <Line data={chartData} options={options} />;
};

// Lead Quality Tab Content Component
const LeadQualityTabContent: React.FC = () => {
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [leadMetrics, setLeadMetrics] = useState<LeadQualityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<LeadRecord | null>(null);

  useEffect(() => {
    loadLeadData();
  }, []);

  const loadLeadData = async () => {
    setLoading(true);
    try {
      // For now, use mock data. In production, this would fetch from your data source
      const mockLeads = LeadQualityService.getMockLeadData();
      setLeads(mockLeads);
      
      const metrics = LeadQualityService.generateLeadQualityMetrics(mockLeads);
      setLeadMetrics(metrics);
    } catch (error) {
      console.error('Error loading lead data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLeadSelect = (lead: LeadRecord) => {
    setSelectedLead(lead);
    // You could open a modal or navigate to a detail view here
    console.log('Selected lead:', lead);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading lead quality data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metrics Overview */}
      {leadMetrics && (
        <LeadQualityMetricsComponent metrics={leadMetrics} />
      )}

      {/* Lead Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Lead Quality Analysis</h3>
            <p className="text-sm text-gray-600">Detailed view of all leads with quality scoring and filtering</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              Import Leads
            </Button>
            <Button variant="outline" size="sm">
              Export Report
            </Button>
          </div>
        </div>
        
        <LeadQualityTable 
          leads={leads} 
          onLeadSelect={handleLeadSelect}
        />
      </Card>

      {/* Lead Detail Modal/View could go here */}
      {selectedLead && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Lead Details</h3>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setSelectedLead(null)}
            >
              Close
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Contact Information</h4>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Name:</span> {selectedLead.name}</p>
                <p><span className="font-medium">Email:</span> {selectedLead.email}</p>
                <p><span className="font-medium">Phone:</span> {selectedLead.phone}</p>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Event Information</h4>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Event Type:</span> {selectedLead.eventType}</p>
                <p><span className="font-medium">Event Date:</span> {selectedLead.eventDate}</p>
                <p><span className="font-medium">Event Time:</span> {selectedLead.eventTime}</p>
                <p><span className="font-medium">Budget:</span> ${selectedLead.budget.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

const EventDashboard: React.FC<EventDashboardProps> = ({ isShared = false, clientId }) => {
  const [selectedPeriod, setSelectedPeriod] = useState("30d");
  const [activeTab, setActiveTab] = useState("summary");
  const [dashboardData, setDashboardData] = useState<EventDashboardData | null>(null);

  const [loading, setLoading] = useState(true);
  const [clientData, setClientData] = useState<any>(null);
  const [availableClients, setAvailableClients] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [exportingPDF, setExportingPDF] = useState(false);
  const clientsLoadedRef = useRef(false);

  // Get client ID from URL if not provided as prop
  const actualClientId = useMemo(() => {
    // Only extract client ID if we're actually on a share URL
    if (window.location.pathname.startsWith('/share/')) {
      const urlClientId = window.location.pathname.split('/share/')[1];
      return clientId || urlClientId;
    }
    // For main dashboard, only use clientId prop if provided
    return clientId;
  }, [clientId]);

  const loadAvailableClients = async (forceRefresh = false) => {
    if (clientsLoadedRef.current && !forceRefresh) return;

    console.log('Loading available clients...');
    try {
      const { DatabaseService } = await import('@/services/databaseService');
      const clients = await DatabaseService.getAllClients();
      console.log('Available clients loaded:', clients.length, clients);
      
      // Add ALL VENUES as the first option
      const allVenuesClient = {
        id: 'all_venues',
        name: 'ALL VENUES',
        logo_url: null,
        accounts: {
          facebookAds: 'all',
          googleAds: 'all', 
          goHighLevel: 'all',
          googleSheets: 'all'
        },
        conversionActions: []
      };
      
      setAvailableClients([allVenuesClient, ...clients]);
      clientsLoadedRef.current = true;
      setLoading(false); // Stop loading when clients are loaded
    } catch (error) {
      console.error('Error loading available clients:', error);
      setAvailableClients([]);
      setLoading(false); // Stop loading even on error
    }
  };

  useEffect(() => {
    loadClientData();
    // Always load available clients to ensure the dropdown is populated
    loadAvailableClients();
  }, [actualClientId]);

  // Set default client to ALL VENUES when clients are loaded
  useEffect(() => {
    if (availableClients.length > 0 && !clientData) {
      const allVenuesClient = availableClients.find(c => c.id === 'all_venues');
      if (allVenuesClient) {
        setClientData(allVenuesClient);
        setActiveTab("summary"); // Set default tab for ALL VENUES
      }
    }
  }, [availableClients, clientData]);

  // Listen for storage events and custom events to refresh client list when new clients are added
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'clients' && e.newValue) {
        console.log('Client list updated via storage, refreshing...');
        loadAvailableClients(true);
      }
    };

    const handleClientAdded = (e: CustomEvent) => {
      console.log('New client added via custom event, refreshing...', e.detail);
      loadAvailableClients(true);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('clientAdded', handleClientAdded as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('clientAdded', handleClientAdded as EventListener);
    };
  }, []);

  useEffect(() => {
    if (clientData) {
      loadDashboardData();
    }
  }, [selectedPeriod, clientData]);

  const loadClientData = async () => {
    console.log('Loading client data for ID:', actualClientId);
    setError(null); // Clear any previous errors

    if (!actualClientId) {
      console.log('No client ID provided, will show client selector');
      // Don't set default venue, let user choose
      setClientData(null);
      setLoading(false);
      return;
    }

    try {
      const { DatabaseService } = await import('@/services/databaseService');
      console.log('Fetching client from database:', actualClientId);
      const client = await DatabaseService.getClientById(actualClientId);
      console.log('Client data from database:', client);

      if (client) {
        console.log('Client loaded successfully:', {
          id: client.id,
          name: client.name,
          logo_url: client.logo_url,
          hasLogo: !!client.logo_url
        });
        setClientData(client);
        setError(null);
      } else {
        console.log('Client not found in database');
        setClientData(null);
        if (isShared) {
          setError(`Client with ID "${actualClientId}" not found. The share link may be invalid or the client may have been deleted.`);
        }
      }
    } catch (error) {
      console.error('Error loading client data:', error);
      setClientData(null);
      if (isShared) {
        setError(`Failed to load client data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper function to format date range for display
  const formatDateRange = (period: string) => {
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    };

    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  const loadDashboardData = async () => {
    if (!clientData) return;
    
    setLoading(true);
    try {
      // Calculate date range based on selected period
      const endDate = new Date();
      const startDate = new Date();

      switch (selectedPeriod) {
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
        default:
          startDate.setDate(startDate.getDate() - 30);
      }

      const dateRange = {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      };

      // Check if this is the ALL VENUES client
      if (clientData.id === 'all_venues') {
        console.log('Loading aggregated data for all venues...');
        console.log('Available clients:', availableClients);
        console.log('Date range:', dateRange);

        // Create aggregated mock data for all venues
        const aggregatedData = getAggregatedMockData(availableClients.filter(c => c.id !== 'all_venues'));
        console.log('Aggregated dashboard data loaded:', aggregatedData);
        setDashboardData(aggregatedData);
      } else {
        // Fetch real data from EventMetricsService with client-specific filtering
        console.log('Loading dashboard data for client:', clientData);
        console.log('Date range:', dateRange);
        console.log('Client accounts:', clientData.accounts);

        const data = await EventMetricsService.getComprehensiveMetrics(clientData.id, dateRange, clientData.accounts, clientData.conversionActions);
        console.log('Dashboard data loaded:', data);
        setDashboardData(data);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Fallback to mock data if real data fails
      if (clientData.id === 'all_venues') {
        const mockData = getAggregatedMockData(availableClients.filter(c => c.id !== 'all_venues'));
        setDashboardData(mockData);
      } else {
        const mockData = getMockDashboardData(clientData?.accounts);
        setDashboardData(mockData);
      }
    } finally {
      setLoading(false);
    }
  };

  const getAggregatedMockData = (clients: any[]): EventDashboardData => {
    // Aggregate data from all clients
    let totalLeads = 0;
    let totalSpend = 0;
    let totalRevenue = 0;
    let facebookLeads = 0;
    let facebookSpend = 0;
    let googleLeads = 0;
    let googleSpend = 0;
    let totalEvents = 0;
    let totalContacts = 0;
    let totalOpportunities = 0;
    let wonOpportunities = 0;
    let pipelineValue = 0;

    // Sum up data from all clients
    clients.forEach(client => {
      const hasFacebookAds = client.accounts?.facebookAds && client.accounts.facebookAds !== 'none';
      const hasGoogleAds = client.accounts?.googleAds && client.accounts.googleAds !== 'none';
      const hasGoHighLevel = client.accounts?.goHighLevel && client.accounts.goHighLevel !== 'none';
      const hasGoogleSheets = client.accounts?.googleSheets && client.accounts.googleSheets !== 'none';

      if (hasFacebookAds) {
        facebookLeads += 234;
        facebookSpend += 6200;
      }
      if (hasGoogleAds) {
        googleLeads += 190;
        googleSpend += 6550;
      }
      if (hasGoHighLevel) {
        totalRevenue += 285000;
        totalContacts += 156;
        totalOpportunities += 89;
        wonOpportunities += 34;
        pipelineValue += 285000;
      }
      if (hasGoogleSheets) {
        totalEvents += 45;
      }
    });

    totalLeads = facebookLeads + googleLeads;
    totalSpend = facebookSpend + googleSpend;

    return {
      totalLeads,
      totalSpend,
      totalRevenue,
      roi: totalSpend > 0 ? (totalRevenue / totalSpend) * 100 : 0,
      facebookMetrics: {
        impressions: facebookLeads * 800, // Rough estimate
        clicks: facebookLeads * 15,
        spend: facebookSpend,
        leads: facebookLeads,
        conversions: facebookLeads,
        ctr: 1.87,
        cpc: facebookLeads > 0 ? facebookSpend / (facebookLeads * 15) : 0,
        cpm: 33.15,
        roas: 0,
        reach: facebookLeads * 290,
        frequency: 2.75,
        costPerLead: facebookLeads > 0 ? facebookSpend / facebookLeads : 0
      },
      googleMetrics: {
        impressions: googleLeads * 700, // Rough estimate
        clicks: googleLeads * 15,
        cost: googleSpend,
        leads: googleLeads,
        conversions: googleLeads,
        ctr: 2.12,
        cpc: googleLeads > 0 ? googleSpend / (googleLeads * 15) : 0,
        conversionRate: 6.69,
        costPerConversion: googleLeads > 0 ? googleSpend / googleLeads : 0,
        searchImpressionShare: 82.3,
        qualityScore: 8.1,
        costPerLead: googleLeads > 0 ? googleSpend / googleLeads : 0
      },
      ghlMetrics: {
        totalContacts,
        newContacts: totalContacts,
        totalOpportunities,
        wonOpportunities,
        lostOpportunities: totalOpportunities - wonOpportunities,
        pipelineValue,
        avgDealSize: wonOpportunities > 0 ? pipelineValue / wonOpportunities : 0,
        conversionRate: totalOpportunities > 0 ? (wonOpportunities / totalOpportunities) * 100 : 0,
        responseTime: 12
      },
      eventMetrics: {
        totalEvents,
        averageGuests: 125,
        totalSubmissions: totalEvents * 20,
        eventTypeBreakdown: [
          { type: "Wedding", count: Math.round(totalEvents * 0.4), percentage: 40.0, avgGuests: 150 },
          { type: "Corporate", count: Math.round(totalEvents * 0.27), percentage: 26.7, avgGuests: 85 },
          { type: "Birthday", count: Math.round(totalEvents * 0.18), percentage: 17.8, avgGuests: 45 },
          { type: "Anniversary", count: Math.round(totalEvents * 0.09), percentage: 8.9, avgGuests: 65 },
          { type: "Other", count: Math.round(totalEvents * 0.07), percentage: 6.7, avgGuests: 35 }
        ],
        budgetDistribution: [
          { range: "$5,000-$10,000", count: Math.round(totalEvents * 0.33), percentage: 33.3 },
          { range: "$10,000-$20,000", count: Math.round(totalEvents * 0.4), percentage: 40.0 },
          { range: "$20,000-$50,000", count: Math.round(totalEvents * 0.2), percentage: 20.0 },
          { range: "$50,000+", count: Math.round(totalEvents * 0.07), percentage: 6.7 }
        ]
      },
      leadMetrics: {
        facebookCostPerLead: facebookLeads > 0 ? facebookSpend / facebookLeads : 0,
        googleCostPerLead: googleLeads > 0 ? googleSpend / googleLeads : 0,
        overallCostPerLead: totalLeads > 0 ? totalSpend / totalLeads : 0,
        leadToOpportunityRate: totalLeads > 0 ? (totalOpportunities / totalLeads) * 100 : 0,
        opportunityToWinRate: totalOpportunities > 0 ? (wonOpportunities / totalOpportunities) * 100 : 0,
        averageEventValue: wonOpportunities > 0 ? pipelineValue / wonOpportunities : 0,
        averageGuestsPerEvent: 125,
        seasonalTrends: [
          { month: "Jan", leads: Math.round(totalLeads * 0.15), events: Math.round(totalEvents * 0.18), revenue: Math.round(totalRevenue * 0.15) },
          { month: "Feb", leads: Math.round(totalLeads * 0.17), events: Math.round(totalEvents * 0.2), revenue: Math.round(totalRevenue * 0.17) },
          { month: "Mar", leads: Math.round(totalLeads * 0.16), events: Math.round(totalEvents * 0.16), revenue: Math.round(totalRevenue * 0.16) },
          { month: "Apr", leads: Math.round(totalLeads * 0.2), events: Math.round(totalEvents * 0.22), revenue: Math.round(totalRevenue * 0.2) },
          { month: "May", leads: Math.round(totalLeads * 0.22), events: Math.round(totalEvents * 0.24), revenue: Math.round(totalRevenue * 0.22) },
          { month: "Jun", leads: Math.round(totalLeads * 0.24), events: Math.round(totalEvents * 0.27), revenue: Math.round(totalRevenue * 0.24) }
        ],
        formCompletionRate: 78.5,
        landingPageConversionRate: 4.2,
        mostPopularEventType: "Wedding",
        leadSourceBreakdown: [
          ...(facebookLeads > 0 ? [{ source: "Meta Ads", leads: facebookLeads, percentage: (facebookLeads / totalLeads) * 100, costPerLead: facebookLeads > 0 ? facebookSpend / facebookLeads : 0, conversionRate: 6.7 }] : []),
          ...(googleLeads > 0 ? [{ source: "Google Ads", leads: googleLeads, percentage: (googleLeads / totalLeads) * 100, costPerLead: googleLeads > 0 ? googleSpend / googleLeads : 0, conversionRate: 6.69 }] : [])
        ]
      },
      dateRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      }
    };
  };

  const getMockDashboardData = (clientAccounts?: { facebookAds?: string; googleAds?: string; goHighLevel?: string; googleSheets?: string }): EventDashboardData => {
    // Check which accounts are connected
    const hasFacebookAds = clientAccounts?.facebookAds && clientAccounts.facebookAds !== 'none';
    const hasGoogleAds = clientAccounts?.googleAds && clientAccounts.googleAds !== 'none';
    const hasGoHighLevel = clientAccounts?.goHighLevel && clientAccounts.goHighLevel !== 'none';
    const hasGoogleSheets = clientAccounts?.googleSheets && clientAccounts.googleSheets !== 'none';

    return {
      totalLeads: (hasFacebookAds ? 234 : 0) + (hasGoogleAds ? 190 : 0), // Only count connected platforms
      totalSpend: (hasFacebookAds ? 6200 : 0) + (hasGoogleAds ? 6550 : 0),
      totalRevenue: hasGoHighLevel ? 285000 : 0,
      roi: 38.0,
      facebookMetrics: hasFacebookAds ? {
        impressions: 187000,
        clicks: 3490,
        spend: 6200,
        leads: 234,
        conversions: 234,
        ctr: 1.87,
        cpc: 1.78,
        cpm: 33.15,
        roas: 0,
        reach: 68000,
        frequency: 2.75,
        costPerLead: 26.50
      } : { impressions: 0, clicks: 0, spend: 0, leads: 0, conversions: 0, ctr: 0, cpc: 0, cpm: 0, roas: 0, reach: 0, frequency: 0, costPerLead: 0 },
      googleMetrics: hasGoogleAds ? {
        impressions: 134000,
        clicks: 2840,
        cost: 6550,
        leads: 190,
        conversions: 190,
        ctr: 2.12,
        cpc: 2.31,
        conversionRate: 6.69,
        costPerConversion: 34.47,
        searchImpressionShare: 82.3,
        qualityScore: 8.1,
        costPerLead: 34.47
      } : { impressions: 0, clicks: 0, cost: 0, leads: 0, conversions: 0, ctr: 0, cpc: 0, conversionRate: 0, costPerConversion: 0, searchImpressionShare: 0, qualityScore: 0, costPerLead: 0 },
      ghlMetrics: hasGoHighLevel ? {
        totalContacts: 156,
        newContacts: 156,
        totalOpportunities: 89,
        wonOpportunities: 34,
        lostOpportunities: 21,
        pipelineValue: 285000,
        avgDealSize: 8382,
        conversionRate: 38.2,
        responseTime: 12
      } : { totalContacts: 0, newContacts: 0, totalOpportunities: 0, wonOpportunities: 0, lostOpportunities: 0, pipelineValue: 0, avgDealSize: 0, conversionRate: 0, responseTime: 0 },
      eventMetrics: hasGoogleSheets ? {
        totalEvents: 45,
        averageGuests: 125,
        totalSubmissions: 892,
        eventTypeBreakdown: [
          { type: "Wedding", count: 18, percentage: 40.0, avgGuests: 150 },
          { type: "Corporate", count: 12, percentage: 26.7, avgGuests: 85 },
          { type: "Birthday", count: 8, percentage: 17.8, avgGuests: 45 },
          { type: "Anniversary", count: 4, percentage: 8.9, avgGuests: 65 },
          { type: "Other", count: 3, percentage: 6.7, avgGuests: 35 }
        ],
        budgetDistribution: [
          { range: "$5,000-$10,000", count: 15, percentage: 33.3 },
          { range: "$10,000-$20,000", count: 18, percentage: 40.0 },
          { range: "$20,000-$50,000", count: 9, percentage: 20.0 },
          { range: "$50,000+", count: 3, percentage: 6.7 }
        ]
      } : { totalEvents: 0, averageGuests: 0, totalSubmissions: 0, eventTypeBreakdown: [], budgetDistribution: [] },
      leadMetrics: {
        facebookCostPerLead: hasFacebookAds ? 26.50 : 0,
        googleCostPerLead: hasGoogleAds ? 34.47 : 0,
        overallCostPerLead: 30.1,
        leadToOpportunityRate: 21.0,
        opportunityToWinRate: 38.2,
        averageEventValue: 8382,
        averageGuestsPerEvent: 125,
        seasonalTrends: [
          { month: "Jan", leads: 45, events: 8, revenue: 67000 },
          { month: "Feb", leads: 52, events: 9, revenue: 78000 },
          { month: "Mar", leads: 48, events: 7, revenue: 72000 },
          { month: "Apr", leads: 61, events: 10, revenue: 91000 },
          { month: "May", leads: 67, events: 11, revenue: 100000 },
          { month: "Jun", leads: 73, events: 12, revenue: 109000 }
        ],
        formCompletionRate: 78.5,
        landingPageConversionRate: 4.2,
        mostPopularEventType: "Wedding",
        leadSourceBreakdown: [
          ...(hasFacebookAds ? [{ source: "Meta Ads", leads: 234, percentage: 55.2, costPerLead: 26.50, conversionRate: 6.7 }] : []),
          ...(hasGoogleAds ? [{ source: "Google Ads", leads: 190, percentage: 44.8, costPerLead: 34.47, conversionRate: 6.69 }] : [])
        ]
      },
      dateRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      }
    };
  };

  const handleShareLink = () => {
    const shareUrl = `${window.location.origin}/share/${clientData?.id || 'venue1'}`;
    navigator.clipboard.writeText(shareUrl);
    // You could show a toast notification here
    alert('Share link copied to clipboard!');
  };

  const handleExportPDF = async () => {
    if (!dashboardData || !clientData) {
      alert('No data available to export. Please wait for the dashboard to load.');
      return;
    }

    setExportingPDF(true);
    try {
      const dateRange = `${selectedPeriod === '7d' ? 'Last 7 days' : selectedPeriod === '30d' ? 'Last 30 days' : 'Last 90 days'}`;
      
      console.log('Starting PDF export with data:', {
        clientName: clientData.name,
        dashboardDataKeys: Object.keys(dashboardData),
        facebookMetrics: dashboardData.facebookMetrics,
        googleMetrics: dashboardData.googleMetrics,
        eventMetrics: dashboardData.eventMetrics
      });
      
      await PDFExportService.exportDashboardToPDF(dashboardData, {
        clientName: clientData.name,
        logoUrl: clientData.logo_url,
        dateRange: dateRange,
        includeCharts: true,
        includeDetailedMetrics: true
      });

      alert('PDF exported successfully!');
    } catch (error) {
      console.error('PDF export failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to export PDF: ${errorMessage}`);
    } finally {
      setExportingPDF(false);
    }
  };

  const handleClientSelect = (client: any) => {
    setClientData(client);
    // Set appropriate default tab based on client type
    if (client.id === 'all_venues') {
      setActiveTab("summary");
    } else {
      setActiveTab("summary");
    }
    // Update URL to reflect selected client
    window.history.pushState({}, '', `/share/${client.id}`);
  };

  if (loading) {
    return (
      <div className="page-bg-light flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error state for share links that fail to load
  if (isShared && error && !clientData) {
    return (
      <div className="page-bg-light flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white rounded-lg shadow-sm border border-red-200 p-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Share Link Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="space-y-2 text-sm text-gray-500">
              <p>• The client may have been deleted</p>
              <p>• The share link may be incorrect</p>
              <p>• There may be a temporary server issue</p>
            </div>
            <div className="mt-6">
              <Button
                onClick={() => window.location.href = '/'}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Go to Main Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-100 min-h-screen">

      {/* Top Header Bar - Hidden when shared */}
      {!isShared && (
        <div className="bg-slate-700 text-white px-6 py-4">
          <div className="max-w-full mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <BarChart3 className="h-6 w-6" />
                <span className="text-heading">
                  {clientData ? clientData.name : 'Event Dashboard'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <select
                    value={clientData?.id || 'all_venues'}
                    onChange={(e) => {
                      const selectedClient = availableClients.find(c => c.id === e.target.value);
                      if (selectedClient) {
                        setClientData(selectedClient);
                        // Set appropriate default tab based on client type
                        if (selectedClient.id === 'all_venues') {
                          setActiveTab("summary");
                        } else {
                          setActiveTab("summary");
                        }
                      }
                    }}
                    className="appearance-none px-4 py-2 pr-8 bg-white text-slate-900 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-blue-300 font-medium shadow-sm min-w-[180px]"
                  >
                    {availableClients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-blue-700"
                  onClick={() => loadAvailableClients(true)}
                  title="Refresh venue list"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-blue-700"
                  onClick={() => window.location.href = '/admin'}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Admin Panel
                </Button>
                {clientData && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-blue-700"
                      onClick={handleShareLink}
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Share Link
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-blue-700"
                      onClick={handleExportPDF}
                      disabled={exportingPDF}
                    >
                      <FileDown className="h-4 w-4 mr-2" />
                      {exportingPDF ? 'Exporting...' : 'Export PDF'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header Section - Properly Sized */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-full mx-auto px-12 py-4">
          <div className="flex items-center justify-between relative">
            <div className="flex items-center gap-4">
              {/* Client Logo */}
              {clientData?.logo_url ? (
                <img
                  src={clientData.logo_url}
                  alt={`${clientData.name} logo`}
                  className="w-12 h-12 object-cover rounded-lg border border-slate-200 shadow-sm"
                  onError={(e) => {
                    console.error('Logo failed to load:', clientData.logo_url);
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                  onLoad={() => {
                    console.log('Logo loaded successfully:', clientData.logo_url);
                  }}
                />
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-lg font-bold text-slate-800">{clientData?.name || 'Event Dashboard'}</h1>
                {clientData && (
                  <p className="text-sm text-slate-600">{formatDateRange(selectedPeriod)}</p>
                )}
              </div>
            </div>

            {/* Centered Reporting Dashboard Text */}
            <div className="absolute left-1/2 transform -translate-x-1/2">
              <h2 className="text-xl text-gray-800 font-semibold">Reporting Dashboard</h2>
            </div>

            {/* Controls */}
            {clientData && (
              <div className="flex items-center gap-3">
                {/* Period Selector */}
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - Only show when client is selected */}
      {clientData ? (
        <div className="px-12 py-4">
          <div className="max-w-full mx-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              {/* Modern Tabs - Refined Design */}
              <div className="bg-slate-50 border-b border-slate-200 -mx-4 -mt-4 mb-4 flex-shrink-0">
                <div className="max-w-full mx-auto px-12 py-2 flex justify-center">
                  <TabsList className="w-3/5 justify-center bg-white rounded-lg p-1 h-10 border border-slate-200 shadow-sm">
                    {clientData?.id === 'all_venues' ? (
                      <>
                        <TabsTrigger value="summary" className="text-sm font-medium px-4 py-2 rounded-md flex-1 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition-all duration-200">
                      Summary
                    </TabsTrigger>
                        <TabsTrigger value="facebook-all" className="text-sm font-medium px-4 py-2 rounded-md flex-1 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition-all duration-200 flex items-center gap-2">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/>
                            <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
                          </svg>
                      Meta Ads
                    </TabsTrigger>
                        <TabsTrigger value="google-all" className="text-sm font-medium px-4 py-2 rounded-md flex-1 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition-all duration-200">
                      Google Ads
                    </TabsTrigger>
                        <TabsTrigger value="event-sales-all" className="text-sm font-medium px-4 py-2 rounded-md flex-1 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition-all duration-200">
                      Event Sales
                    </TabsTrigger>
                        <TabsTrigger value="lead-quality-all" className="text-sm font-medium px-4 py-2 rounded-md flex-1 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition-all duration-200">
                      Lead Quality
                    </TabsTrigger>
                      </>
                    ) : (
                      <>
                        <TabsTrigger value="summary" className="text-sm font-medium px-4 py-2 rounded-md flex-1 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition-all duration-200">
                          Summary
                        </TabsTrigger>
                        <TabsTrigger value="facebook" className="text-sm font-medium px-4 py-2 rounded-md flex-1 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition-all duration-200">
                          Meta Ads
                        </TabsTrigger>
                        <TabsTrigger value="google" className="text-sm font-medium px-4 py-2 rounded-md flex-1 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition-all duration-200">
                          Google Ads
                        </TabsTrigger>
                        <TabsTrigger value="event-sales" className="text-sm font-medium px-4 py-2 rounded-md flex-1 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition-all duration-200">
                          Event Sales
                        </TabsTrigger>
                        <TabsTrigger value="lead-quality" className="text-sm font-medium px-4 py-2 rounded-md flex-1 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition-all duration-200">
                          Lead Quality
                        </TabsTrigger>
                      </>
                    )}
                  </TabsList>
                </div>
              </div>
              {/* Summary Tab */}
              <TabsContent value="summary" className="mt-0">
                {/* Summary Overview - Key Metrics Row */}
                <div className="mb-6">
                  <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-5 mb-4">
                    <Card className="bg-white border border-slate-200 shadow-sm p-6 h-32">
                      <div className="flex flex-col justify-between h-full">
                        <div>
                          <p className="text-sm font-medium text-slate-600 mb-2">LEADS</p>
                          <div className="flex items-baseline gap-2 mb-2">
                            <p className="text-4xl font-bold text-slate-900">{dashboardData?.totalLeads || '0'}</p>
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-green-600 font-medium">↑ +18.5%</span>
                            </div>
                          </div>
                          <div className="text-xs text-slate-500">
                            Meta: {dashboardData?.facebookMetrics?.leads || '0'} • Google: {dashboardData?.googleMetrics?.leads || '0'}
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="bg-white border border-slate-200 shadow-sm p-6 h-32">
                      <div className="flex flex-col justify-between h-full">
                        <div>
                          <p className="text-sm font-medium text-slate-600 mb-2">COST PER LEAD</p>
                          <div className="flex items-baseline gap-2 mb-2">
                            <p className="text-4xl font-bold text-slate-900">${dashboardData?.leadMetrics?.overallCostPerLead?.toFixed(2) || '0.00'}</p>
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-red-600 font-medium">↓ -5.2%</span>
                            </div>
                          </div>
                          <div className="text-xs text-slate-500">
                            Meta: ${dashboardData?.facebookMetrics?.costPerLead?.toFixed(2) || '0.00'} • Google: ${dashboardData?.googleMetrics?.costPerLead?.toFixed(2) || '0.00'}
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="bg-white border border-slate-200 shadow-sm p-6 h-32">
                      <div className="flex flex-col justify-between h-full">
                        <div>
                          <p className="text-sm font-medium text-slate-600 mb-2">AMOUNT SPENT</p>
                          <div className="flex items-baseline gap-2 mb-2">
                            <p className="text-4xl font-bold text-slate-900">${dashboardData?.totalSpend?.toLocaleString() || '0'}</p>
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-green-600 font-medium">↑ +5.2%</span>
                            </div>
                          </div>
                          <div className="text-xs text-slate-500">
                            Meta: ${dashboardData?.facebookMetrics?.spend?.toLocaleString() || '0'} • Google: ${dashboardData?.googleMetrics?.cost?.toLocaleString() || '0'}
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="bg-white border border-slate-200 shadow-sm p-6 h-32">
                      <div className="flex flex-col justify-between h-full">
                        <div>
                          <p className="text-sm font-medium text-slate-600 mb-2">CONV %</p>
                          <div className="flex items-baseline gap-2 mb-2">
                            <p className="text-4xl font-bold text-slate-900">{dashboardData?.leadMetrics?.leadToOpportunityRate?.toFixed(1) || '0.0'}%</p>
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-green-600 font-medium">↑ +3.1%</span>
                            </div>
                          </div>
                          <div className="text-xs text-slate-500">
                            {dashboardData?.leadMetrics?.totalOpportunities || '0'} opportunities from {dashboardData?.totalLeads || '0'} leads
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="bg-white border border-slate-200 shadow-sm p-6 h-32">
                      <div className="flex flex-col justify-between h-full">
                        <div>
                          <p className="text-sm font-medium text-slate-600 mb-2">WON</p>
                          <div className="flex items-baseline gap-2 mb-2">
                            <p className="text-4xl font-bold text-green-600">{dashboardData?.ghlMetrics?.wonOpportunities || '0'}</p>
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-green-600 font-medium">↑ +12.8%</span>
                            </div>
                          </div>
                          <div className="text-xs text-slate-500">
                            ${dashboardData?.ghlMetrics?.wonRevenue?.toLocaleString() || '0'} in closed revenue
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>

                {/* Platform Performance Chart */}
                <div className="grid gap-6 grid-cols-1 lg:grid-cols-3 mb-6">
                  <Card className="bg-white border border-slate-200 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg font-semibold text-slate-900">Platform Performance Status</CardTitle>
                    </CardHeader>
                    <CardContent className="h-64">
                      <PlatformPerformanceStatusChart data={dashboardData} />
                    </CardContent>
                  </Card>

                  <Card className="bg-white border border-slate-200 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg font-semibold text-slate-900">Leads by Day</CardTitle>
                    </CardHeader>
                    <CardContent className="h-64">
                      <LeadByDayChart />
                    </CardContent>
                  </Card>

                  {/* Simplified Insights */}
                  <Card className="bg-white border border-slate-200 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg font-semibold text-slate-900">Key Insights</CardTitle>
                    </CardHeader>
                    <CardContent className="h-64">
                      <div className="text-sm text-slate-700 space-y-3">
                        <div className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                          <span><strong>Meta Ads</strong> is generating {dashboardData?.facebookMetrics?.leads || '0'} leads at ${dashboardData?.facebookMetrics?.costPerLead?.toFixed(2) || '0.00'} cost per lead</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 flex-shrink-0"></div>
                          <span><strong>Google Ads</strong> is generating {dashboardData?.googleMetrics?.leads || '0'} leads at ${dashboardData?.googleMetrics?.costPerLead?.toFixed(2) || '0.00'} cost per lead</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0"></div>
                          <span><strong>Overall ROI</strong> is {dashboardData?.roi?.toFixed(1) || '0.0'}% with ${dashboardData?.totalRevenue?.toLocaleString() || '0'} in total revenue</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 flex-shrink-0"></div>
                          <span><strong>Lead Quality</strong> shows {dashboardData?.leadMetrics?.leadToOpportunityRate?.toFixed(1) || '0.0'}% conversion from lead to opportunity</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2 flex-shrink-0"></div>
                          <span><strong>Event Sales</strong> pipeline value is ${dashboardData?.ghlMetrics?.pipelineValue?.toLocaleString() || '0'} with {dashboardData?.eventMetrics?.totalEvents || '0'} total events</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* ALL VENUES - Facebook Tab */}
              <TabsContent value="facebook-all" className="mt-0">
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">Meta Ads - All Venues</h2>
                      <p className="text-sm text-slate-600">Combined Meta Ads performance across all venues</p>
                    </div>
                  </div>
                  
                  {/* Summary Cards */}
                  <div className="grid gap-4 grid-cols-1 md:grid-cols-4 mb-6">
                    <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-600 mb-2">Total Leads</p>
                          <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-bold text-slate-900">{dashboardData?.facebookMetrics?.leads || '0'}</p>
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-green-600 font-medium">↑ +15.2%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-600 mb-2">Total Spend</p>
                          <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-bold text-slate-900">${dashboardData?.facebookMetrics?.spend?.toLocaleString() || '0'}</p>
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-green-600 font-medium">↑ +2.0%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-600 mb-2">Cost Per Lead</p>
                          <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-bold text-slate-900">${dashboardData?.facebookMetrics?.costPerLead?.toFixed(2) || '0.00'}</p>
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-red-600 font-medium">↓ -8.3%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-600 mb-2">Conversion Rate</p>
                          <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-bold text-slate-900">{((dashboardData?.facebookMetrics?.leads || 0) / (dashboardData?.facebookMetrics?.clicks || 1) * 100).toFixed(1)}%</p>
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-green-600 font-medium">↑ +5.7%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>


              </TabsContent>

              {/* ALL VENUES - Google Tab */}
              <TabsContent value="google-all" className="mt-0">
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">Google Ads - All Venues</h2>
                      <p className="text-sm text-slate-600">Combined Google Ads performance across all venues</p>
                    </div>
                  </div>
                  
                  {/* Summary Cards */}
                  <div className="grid gap-4 grid-cols-1 md:grid-cols-4 mb-6">
                    <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-600 mb-2">Total Leads</p>
                          <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-bold text-slate-900">{dashboardData?.googleMetrics?.leads || '0'}</p>
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-green-600 font-medium">↑ +25.4%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-600 mb-2">Total Spend</p>
                          <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-bold text-slate-900">${dashboardData?.googleMetrics?.cost?.toLocaleString() || '0'}</p>
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-green-600 font-medium">↑ +8.2%</span>
                  </div>
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-600 mb-2">Cost Per Lead</p>
                          <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-bold text-slate-900">${dashboardData?.googleMetrics?.costPerLead?.toFixed(2) || '0.00'}</p>
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-red-600 font-medium">↓ -12.3%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-600 mb-2">Conversion Rate</p>
                          <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-bold text-slate-900">{dashboardData?.googleMetrics?.conversionRate?.toFixed(1) || '0'}%</p>
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-green-600 font-medium">↑ +8.7%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>

                {/* All Venues Google Ads Table */}
                <Card className="bg-white border border-slate-200 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-semibold text-slate-900">Google Ads Performance by Venue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AllVenuesGoogleAdsTable />
                  </CardContent>
                </Card>

              </TabsContent>

              {/* ALL VENUES - Event Sales Tab */}
              <TabsContent value="event-sales-all" className="mt-0">
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">Event Sales - All Venues</h2>
                      <p className="text-sm text-slate-600">Combined event sales performance across all venues</p>
                    </div>
                  </div>
                  
                  {/* Summary Cards */}
                  <div className="grid gap-4 grid-cols-1 md:grid-cols-4 mb-6">
                    <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-600 mb-2">Total Events</p>
                          <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-bold text-slate-900">{dashboardData?.eventMetrics?.totalEvents || '0'}</p>
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-green-600 font-medium">↑ +12%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-600 mb-2">Pipeline Value</p>
                          <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-bold text-slate-900">${dashboardData?.ghlMetrics?.pipelineValue?.toLocaleString() || '0'}</p>
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-green-600 font-medium">↑ +15%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-600 mb-2">Win Rate</p>
                          <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-bold text-green-600">{dashboardData?.ghlMetrics?.conversionRate?.toFixed(1) || '0.0'}%</p>
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-slate-500">{dashboardData?.ghlMetrics?.wonOpportunities || '0'} won</span>
                  </div>
                </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-600 mb-2">Avg Event Value</p>
                          <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-bold text-slate-900">${dashboardData?.leadMetrics?.averageEventValue?.toLocaleString() || '0'}</p>
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-green-600 font-medium">↑ +8%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>

                {/* Event Sales Summary Cards */}
                <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 mb-6">
                  <Card className="bg-white border border-slate-200 shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg font-semibold text-slate-900">Event Type Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {dashboardData?.eventMetrics?.eventTypeBreakdown?.map((eventType, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                              <span className="text-sm font-medium text-slate-700">{eventType.type}</span>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold text-slate-900">{eventType.count} events</div>
                              <div className="text-xs text-slate-500">{eventType.percentage}%</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white border border-slate-200 shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg font-semibold text-slate-900">Budget Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {dashboardData?.eventMetrics?.budgetDistribution?.map((budget, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 rounded-full bg-green-600"></div>
                              <span className="text-sm font-medium text-slate-700">{budget.range}</span>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold text-slate-900">{budget.count} events</div>
                              <div className="text-xs text-slate-500">{budget.percentage}%</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Insights Card for ALL VENUES Event Sales */}
                <div className="mt-6">
                  <InsightsCard dashboardData={dashboardData} selectedPeriod={selectedPeriod} />
                </div>
              </TabsContent>

              {/* ALL VENUES - Lead Quality Tab */}
              <TabsContent value="lead-quality-all" className="mt-0">
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">Lead Quality - All Venues</h2>
                      <p className="text-sm text-slate-600">Combined lead quality metrics across all venues</p>
                    </div>
                  </div>
                </div>

                {/* Lead Quality Summary */}
                <div className="grid gap-4 grid-cols-1 md:grid-cols-4 mb-6">
                  <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600 mb-2">Overall CPL</p>
                        <div className="flex items-baseline gap-2">
                          <p className="text-3xl font-bold text-slate-900">${dashboardData?.leadMetrics?.overallCostPerLead?.toFixed(2) || '0.00'}</p>
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-red-600 font-medium">↓ -5.2%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>

                  <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600 mb-2">Lead→Opp Rate</p>
                        <div className="flex items-baseline gap-2">
                          <p className="text-3xl font-bold text-slate-900">{dashboardData?.leadMetrics?.leadToOpportunityRate?.toFixed(1) || '0.0'}%</p>
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-green-600 font-medium">↑ +3.1%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>

                  <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600 mb-2">Opp→Win Rate</p>
                        <div className="flex items-baseline gap-2">
                          <p className="text-3xl font-bold text-slate-900">{dashboardData?.leadMetrics?.opportunityToWinRate?.toFixed(1) || '0.0'}%</p>
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-green-600 font-medium">↑ +2.8%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>

                  <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600 mb-2">Form Completion</p>
                        <div className="flex items-baseline gap-2">
                          <p className="text-3xl font-bold text-slate-900">{dashboardData?.leadMetrics?.formCompletionRate?.toFixed(1) || '0.0'}%</p>
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-green-600 font-medium">↑ +1.5%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Lead Quality Content */}
                <LeadQualityTabContent />

                {/* Insights Card for ALL VENUES Lead Quality */}
                <div className="mt-6">
                  <InsightsCard dashboardData={dashboardData} selectedPeriod={selectedPeriod} />
                </div>
              </TabsContent>

              {/* Facebook Tab */}
              <TabsContent value="facebook" className="mt-0">
                {/* Key Metrics - 2 Rows of KPI Cards */}
                <div className="mb-6">
                  {/* First Row - 4 Cards */}
                  <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-4">
                    <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-600 mb-2">Leads</p>
                          <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-bold text-slate-900">{dashboardData?.facebookMetrics?.leads || '0'}</p>
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-green-600 font-medium">↑ +15.2%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-600 mb-2">Cost Per Lead</p>
                          <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-bold text-slate-900">${dashboardData?.facebookMetrics?.costPerLead?.toFixed(2) || '0.00'}</p>
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-red-600 font-medium">↓ -8.3%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-600 mb-2">Conversion Rate</p>
                          <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-bold text-slate-900">{((dashboardData?.facebookMetrics.leads || 0) / (dashboardData?.facebookMetrics.clicks || 1) * 100).toFixed(1)}%</p>
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-green-600 font-medium">↑ +5.7%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-600 mb-2">Spent</p>
                          <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-bold text-slate-900">${dashboardData?.facebookMetrics?.spend?.toLocaleString() || '0'}</p>
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-green-600 font-medium">↑ +2.0%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Second Row - 4 Cards */}
                  <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-600 mb-2">Impressions</p>
                          <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-bold text-slate-900">{dashboardData?.facebookMetrics?.impressions?.toLocaleString() || '0'}</p>
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-green-600 font-medium">↑ +8.5%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-600 mb-2">Link Clicks</p>
                          <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-bold text-slate-900">{dashboardData?.facebookMetrics?.clicks?.toLocaleString() || '0'}</p>
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-green-600 font-medium">↑ +22.3%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-600 mb-2">Cost Per Link Click</p>
                          <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-bold text-slate-900">${dashboardData?.facebookMetrics?.cpc?.toFixed(2) || '0'}</p>
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-red-600 font-medium">↓ -12.8%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-600 mb-2">CTR</p>
                          <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-bold text-slate-900">{dashboardData?.facebookMetrics?.ctr?.toFixed(2) || '0'}%</p>
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-red-600 font-medium">↓ -47.2%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>

                {/* Charts Section */}
                <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                  {/* Facebook/Instagram Platform Breakdown */}
                  <Card className="bg-white border border-slate-200 shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg font-semibold text-slate-900">Platform Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {/* Facebook vs Instagram */}
                        <div>
                          <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm font-semibold text-slate-700">Facebook vs Instagram</h3>
                            <span className="text-xs text-slate-500">{dashboardData?.facebookMetrics?.leads || '0'} total leads</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-8 relative overflow-hidden">
                            <div className="bg-blue-600 h-8 rounded-l-full transition-all duration-700 ease-out flex items-center justify-center" style={{ width: '65%' }}>
                              <span className="text-xs font-normal text-white">Facebook (65%)</span>
                            </div>
                            <div className="bg-pink-500 h-8 rounded-r-full transition-all duration-700 ease-out absolute top-0 flex items-center justify-center" style={{ width: '35%', left: '65%' }}>
                              <span className="text-xs font-normal text-white">Instagram (35%)</span>
                            </div>
                          </div>
                        </div>

                        {/* Ad Placements */}
                        <div>
                          <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm font-semibold text-slate-700">Ad Placements</h3>
                            <span className="text-xs text-slate-500">${dashboardData?.facebookMetrics?.spend?.toLocaleString() || '0'} total spend</span>
                          </div>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-slate-600">Feed</span>
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-slate-200 rounded-full h-2">
                                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '45%' }}></div>
                                </div>
                                <span className="text-xs text-slate-500">45%</span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-slate-600">Stories</span>
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-slate-200 rounded-full h-2">
                                  <div className="bg-purple-500 h-2 rounded-full" style={{ width: '30%' }}></div>
                                </div>
                                <span className="text-xs text-slate-500">30%</span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-slate-600">Reels</span>
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-slate-200 rounded-full h-2">
                                  <div className="bg-pink-500 h-2 rounded-full" style={{ width: '25%' }}></div>
                                </div>
                                <span className="text-xs text-slate-500">25%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Demographics Breakdown */}
                  <Card className="bg-white border border-slate-200 shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg font-semibold text-slate-900">Demographics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {/* Age Groups */}
                        <div>
                          <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm font-semibold text-slate-700">Age Groups</h3>
                            <span className="text-xs text-slate-500">{dashboardData?.facebookMetrics?.leads || '0'} total leads</span>
                </div>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-slate-600">25-34</span>
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-slate-200 rounded-full h-2">
                                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '40%' }}></div>
                                </div>
                                <span className="text-xs text-slate-500">40%</span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-slate-600">35-44</span>
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-slate-200 rounded-full h-2">
                                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '35%' }}></div>
                                </div>
                                <span className="text-xs text-slate-500">35%</span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-slate-600">45-54</span>
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-slate-200 rounded-full h-2">
                                  <div className="bg-purple-500 h-2 rounded-full" style={{ width: '20%' }}></div>
                                </div>
                                <span className="text-xs text-slate-500">20%</span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-slate-600">55+</span>
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-slate-200 rounded-full h-2">
                                  <div className="bg-orange-500 h-2 rounded-full" style={{ width: '5%' }}></div>
                                </div>
                                <span className="text-xs text-slate-500">5%</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Gender */}
                        <div>
                          <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm font-semibold text-slate-700">Gender</h3>
                            <span className="text-xs text-slate-500">{dashboardData?.facebookMetrics?.leads || '0'} total leads</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-8 relative overflow-hidden">
                            <div className="bg-blue-500 h-8 rounded-l-full transition-all duration-700 ease-out flex items-center justify-center" style={{ width: '60%' }}>
                              <span className="text-xs font-normal text-white">Female (60%)</span>
                            </div>
                            <div className="bg-green-500 h-8 rounded-r-full transition-all duration-700 ease-out absolute top-0 flex items-center justify-center" style={{ width: '40%', left: '60%' }}>
                              <span className="text-xs font-normal text-white">Male (40%)</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

              </TabsContent>


              {/* Google Tab */}
              <TabsContent value="google" className="mt-0">
                {/* Key Metrics - 2 Rows of KPI Cards */}
                <div className="mb-6">
                  {/* First Row - 4 Cards */}
                  <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-4">
                    <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-600 mb-2">Leads</p>
                          <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-bold text-slate-900">{dashboardData?.googleMetrics?.leads || '0'}</p>
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-green-600 font-medium">↑ +25.4%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-600 mb-2">Cost Per Lead</p>
                          <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-bold text-slate-900">${dashboardData?.googleMetrics?.costPerLead?.toFixed(2) || '0.00'}</p>
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-red-600 font-medium">↓ -12.3%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-600 mb-2">Conversion Rate</p>
                          <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-bold text-slate-900">{dashboardData?.googleMetrics?.conversionRate?.toFixed(1) || '0'}%</p>
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-green-600 font-medium">↑ +8.7%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-600 mb-2">Spent</p>
                          <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-bold text-slate-900">${dashboardData?.googleMetrics?.cost?.toLocaleString() || '0'}</p>
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-green-600 font-medium">↑ +8.2%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Second Row - 4 Cards */}
                  <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-600 mb-2">Impressions</p>
                          <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-bold text-slate-900">{dashboardData?.googleMetrics?.impressions?.toLocaleString() || '0'}</p>
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-green-600 font-medium">↑ +12.3%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-600 mb-2">Clicks</p>
                          <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-bold text-slate-900">{dashboardData?.googleMetrics?.clicks?.toLocaleString() || '0'}</p>
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-green-600 font-medium">↑ +18.7%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-600 mb-2">Cost Per Click</p>
                          <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-bold text-slate-900">${dashboardData?.googleMetrics?.cpc?.toFixed(2) || '0'}</p>
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-red-600 font-medium">↓ -12.8%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-600 mb-2">CTR</p>
                          <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-bold text-slate-900">{dashboardData?.googleMetrics?.ctr?.toFixed(2) || '0'}%</p>
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-green-600 font-medium">↑ +6.3%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>

                {/* Charts Section */}
                <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                  {/* Daily Leads vs Spend Chart */}
                  <Card className="card-bg-light shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg font-semibold text-slate-900">Daily Leads vs Spend</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <GoogleAdsDailyChart data={dashboardData} />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Google Ads Campaign Breakdown */}
                  <Card className="bg-white border border-slate-200 shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg font-semibold text-slate-900">Campaign Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {/* Campaign Types */}
                        <div>
                          <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm font-semibold text-slate-700">Campaign Types</h3>
                            <span className="text-xs text-slate-500">{dashboardData?.googleMetrics?.leads || '0'} total leads</span>
                          </div>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-slate-600">Search</span>
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-slate-200 rounded-full h-2">
                                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '50%' }}></div>
                                </div>
                                <span className="text-xs text-slate-500">50%</span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-slate-600">Display</span>
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-slate-200 rounded-full h-2">
                                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '30%' }}></div>
                                </div>
                                <span className="text-xs text-slate-500">30%</span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-slate-600">YouTube</span>
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-slate-200 rounded-full h-2">
                                  <div className="bg-red-500 h-2 rounded-full" style={{ width: '20%' }}></div>
                                </div>
                                <span className="text-xs text-slate-500">20%</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Ad Formats */}
                        <div>
                          <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm font-semibold text-slate-700">Ad Formats</h3>
                            <span className="text-xs text-slate-500">${dashboardData?.googleMetrics?.cost?.toLocaleString() || '0'} total spend</span>
                          </div>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-slate-600">Text Ads</span>
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-slate-200 rounded-full h-2">
                                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '40%' }}></div>
                                </div>
                                <span className="text-xs text-slate-500">40%</span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-slate-600">Responsive Display</span>
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-slate-200 rounded-full h-2">
                                  <div className="bg-purple-500 h-2 rounded-full" style={{ width: '35%' }}></div>
                                </div>
                                <span className="text-xs text-slate-500">35%</span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-slate-600">Video Ads</span>
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-slate-200 rounded-full h-2">
                                  <div className="bg-red-500 h-2 rounded-full" style={{ width: '25%' }}></div>
                                </div>
                                <span className="text-xs text-slate-500">25%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Google Ads Demographics */}
                  <Card className="bg-white border border-slate-200 shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg font-semibold text-slate-900">Demographics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {/* Age Groups */}
                        <div>
                          <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm font-semibold text-slate-700">Age Groups</h3>
                            <span className="text-xs text-slate-500">{dashboardData?.googleMetrics?.leads || '0'} total leads</span>
                          </div>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-slate-600">25-34</span>
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-slate-200 rounded-full h-2">
                                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '35%' }}></div>
                                </div>
                                <span className="text-xs text-slate-500">35%</span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-slate-600">35-44</span>
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-slate-200 rounded-full h-2">
                                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '40%' }}></div>
                                </div>
                                <span className="text-xs text-slate-500">40%</span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-slate-600">45-54</span>
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-slate-200 rounded-full h-2">
                                  <div className="bg-purple-500 h-2 rounded-full" style={{ width: '20%' }}></div>
                                </div>
                                <span className="text-xs text-slate-500">20%</span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-slate-600">55+</span>
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-slate-200 rounded-full h-2">
                                  <div className="bg-orange-500 h-2 rounded-full" style={{ width: '5%' }}></div>
                                </div>
                                <span className="text-xs text-slate-500">5%</span>
                              </div>
                            </div>
                          </div>
                </div>

                        {/* Gender */}
                        <div>
                          <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm font-semibold text-slate-700">Gender</h3>
                            <span className="text-xs text-slate-500">{dashboardData?.googleMetrics?.leads || '0'} total leads</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-8 relative overflow-hidden">
                            <div className="bg-blue-500 h-8 rounded-l-full transition-all duration-700 ease-out flex items-center justify-center" style={{ width: '55%' }}>
                              <span className="text-xs font-normal text-white">Female (55%)</span>
                            </div>
                            <div className="bg-green-500 h-8 rounded-r-full transition-all duration-700 ease-out absolute top-0 flex items-center justify-center" style={{ width: '45%', left: '55%' }}>
                              <span className="text-xs font-normal text-white">Male (45%)</span>
                            </div>
                          </div>
                        </div>

                        {/* Device Types */}
                        <div>
                          <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm font-semibold text-slate-700">Device Types</h3>
                            <span className="text-xs text-slate-500">{dashboardData?.googleMetrics?.leads || '0'} total leads</span>
                          </div>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-slate-600">Mobile</span>
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-slate-200 rounded-full h-2">
                                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '70%' }}></div>
                                </div>
                                <span className="text-xs text-slate-500">70%</span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-slate-600">Desktop</span>
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-slate-200 rounded-full h-2">
                                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '25%' }}></div>
                                </div>
                                <span className="text-xs text-slate-500">25%</span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-slate-600">Tablet</span>
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-slate-200 rounded-full h-2">
                                  <div className="bg-purple-500 h-2 rounded-full" style={{ width: '5%' }}></div>
                                </div>
                                <span className="text-xs text-slate-500">5%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

              </TabsContent>

              {/* Event Sales Tab */}
              <TabsContent value="event-sales" className="mt-0">
                {/* Event Sales Overview */}
                <div className="mb-6 grid gap-4 grid-cols-1 md:grid-cols-4">
                  <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600 mb-2">Total Events</p>
                        <div className="flex items-baseline gap-2">
                          <p className="text-3xl font-bold text-slate-900">{dashboardData?.eventMetrics?.totalEvents || '0'}</p>
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-green-600 font-medium">↑ +12%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>

                  <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600 mb-2">Avg Event Value</p>
                        <div className="flex items-baseline gap-2">
                          <p className="text-3xl font-bold text-slate-900">${dashboardData?.leadMetrics?.averageEventValue?.toLocaleString() || '0'}</p>
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-green-600 font-medium">↑ +8%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>

                  <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600 mb-2">Pipeline Value</p>
                        <div className="flex items-baseline gap-2">
                          <p className="text-3xl font-bold text-slate-900">${dashboardData?.ghlMetrics?.pipelineValue?.toLocaleString() || '0'}</p>
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-green-600 font-medium">↑ +15%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>

                  <Card className="bg-white border border-slate-200 shadow-sm p-5 h-24">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600 mb-2">Win Rate</p>
                        <div className="flex items-baseline gap-2">
                          <p className="text-3xl font-bold text-green-600">{dashboardData?.ghlMetrics?.conversionRate?.toFixed(1) || '0.0'}%</p>
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-slate-500">{dashboardData?.ghlMetrics?.wonOpportunities || '0'} won</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Event Type Breakdown */}
                <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 mb-6">
                  <Card className="bg-white border border-slate-200 shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg font-semibold text-slate-900">Event Type Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {dashboardData?.eventMetrics?.eventTypeBreakdown?.map((eventType, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                              <span className="text-sm font-medium text-slate-700">{eventType.type}</span>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold text-slate-900">{eventType.count} events</div>
                              <div className="text-xs text-slate-500">{eventType.percentage}%</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white border border-slate-200 shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg font-semibold text-slate-900">Budget Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {dashboardData?.eventMetrics?.budgetDistribution?.map((budget, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 rounded-full bg-green-600"></div>
                              <span className="text-sm font-medium text-slate-700">{budget.range}</span>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold text-slate-900">{budget.count} events</div>
                              <div className="text-xs text-slate-500">{budget.percentage}%</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Sales Pipeline */}
                <div className="grid gap-6 grid-cols-1 lg:grid-cols-3 mb-6">
                  <Card className="bg-white border border-slate-200 shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg font-semibold text-slate-900">Sales Pipeline</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-600">Total Contacts</span>
                          <span className="text-sm font-medium">{dashboardData?.ghlMetrics?.totalContacts || '0'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-600">New Contacts</span>
                          <span className="text-sm font-medium">{dashboardData?.ghlMetrics?.newContacts || '0'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-600">Total Opportunities</span>
                          <span className="text-sm font-medium">{dashboardData?.ghlMetrics?.totalOpportunities || '0'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-600">Won Opportunities</span>
                          <span className="text-sm font-medium text-green-600">{dashboardData?.ghlMetrics?.wonOpportunities || '0'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-600">Lost Opportunities</span>
                          <span className="text-sm font-medium text-red-600">{dashboardData?.ghlMetrics?.lostOpportunities || '0'}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white border border-slate-200 shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg font-semibold text-slate-900">Performance Metrics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-600">Avg Deal Size</span>
                          <span className="text-sm font-medium">${dashboardData?.ghlMetrics?.avgDealSize?.toLocaleString() || '0'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-600">Conversion Rate</span>
                          <span className="text-sm font-medium">{dashboardData?.ghlMetrics?.conversionRate?.toFixed(1) || '0.0'}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-600">Response Time</span>
                          <span className="text-sm font-medium">{dashboardData?.ghlMetrics?.responseTime || '0'} min</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-600">Avg Guests/Event</span>
                          <span className="text-sm font-medium">{dashboardData?.leadMetrics?.averageGuestsPerEvent || '0'}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white border border-slate-200 shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg font-semibold text-slate-900">Revenue Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-600">Total Revenue</span>
                          <span className="text-sm font-medium">${dashboardData?.totalRevenue?.toLocaleString() || '0'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-600">Total Spend</span>
                          <span className="text-sm font-medium">${dashboardData?.totalSpend?.toLocaleString() || '0'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-600">ROI</span>
                          <span className="text-sm font-medium text-green-600">{dashboardData?.roi?.toFixed(1) || '0.0'}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-600">Most Popular</span>
                          <span className="text-sm font-medium">{dashboardData?.leadMetrics?.mostPopularEventType || 'N/A'}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

              </TabsContent>

              {/* Lead Quality Tab */}
              <TabsContent value="lead-quality" className="mt-0">
                <LeadQualityTabContent />
              </TabsContent>

            </Tabs>
          </div>
        </div>
      ) : (
        <div className="p-4">
          <div className="max-w-full mx-auto">
            <div className="card-bg-light rounded-2xl shadow-sm p-12 text-center">
              <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <BarChart3 className="h-10 w-10 text-gray-400" />
              </div>
              <h2 className="text-heading text-slate-900 mb-3">Welcome to Event Analytics</h2>
              <p className="text-body text-slate-600 mb-8 max-w-md mx-auto">
                Select a venue from the dropdown above to view detailed analytics, performance metrics, and insights for your events.
              </p>
              <div className="flex items-center justify-center gap-4 text-caption text-gray-500">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Real-time Metrics</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Lead Tracking</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>Revenue Analytics</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventDashboard;