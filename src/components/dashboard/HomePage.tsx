import { AgencyHeader } from '@/components/dashboard/AgencyHeader';
import EditClientModal from '@/components/modals/EditClientModal';
import { IntegrationOnboardingBar } from '@/components/ui/IntegrationOnboardingBar';
import { LoadingState } from '@/components/ui/LoadingStates';
import { LogoManager } from '@/components/ui/LogoManager';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { debugLogger } from '@/lib/debug';
import { DatabaseService } from '@/services/data/databaseService';
import {
    BarChart3,
    Edit,
    Plus,
    Users
} from 'lucide-react';
import React, { useState } from 'react';

type Client = {
  id: string;
  name: string;
  logo_url?: string;
  status: 'active' | 'paused' | 'inactive';
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
  shareable_link: string;
};

interface HomePageProps {
  clients: Array<Client>;
  onClientSelect: (clientId: string) => void;
  onGoToAgency: () => void;
  loading?: boolean;
}

export const HomePage: React.FC<HomePageProps> = React.memo(({
  clients,
  onClientSelect,
  onGoToAgency,
  loading = false
}) => {
  const [showEditClientModal, setShowEditClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Use TokenManager for proper connection status checking
  const [integrationStatus, setIntegrationStatus] = useState<Record<string, boolean>>({});
  const [integrationStatusLoaded, setIntegrationStatusLoaded] = useState(false);
  
  // Load integration status using simple database check
  React.useEffect(() => {
    const loadIntegrationStatus = async () => {
      try {
        const { supabase } = await import('@/lib/supabase');
        
        // Simple approach: Just check if integrations exist in database
        const { data: integrations, error } = await supabase
          .from('integrations')
          .select('platform')
          .eq('connected', true);

        if (error) {
          debugLogger.error('HomePage', 'Failed to load integrations', error);
          setIntegrationStatus({ facebookAds: false, googleAds: false, googleSheets: false });
        } else {
          // Set all to false first
          const statusMap = { facebookAds: false, googleAds: false, googleSheets: false };
          // Set to true if found in database
          integrations?.forEach(integration => {
            if (integration.platform === 'facebookAds' || integration.platform === 'googleAds' || integration.platform === 'googleSheets') {
              statusMap[integration.platform] = true;
            }
          });
          setIntegrationStatus(statusMap);
        }
        setIntegrationStatusLoaded(true);
      } catch (_error) {
        setIntegrationStatus({});
        setIntegrationStatusLoaded(true);
      }
    };

    loadIntegrationStatus();
  }, []);

  // Check if a client has GoHighLevel configured (client-level check)
  const isClientGHLConnected = (client: Client): boolean => {
    const hasLocationId = typeof client.accounts.goHighLevel === 'string' 
      ? client.accounts.goHighLevel && client.accounts.goHighLevel !== 'none'
      : (client.accounts.goHighLevel as any)?.locationId && (client.accounts.goHighLevel as any)?.locationId !== 'none';
    return Boolean(hasLocationId);
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setShowEditClientModal(true);
  };

  const handleAddClient = () => {
    // Open the client form modal for adding a new client
    setEditingClient(null);
    setShowEditClientModal(true);
  };

  const handleCreateClient = async (clientData: {
    name: string;
    logo_url?: string;
    status: 'active' | 'paused' | 'inactive';
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
      setShowEditClientModal(false);
      setEditingClient(null);
      // Refresh the page to show updated data
      window.location.reload();
    } catch (_error) {
      // Handle error silently or show user-friendly message
    }
  };


  if (loading) {
    return <LoadingState message="Loading dashboard..." fullScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Agency Header with Venue Dropdown */}
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

      {/* Integration Onboarding Progress */}
      <div className="px-20 py-6 bg-slate-50 border-b border-slate-200">
        <IntegrationOnboardingBar />
      </div>

      <div className="px-20 py-12">
        {/* Venue Selection - Moved to Top */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Select Venue Dashboard</h2>
              <p className="text-sm text-slate-600">Choose a client to view their marketing analytics</p>
            </div>
            <Button 
              onClick={handleAddClient}
              size="sm"
              className="bg-blue-600 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Venue
            </Button>
          </div>

          {clients.length === 0 ? (
            <Card className="border-2 border-dashed border-slate-300 bg-slate-50">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-slate-400" />
                </div>
                <h4 className="text-lg font-semibold text-slate-900 mb-2">No venues yet</h4>
                <p className="text-slate-600 mb-4 max-w-md mx-auto text-sm">
                  Get started by adding your first client venue.
                </p>
                <Button 
                  onClick={handleAddClient}
                  className="bg-blue-600 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Venue
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 grid-cols-4">
              {clients.map((client) => (
                <Card 
                  key={client.id} 
                  className="cursor-pointer border-slate-200 relative group"
                  onClick={() => onClientSelect(client.id)}
                >
                  <CardContent className="p-3">
                    {/* Edit Button - positioned like agency page */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 h-6 w-6 p-0 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        handleEditClient(client);
                      }}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    
                    <div className="flex items-center gap-3 mb-3">
                      {client.logo_url ? (
                        <img
                          src={client.logo_url}
                          alt={`${client.name} logo`}
                          className="w-8 h-8 object-cover rounded-lg border border-slate-200"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                          <BarChart3 className="h-4 w-4 text-white" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-slate-900 truncate">
                          {client.name}
                        </h3>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                      {/* Facebook Ads */}
                      <div 
                        className={`flex items-center ${integrationStatusLoaded && integrationStatus.facebookAds ? 'opacity-100' : 'opacity-40'}`}
                        title={integrationStatusLoaded ? (integrationStatus.facebookAds ? 'Facebook Ads - Connected' : 'Facebook Ads - Not Connected') : 'Loading...'}
                      >
                        <LogoManager 
                          platform="meta" 
                          size={22} 
                          context="client-table"
                          className="text-slate-600"
                        />
                      </div>
                      
                      {/* Google Ads */}
                      <div 
                        className={`flex items-center ${integrationStatusLoaded && integrationStatus.googleAds ? 'opacity-100' : 'opacity-40'}`}
                        title={integrationStatusLoaded ? (integrationStatus.googleAds ? 'Google Ads - Connected' : 'Google Ads - Not Connected') : 'Loading...'}
                      >
                        <LogoManager 
                          platform="googleAds" 
                          size={22} 
                          context="client-table"
                          className="text-slate-600"
                        />
                      </div>
                      
                      {/* GoHighLevel */}
                      <div 
                        className={`flex items-center ${isClientGHLConnected(client) ? 'opacity-100' : 'opacity-40'}`}
                        title={isClientGHLConnected(client) ? 'GoHighLevel - Connected' : 'GoHighLevel - Not Connected'}
                      >
                        <LogoManager 
                          platform="goHighLevel" 
                          size={22} 
                          context="client-table"
                          className="text-slate-600"
                        />
                      </div>
                      
                      {/* Google Sheets */}
                      <div 
                        className={`flex items-center ${integrationStatusLoaded && integrationStatus.googleSheets ? 'opacity-100' : 'opacity-40'}`}
                        title={integrationStatusLoaded ? (integrationStatus.googleSheets ? 'Google Sheets - Connected' : 'Google Sheets - Not Connected') : 'Loading...'}
                      >
                        <LogoManager 
                          platform="googleSheets" 
                          size={22} 
                          context="client-table"
                          className="text-slate-600"
                        />
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
    </div>
  );
});
