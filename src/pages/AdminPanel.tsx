import { AdminPanel as RefactoredAdminPanel } from "@/components/admin/AdminPanel";
import { IntegrationErrorBoundary } from "@/components/error/IntegrationErrorBoundary";
import AddClientModal from "@/components/modals/AddClientModal";
import EditClientModal from "@/components/modals/EditClientModal";
import { debugLogger } from '@/lib/debug';
import { DatabaseService } from "@/services/data/databaseService";
import { useState } from "react";

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

const AdminPanel = () => {
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [showEditClientModal, setShowEditClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const handleBackToDashboard = () => {
    window.location.href = '/';
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
    accounts: { 
      facebookAds?: string; 
      googleAds?: string; 
      goHighLevel?: string; 
      googleSheets?: string; 
    }; 
    conversionActions?: { 
      facebookAds?: string; 
      googleAds?: string; 
    }; 
    googleSheetsConfig?: {
      spreadsheetId: string;
      sheetName: string;
    };
  }) => {
    try {
      await DatabaseService.createClient(clientData);
      setShowAddClientModal(false);
    } catch (error) {
      debugLogger.error('ADMIN', 'Failed to add client', error);
    }
  };

  const handleUpdateClientSubmit = async (clientId: string, updates: Partial<Client>) => {
    try {
      debugLogger.info('AdminPanel', 'handleUpdateClientSubmit called', { clientId, updates });
      await DatabaseService.updateClient(clientId, updates);
      debugLogger.info('AdminPanel', 'Client updated successfully');
      setShowEditClientModal(false);
      setEditingClient(null);
    } catch (error) {
      debugLogger.error('ADMIN', 'Failed to update client', error);
    }
  };

  return (
    <IntegrationErrorBoundary>
      <RefactoredAdminPanel
        onBackToDashboard={handleBackToDashboard}
        onAddClient={handleAddClient}
        onEditClient={handleEditClient}
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
          />
        )}
    </IntegrationErrorBoundary>
  );
};

export default AdminPanel;