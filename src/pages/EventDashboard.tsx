import React, { useEffect, useMemo, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EventDashboardData, EventMetricsService } from "@/services/eventMetricsService";
import { PDFExportService } from "@/services/pdfExportService";
import { DatabaseService } from "@/services/databaseService";
import { BarChart3 } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { MetricsOverview } from "@/components/dashboard/MetricsOverview";
import { ChartsSection } from "@/components/dashboard/ChartsSection";
import { TablesSection } from "@/components/dashboard/TablesSection";
import { TabContent } from "@/components/dashboard/TabContent";

interface EventDashboardProps {
  isShared?: boolean;
  clientId?: string;
}

const EventDashboard: React.FC<EventDashboardProps> = ({ isShared = false, clientId }) => {
  const [selectedPeriod, setSelectedPeriod] = useState("30d");
  const [activeTab, setActiveTab] = useState("summary");
  const [dashboardData, setDashboardData] = useState<EventDashboardData | null>(null);
  const [clientData, setClientData] = useState<any>(null);
  const [availableClients, setAvailableClients] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const clientsLoadedRef = useRef(false);

  // Helper function to calculate date range based on selected period
  const getDateRange = (period: string) => {
    const end = new Date();
    const start = new Date();
    
    switch (period) {
      case '7d':
        start.setDate(end.getDate() - 7);
        break;
      case '30d':
        start.setDate(end.getDate() - 30);
        break;
      case '90d':
        start.setDate(end.getDate() - 90);
        break;
      case '1y':
        start.setFullYear(end.getFullYear() - 1);
        break;
      default:
        start.setDate(end.getDate() - 30);
    }
    
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  };

  // Get client ID from URL if not provided as prop
  const actualClientId = useMemo(() => {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/share/')) {
      const urlClientId = window.location.pathname.split('/share/')[1];
      return clientId || urlClientId;
    }
    return clientId;
  }, [clientId]);

  const loadAvailableClients = async (forceRefresh = false) => {
    if (clientsLoadedRef.current && !forceRefresh) {
      return;
    }
    
    try {
      const clients = await DatabaseService.getAllClients();
      setAvailableClients(clients);
      clientsLoadedRef.current = true;
      
      // Auto-select first client if none selected
      if (!actualClientId && clients.length > 0) {
        handleClientChange(clients[0].id);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
      setError('Failed to load clients');
    }
  };

  const handleClientChange = async (newClientId: string) => {
    try {
      setError(null);
      
      if (newClientId === 'all_venues') {
        setClientData({ id: 'all_venues', name: 'All Venues' });
        // TODO: Implement getAllVenuesMetrics method
        // For now, use mock data
        const mockData: EventDashboardData = {
          totalLeads: 1250,
          totalSpend: 18500,
          totalRevenue: 125000,
          roi: 6.76,
          facebookMetrics: {
            leads: 750,
            spend: 12000,
            impressions: 2500000,
            clicks: 15000,
            ctr: 0.6,
            cpc: 0.8,
            cpm: 4.8,
            roas: 8.5,
            costPerLead: 16.0
          },
          googleMetrics: {
            leads: 500,
            cost: 6500,
            impressions: 1800000,
            clicks: 12000,
            ctr: 0.67,
            cpc: 0.54,
            cpm: 3.61,
            qualityScore: 7.2,
            costPerLead: 13.0
          },
          leadMetrics: {
            facebookCostPerLead: 16.0,
            googleCostPerLead: 13.0,
            overallCostPerLead: 14.8,
            leadToOpportunityRate: 0.15,
            opportunityToWinRate: 0.25,
            averageEventValue: 2500,
            averageGuestsPerEvent: 45,
            mostPopularEventType: 'Wedding',
            seasonalTrends: [],
            landingPageConversionRate: 0.12,
            formCompletionRate: 0.85,
            leadSourceBreakdown: []
          },
          eventMetrics: {
            totalEvents: 28,
            averageGuests: 45,
            totalGuests: 1260,
            averageEventValue: 2500,
            totalEventValue: 70000,
            eventTypes: [
              { type: 'Wedding', count: 15, percentage: 53.6 },
              { type: 'Corporate', count: 8, percentage: 28.6 },
              { type: 'Social', count: 5, percentage: 17.8 }
            ]
          }
        };
        setDashboardData(mockData);
      } else {
        const client = await DatabaseService.getClientById(newClientId);
        setClientData(client);
        const data = await EventMetricsService.getComprehensiveMetrics(
          newClientId, 
          getDateRange(selectedPeriod),
          client?.accounts
        );
        setDashboardData(data);
      }
    } catch (error) {
      console.error('Error loading client data:', error);
      setError('Failed to load client data');
    }
  };

  const handlePeriodChange = async (newPeriod: string) => {
    setSelectedPeriod(newPeriod);
    if (clientData) {
      await handleClientChange(clientData.id);
    }
  };

  const handleExportPDF = async () => {
    if (!dashboardData || !clientData) {
      return;
    }
    
    try {
      await PDFExportService.exportDashboardToPDF(dashboardData, {
        clientName: clientData.name,
        includeCharts: true,
        includeDetailedMetrics: true
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      setError('Failed to export PDF');
    }
  };

  useEffect(() => {
    loadAvailableClients();
  }, []);

  useEffect(() => {
    if (actualClientId && availableClients.length > 0) {
      handleClientChange(actualClientId);
    }
  }, [actualClientId, availableClients]);

  if (error) {
    return (
      <div className="page-bg-light flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <BarChart3 className="h-10 w-10 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-bg-light min-h-screen">
      <DashboardHeader
        clientData={clientData}
        availableClients={availableClients}
        selectedPeriod={selectedPeriod}
        onClientChange={handleClientChange}
        onPeriodChange={handlePeriodChange}
        onExportPDF={handleExportPDF}
        isShared={isShared}
      />

      {clientData ? (
        <div className="px-12 py-4">
          <div className="max-w-full mx-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              {/* Tabs Navigation */}
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
                        <TabsTrigger value="google-all" className="text-sm font-medium px-4 py-2 rounded-md flex-1 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition-all duration-200 flex items-center gap-2">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                          </svg>
                          Google Ads
                        </TabsTrigger>
                        <TabsTrigger value="lead-quality" className="text-sm font-medium px-4 py-2 rounded-md flex-1 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition-all duration-200">
                          Lead Quality
                        </TabsTrigger>
                        <TabsTrigger value="event-analytics" className="text-sm font-medium px-4 py-2 rounded-md flex-1 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition-all duration-200">
                          Event Analytics
                        </TabsTrigger>
                      </>
                    ) : (
                      <>
                        <TabsTrigger value="summary" className="text-sm font-medium px-4 py-2 rounded-md flex-1 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition-all duration-200">
                          Summary
                        </TabsTrigger>
                        <TabsTrigger value="facebook" className="text-sm font-medium px-4 py-2 rounded-md flex-1 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition-all duration-200 flex items-center gap-2">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/>
                            <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
                          </svg>
                          Meta Ads
                        </TabsTrigger>
                        <TabsTrigger value="google" className="text-sm font-medium px-4 py-2 rounded-md flex-1 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition-all duration-200 flex items-center gap-2">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                          </svg>
                          Google Ads
                        </TabsTrigger>
                        <TabsTrigger value="lead-quality" className="text-sm font-medium px-4 py-2 rounded-md flex-1 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition-all duration-200">
                          Lead Quality
                        </TabsTrigger>
                        <TabsTrigger value="event-analytics" className="text-sm font-medium px-4 py-2 rounded-md flex-1 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition-all duration-200">
                          Event Analytics
                        </TabsTrigger>
                      </>
                    )}
                  </TabsList>
                </div>
              </div>

              {/* Tab Content */}
              <TabsContent value="summary" className="space-y-6">
                <MetricsOverview dashboardData={dashboardData} selectedPeriod={selectedPeriod} />
                <ChartsSection dashboardData={dashboardData} selectedPeriod={selectedPeriod} />
                <TablesSection dashboardData={dashboardData} selectedPeriod={selectedPeriod} clientData={clientData} />
              </TabsContent>

              <TabContent 
                dashboardData={dashboardData} 
                selectedPeriod={selectedPeriod} 
                clientData={clientData}
                activeTab={activeTab}
              />
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
