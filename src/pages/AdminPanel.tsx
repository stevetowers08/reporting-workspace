import { AgencyPanel as RefactoredAgencyPanel } from "@/components/agency/AgencyPanel";
import { IntegrationErrorBoundary } from "@/components/error/IntegrationErrorBoundary";
import AddClientModal from "@/components/modals/AddClientModal";
import EditClientModal from "@/components/modals/EditClientModal";
import { useAgencyClients } from '@/hooks/useAgencyClients';
import { debugLogger } from '@/lib/debug';
import { DatabaseService } from "@/services/data/databaseService";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

interface Client {
  id: string;
  name: string;
  logo_url?: string;
  accounts: {
    facebookAds?: string;
    googleAds?: string;
    goHighLevel?: string;
    googleSheets?: string;
  };
  status: 'active' | 'paused' | 'inactive';
  shareable_link: string;
}

const AgencyPanel = () => {
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [showEditClientModal, setShowEditClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { clientId: routeClientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Use the agency clients hook to get access to loadClients
  const { loadClients } = useAgencyClients();

  // Handle OAuth success redirect and client edit route
  useEffect(() => {
    const connected = searchParams.get('connected');
    const ghlConnected = searchParams.get('ghl_connected');
    const googleAdsConnected = searchParams.get('googleAds_connected');
    const managerId = searchParams.get('manager_id');
    const location = searchParams.get('location');
    const locationName = searchParams.get('location_name');
    const clientId = searchParams.get('clientId') || routeClientId;
    
    if ((connected === 'true' || ghlConnected === 'true') && location) {
      setShowSuccessMessage(true);
      
      // If we have a clientId, load the client and show edit modal
      if (clientId) {
        loadClientForEdit(clientId);
      }
      
      // Clear the URL parameters after showing the message
      setSearchParams({});
    } else if (googleAdsConnected === 'true' && managerId) {
      // Handle Google Ads backend OAuth success
      debugLogger.info('AgencyPanel', 'Google Ads backend OAuth successful', { managerId });
      setShowSuccessMessage(true);
      
      // Clear the URL parameters after showing the message
      setSearchParams({});
      
      // Hide success message after 5 seconds
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 5000);
    }
    
    // Handle direct route to client edit
    if (routeClientId && !connected && !ghlConnected) {
      loadClientForEdit(routeClientId);
    }
  }, [searchParams, setSearchParams, routeClientId]);

  const loadClientForEdit = async (clientId: string) => {
    try {
      const client = await DatabaseService.getClient(clientId);
      if (client) {
        setEditingClient(client);
        setShowEditClientModal(true);
      }
    } catch (error) {
      debugLogger.error('AgencyPanel', 'Failed to load client for edit', error);
    }
  };

  const handleBackToDashboard = () => {
    navigate('/agency');
  };

  const handleAddClient = () => {
    setShowAddClientModal(true);
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setShowEditClientModal(true);
  };

  const handleAddClientSubmit = async (clientData: {
    name: string;
    logo_url?: string;
    status: 'active' | 'paused' | 'inactive';
  }) => {
    try {
      // Create client with minimal data (name and logo)
      await DatabaseService.createClient(clientData);
      setShowAddClientModal(false);
      
      // Invalidate React Query cache to refresh client data
      await queryClient.invalidateQueries({ queryKey: ['available-clients'] });
      
      // Also refresh the local client list
      await loadClients();
      
      // Show success message
      setShowSuccessMessage(true);
      debugLogger.info('AgencyPanel', 'Client created with minimal data, cache invalidated and list refreshed');
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 3000);
    } catch (error) {
      debugLogger.error('AGENCY', 'Failed to add client', error);
    }
  };

  const handleUpdateClientSubmit = async (clientId: string, updates: Partial<Client>) => {
    try {
      debugLogger.info('AgencyPanel', 'handleUpdateClientSubmit called', { clientId, updates });
      await DatabaseService.updateClient(clientId, updates);
      debugLogger.info('AgencyPanel', 'Client updated successfully');
      
      // Invalidate React Query cache to refresh client data
      queryClient.invalidateQueries({ queryKey: ['available-clients'] });
      queryClient.invalidateQueries({ queryKey: ['client-data', clientId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data', clientId] });
      
      // Trigger refresh in AgencyPanel component (it will handle the actual reload)
      setRefreshTrigger(prev => prev + 1);
      
      setShowEditClientModal(false);
      setEditingClient(null);
      
      debugLogger.info('AgencyPanel', 'Cache invalidated, refresh triggered');
    } catch (error) {
      debugLogger.error('AGENCY', 'Failed to update client', error);
    }
  };

  return (
    <IntegrationErrorBoundary>
      {/* Success Message */}
      {showSuccessMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-right duration-300">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="font-medium">
            {searchParams.get('ghl_connected') === 'true' 
              ? `GoHighLevel connected successfully!${searchParams.get('location_name') ? ` (${searchParams.get('location_name')})` : ''}`
              : 'GoHighLevel connected successfully!'
            }
          </span>
        </div>
      )}

        <RefactoredAgencyPanel
        onBackToDashboard={handleBackToDashboard}
        onAddClient={handleAddClient}
        onEditClient={handleEditClient}
        refreshTrigger={refreshTrigger}
      />

      {/* Modals */}
      {showAddClientModal && (
        <AddClientModal
          isOpen={showAddClientModal}
          onClose={() => setShowAddClientModal(false)}
          onAddClient={handleAddClientSubmit}
        />
      )}

      {showEditClientModal && editingClient && (
          <EditClientModal
            isOpen={showEditClientModal}
            client={editingClient}
            onClose={() => {
              setShowEditClientModal(false);
              setEditingClient(null);
            }}
            onUpdateClient={handleUpdateClientSubmit}
            onReloadClient={async () => {
              // Reload the client data after GHL connection
              if (editingClient?.id) {
                debugLogger.info('AdminPanel', 'Reloading client data after GHL connection', { clientId: editingClient.id });
                const updatedClient = await DatabaseService.getClient(editingClient.id);
                if (updatedClient) {
                  setEditingClient(updatedClient);
                  debugLogger.info('AdminPanel', 'Client data reloaded', { 
                    clientId: updatedClient.id,
                    goHighLevel: updatedClient.accounts?.goHighLevel 
                  });
                }
              }
            }}
          />
        )}
    </IntegrationErrorBoundary>
  );
};

export default AgencyPanel;