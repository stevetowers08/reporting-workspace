import { AgencyHeader } from '@/components/dashboard/AgencyHeader';
import AddClientModal from '@/components/modals/AddClientModal';
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
  onRefreshClients?: () => Promise<void>;
  loading?: boolean;
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
        }
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
              className="bg-blue-600 hover:bg-blue-700 text-white"
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
                  className="bg-blue-600 hover:bg-blue-700 text-white"
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
                  className="cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.01] border-slate-200 relative group"
                  onClick={() => onClientSelect(client.id)}
                >
                  <CardContent className="p-3">
                    {/* Edit Button - positioned like agency page */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 h-6 w-6 p-0 text-slate-500 hover:text-slate-700 hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-opacity z-10"
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
                          className="w-8 h-8 object-cover rounded-lg border border-slate-200 shadow-sm"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
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
                        className={`flex items-center ${client.accounts?.facebookAds && client.accounts.facebookAds !== 'none' ? 'opacity-100' : 'opacity-40'}`}
                        title={client.accounts?.facebookAds && client.accounts.facebookAds !== 'none' ? 'Facebook Ads - Connected' : 'Facebook Ads - Not Connected'}
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
                        className={`flex items-center ${client.accounts?.googleAds && client.accounts.googleAds !== 'none' ? 'opacity-100' : 'opacity-40'}`}
                        title={client.accounts?.googleAds && client.accounts.googleAds !== 'none' ? 'Google Ads - Connected' : 'Google Ads - Not Connected'}
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
                        className={`flex items-center ${client.accounts?.googleSheets && client.accounts.googleSheets !== 'none' ? 'opacity-100' : 'opacity-40'}`}
                        title={client.accounts?.googleSheets && client.accounts.googleSheets !== 'none' ? 'Google Sheets - Connected' : 'Google Sheets - Not Connected'}
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
