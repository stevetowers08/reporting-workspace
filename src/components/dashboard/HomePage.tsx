import { AgencyHeader } from '@/components/dashboard/AgencyHeader';
import AddClientModal from '@/components/modals/AddClientModal';
import EditClientModal from '@/components/modals/EditClientModal';
import { LoadingState } from '@/components/ui/LoadingStates';
import { LogoManager } from '@/components/ui/LogoManager';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { debugLogger } from '@/lib/debug';
import { DatabaseService } from '@/services/data/databaseService';
import { EventMetricsService } from '@/services/data/eventMetricsService';
import { Client } from '@/types/client';
import {
    ArrowRight,
    BarChart3,
    Edit,
    Plus,
    RefreshCw,
    Users
} from 'lucide-react';
import React, { useEffect, useState } from 'react';


interface HomePageProps {
  clients: Array<Client>;
  onClientSelect: (clientId: string) => void;
  onGoToAgency: () => void;
  onRefreshClients?: () => Promise<void>;
  loading?: boolean;
}

interface AnalyticsSummary {
  totalVenues: number;
  totalSpend: number;
  totalLeads: number;
  totalImpressions: number;
  connectedIntegrations: number;
  totalIntegrations: number;
}

export const HomePage: React.FC<HomePageProps> = React.memo(({
  clients,
  onClientSelect,
  onGoToAgency,
  onRefreshClients,
  loading = false
}) => {
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [showEditClientModal, setShowEditClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [_analyticsSummary, setAnalyticsSummary] = useState<AnalyticsSummary>({
    totalVenues: 0,
    totalSpend: 0,
    totalLeads: 0,
    totalImpressions: 0,
    connectedIntegrations: 0,
    totalIntegrations: 4
  });
  const [_summaryLoading, setSummaryLoading] = useState(true);

  const loadAnalyticsSummary = async () => {
    try {
      setSummaryLoading(true);
      
      // Calculate basic metrics from clients
      const totalVenues = clients.length;
      let connectedIntegrations = 0;
      
      clients.forEach(client => {
        if (client.accounts?.facebookAds && client.accounts.facebookAds !== 'none') {
          connectedIntegrations++;
        }
        if (client.accounts?.googleAds && client.accounts.googleAds !== 'none') {
          connectedIntegrations++;
        }
        if (client.accounts?.goHighLevel && client.accounts.goHighLevel !== 'none') {
          connectedIntegrations++;
        }
        if (client.googleSheetsConfig) {
          connectedIntegrations++;
        }
      });

      // Try to get recent metrics (last 30 days)
      const dateRange = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      };

      let totalSpend = 0;
      let totalLeads = 0;
      let totalImpressions = 0;

      try {
        const [facebookMetrics, googleMetrics] = await Promise.all([
          EventMetricsService.getFacebookMetrics('', dateRange),
          EventMetricsService.getGoogleMetrics(dateRange)
        ]);

        if (facebookMetrics) {
          totalSpend += facebookMetrics.spend || 0;
          totalLeads += facebookMetrics.leads || 0;
          totalImpressions += facebookMetrics.impressions || 0;
        }

        if (googleMetrics) {
          totalSpend += googleMetrics.cost || 0;
          totalLeads += googleMetrics.conversions || 0;
          totalImpressions += googleMetrics.impressions || 0;
        }
      } catch (error) {
        debugLogger.warn('HomePage', 'Could not load detailed metrics', error);
      }

      setAnalyticsSummary({
        totalVenues,
        totalSpend,
        totalLeads,
        totalImpressions,
        connectedIntegrations,
        totalIntegrations: 4
      });
    } catch (error) {
      debugLogger.error('HomePage', 'Failed to load analytics summary', error);
    } finally {
      setSummaryLoading(false);
    }
  };

  // Load analytics summary
  useEffect(() => {
    loadAnalyticsSummary();
  }, [clients, loadAnalyticsSummary]);

  // Use TokenManager for proper connection status checking
  // Removed global integration status - now using client-specific data

  // Check if a client has GoHighLevel configured (client-level check)
  const isClientGHLConnected = (client: Client): boolean => {
    const hasLocationId = typeof client.accounts.goHighLevel === 'string' 
      ? client.accounts.goHighLevel && client.accounts.goHighLevel !== 'none'
      : (client.accounts.goHighLevel as Record<string, unknown>)?.locationId && (client.accounts.goHighLevel as Record<string, unknown>)?.locationId !== 'none';
    return Boolean(hasLocationId);
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setShowEditClientModal(true);
  };

  const handleAddClient = () => {
    // Open the simplified add client modal
    setShowAddClientModal(true);
  };

  const handleAddClientSubmit = async (clientData: { name: string }) => {
    try {
      // Create basic client with default values
      const basicClientData = {
        name: clientData.name,
        logo_url: '',
        accounts: {
          facebookAds: 'none',
          googleAds: 'none', 
          goHighLevel: 'none',
          googleSheets: 'none'
        },
        conversion_actions: {
          facebookAds: '',
          googleAds: ''
        },
        shareable_link: `https://eventmetrics.com/share/${Date.now()}`
      };
      
      await DatabaseService.createClient(basicClientData);
      setShowAddClientModal(false);
      
      debugLogger.info('HomePage', 'Client created successfully', { name: clientData.name });
      
      // Refresh client data instead of hard reload
      if (onRefreshClients) {
        await onRefreshClients();
        debugLogger.info('HomePage', 'Client data refreshed after creation');
      } else {
        // Fallback to hard reload if no refresh function provided
        window.location.reload();
      }
    } catch (error) {
      debugLogger.error('HomePage', 'Failed to create client', error);
      throw error;
    }
  };

  const handleCreateClient = async (clientData: {
    name: string;
    logo_url?: string;
    accounts: {
      facebookAds?: string;
      googleAds?: string;
      goHighLevel?: string;
      googleSheets?: string;
      googleSheetsConfig?: {
        spreadsheetId: string;
        sheetName: string;
      };
    };
    conversion_actions?: {
      facebookAds?: string;
      googleAds?: string;
    };
  }) => {
    try {
      await DatabaseService.createClient(clientData);
      setShowEditClientModal(false);
      setEditingClient(null);
      // Refresh the page to show updated data
      window.location.reload();
    } catch (_error) {
      // Handle error silently or show user-friendly message
    }
  };

  const handleUpdateClient = async (clientId: string, updates: Partial<Client>) => {
    try {
      await DatabaseService.updateClient(clientId, updates);
      
      // Refresh client data instead of hard reload
      if (onRefreshClients) {
        await onRefreshClients();
        debugLogger.info('HomePage', 'Client data refreshed after update');
      } else {
        // Fallback to hard reload if no refresh function provided
        window.location.reload();
      }
    } catch (error) {
      debugLogger.error('HomePage', 'Failed to update client', error);
      throw error;
    }
  };


  if (loading) {
    return <LoadingState message="Loading dashboard..." fullScreen />;
  }

  const _formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const _formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Agency Header */}
      <AgencyHeader
        clients={clients.map(client => ({
          id: client.id,
          name: client.name,
          logo_url: client.logo_url
        }))}
        selectedClientId={undefined}
        onClientSelect={onClientSelect}
        onBackToDashboard={() => {}}
        onGoToAgency={onGoToAgency}
        onExportPDF={() => {}}
        onShare={() => {}}
        exportingPDF={false}
        isShared={false}
        showVenueSelector={true}
      />

      <div className="px-6 lg:px-20 py-8">
        {/* Venue Selection Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Your Venues</h2>
              <p className="text-slate-600">Select a venue to view detailed analytics and performance metrics</p>
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={onRefreshClients}
                variant="outline"
                size="sm"
                className="border-slate-300"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button 
                onClick={handleAddClient}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Venue
              </Button>
            </div>
          </div>

          {clients.length === 0 ? (
            <Card className="border-2 border-dashed border-slate-300 bg-slate-50">
              <CardContent className="p-12 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users className="h-10 w-10 text-blue-600" />
                </div>
                <h4 className="text-xl font-semibold text-slate-900 mb-3">No venues yet</h4>
                <p className="text-slate-600 mb-6 max-w-md mx-auto">
                  Get started by adding your first client venue to begin tracking marketing performance.
                </p>
                <Button 
                  onClick={handleAddClient}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add Your First Venue
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {clients.map((client) => (
                <Card 
                  key={client.id} 
                  className="cursor-pointer hover:shadow-md transition-all duration-300 hover:scale-[1.02] border border-slate-200 bg-white group"
                  onClick={() => onClientSelect(client.id)}
                >
                  <CardContent className="p-6">
                    {/* Edit Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-3 right-3 h-8 w-8 p-0 text-slate-400 hover:text-slate-600 hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        handleEditClient(client);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <div className="space-y-4">
                      {/* Logo and Name */}
                      <div className="flex items-center gap-4">
                        <div className="relative w-12 h-12 flex-shrink-0">
                          {client.logo_url ? (
                            <>
                              <img
                                src={client.logo_url}
                                alt={`${client.name} logo`}
                                className="w-12 h-12 object-cover rounded-xl border border-slate-200 absolute inset-0"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const fallback = e.currentTarget.parentElement?.querySelector('.logo-fallback') as HTMLElement;
                                  if (fallback) {
                                    fallback.style.display = 'flex';
                                  }
                                }}
                              />
                              <div 
                                className="logo-fallback w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center"
                                style={{ display: 'none' }}
                              >
                                <BarChart3 className="h-6 w-6 text-white" />
                              </div>
                            </>
                          ) : (
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                              <BarChart3 className="h-6 w-6 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg font-semibold text-slate-900 truncate">
                            {client.name}
                          </h3>
                          <p className="text-sm text-slate-500">Marketing Analytics</p>
                        </div>
                      </div>
                      
                      {/* Integration Status */}
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">Connected Platforms</p>
                        <div className="flex items-center gap-2">
                          {/* Facebook Ads */}
                          <div 
                            className={`p-2 rounded-lg ${client.accounts?.facebookAds && client.accounts.facebookAds !== 'none' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}
                            title={client.accounts?.facebookAds && client.accounts.facebookAds !== 'none' ? 'Facebook Ads - Connected' : 'Facebook Ads - Not Connected'}
                          >
                            <LogoManager 
                              platform="meta" 
                              size={18} 
                              context="client-table"
                            />
                          </div>
                          
                          {/* Google Ads */}
                          <div 
                            className={`p-2 rounded-lg ${client.accounts?.googleAds && client.accounts.googleAds !== 'none' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-400'}`}
                            title={client.accounts?.googleAds && client.accounts.googleAds !== 'none' ? 'Google Ads - Connected' : 'Google Ads - Not Connected'}
                          >
                            <LogoManager 
                              platform="googleAds" 
                              size={18} 
                              context="client-table"
                            />
                          </div>
                          
                          {/* GoHighLevel */}
                          <div 
                            className={`p-2 rounded-lg ${isClientGHLConnected(client) ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}`}
                            title={isClientGHLConnected(client) ? 'GoHighLevel - Connected' : 'GoHighLevel - Not Connected'}
                          >
                            <LogoManager 
                              platform="goHighLevel" 
                              size={18} 
                              context="client-table"
                            />
                          </div>
                          
                          {/* Google Sheets */}
                          <div 
                            className={`p-2 rounded-lg ${client.googleSheetsConfig ? 'bg-yellow-50 text-yellow-600' : 'bg-slate-100 text-slate-400'}`}
                            title={client.googleSheetsConfig ? 'Google Sheets - Connected' : 'Google Sheets - Not Connected'}
                          >
                            <LogoManager 
                              platform="googleSheets" 
                              size={18} 
                              context="client-table"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="pt-2">
                        <div className="flex items-center justify-between text-sm text-slate-500">
                          <span>View Analytics</span>
                          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Client Modal */}
      {showEditClientModal && (
        <EditClientModal
          isOpen={showEditClientModal}
          onClose={() => {
            setShowEditClientModal(false);
            setEditingClient(null);
          }}
          onUpdateClient={handleUpdateClient}
          onCreateClient={handleCreateClient}
          client={editingClient}
        />
      )}

      {/* Add Client Modal */}
      {showAddClientModal && (
        <AddClientModal
          isOpen={showAddClientModal}
          onClose={() => setShowAddClientModal(false)}
          onAddClient={handleAddClientSubmit}
        />
      )}
    </div>
  );
});
