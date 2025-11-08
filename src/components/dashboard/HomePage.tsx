import { AgencyHeader } from '@/components/dashboard/AgencyHeader';
import EditClientModal from '@/components/modals/EditClientModal';
import { LogoManager } from '@/components/ui/LogoManager';
import { PageLoader } from '@/components/ui/UnifiedLoadingSystem';
import { Button } from '@/components/ui/button';
import { useIntegrationStatus } from '@/hooks/useIntegrationStatus';
import { DatabaseService } from '@/services/data/databaseService';
import {
    BarChart3,
    Edit,
    Plus,
    Users
} from 'lucide-react';
import React, { useState } from 'react';

import { Card, CardContent } from '@/components/ui/card';
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

  // Use shared integration status hook instead of local state and direct database calls
  const { data: integrationStatus, isLoading: integrationStatusLoading } = useIntegrationStatus();
  
  // Check if a client has integrations configured (client-level checks)
  const isClientConnected = (client: Client, platform: 'facebookAds' | 'googleAds' | 'goHighLevel' | 'googleSheets'): boolean => {
    const account = client.accounts[platform];
    
    if (platform === 'goHighLevel') {
      return typeof account === 'string' 
        ? account && account !== 'none'
        : (account as any)?.locationId && (account as any)?.locationId !== 'none';
    }
    
    // For other platforms, check if account ID exists and is not 'none'
    return Boolean(account && account !== 'none');
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
  }) => {
    try {
      // Create client with minimal data (name and logo)
      const newClient = await DatabaseService.createClient(clientData);
      
      // Close modal
      setShowEditClientModal(false);
      setEditingClient(null);
      
      // Add a small delay before refresh to ensure database operation completes
      setTimeout(() => {
        window.location.reload();
      }, 500);
      
    } catch (error) {
      console.error('Failed to create client:', error);
      
      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to create client: ${errorMessage}`);
      
      // Keep modal open so user can retry
    }
  };

  const handleUpdateClient = async (clientId: string, updates: Partial<Client>) => {
    try {
      await DatabaseService.updateClient(clientId, updates);
      setShowEditClientModal(false);
      setEditingClient(null);
      
      // Show success message
      
      // Refresh the page to show updated data
      window.location.reload();
    } catch (error) {
      // console.error('Failed to update client:', error);
      
      // Show user-friendly error message
      const _errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      // alert(`Failed to update client: ${errorMessage}`);
      
      // Keep modal open so user can retry
    }
  };


  if (loading) {
    return <PageLoader message="Loading dashboard..." />;
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
              className="h-8 bg-blue-600 text-white"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
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
                        className={`flex items-center ${isClientConnected(client, 'facebookAds') ? 'opacity-100' : 'opacity-40'}`}
                        title={isClientConnected(client, 'facebookAds') ? 'Facebook Ads - Connected' : 'Facebook Ads - Not Connected'}
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
                        className={`flex items-center ${isClientConnected(client, 'googleAds') ? 'opacity-100' : 'opacity-40'}`}
                        title={isClientConnected(client, 'googleAds') ? 'Google Ads - Connected' : 'Google Ads - Not Connected'}
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
                        className={`flex items-center ${isClientConnected(client, 'goHighLevel') ? 'opacity-100' : 'opacity-40'}`}
                        title={isClientConnected(client, 'goHighLevel') ? 'GoHighLevel - Connected' : 'GoHighLevel - Not Connected'}
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
                        className={`flex items-center ${isClientConnected(client, 'googleSheets') ? 'opacity-100' : 'opacity-40'}`}
                        title={isClientConnected(client, 'googleSheets') ? 'Google Sheets - Connected' : 'Google Sheets - Not Connected'}
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
