import { AIInsightsTab } from '@/components/admin/AIInsightsTab';
import { ClientManagementTab } from '@/components/admin/ClientManagementTab';
import { IntegrationManagementTab } from '@/components/admin/IntegrationManagementTab';
import { AdminHeader } from '@/components/dashboard/AdminHeader';
import { LoadingState } from '@/components/ui/LoadingStates';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdminClients } from '@/hooks/useAdminClients';
import { useIntegrations } from '@/hooks/useIntegrations';
import { Bot, Settings, Users } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface AdminPanelProps {
  onBackToDashboard: () => void;
  onAddClient?: () => void;
  onEditClient?: (client: any) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  onBackToDashboard,
  onAddClient,
  onEditClient
}) => {
  const [activeTab, setActiveTab] = useState("clients");
  
  // Use our custom hooks
  const {
    clients,
    loading: clientsLoading,
    deleting,
    loadClients,
    deleteClient,
    setDeleting
  } = useAdminClients();

  const {
    integrations,
    loading: integrationsLoading,
    testing,
    testResults,
    loadIntegrations,
    connectIntegration,
    disconnectIntegration,
    testConnection,
    setTesting
  } = useIntegrations();

  // Load data on component mount
  useEffect(() => {
    loadClients();
    loadIntegrations();
  }, [loadClients, loadIntegrations]);

  const handleAddClient = () => {
    if (onAddClient) {
      onAddClient();
    } else {
      console.log('Add client clicked - no handler provided');
    }
  };

  const handleEditClient = (client: any) => {
    if (onEditClient) {
      onEditClient(client);
    } else {
      console.log('Edit client clicked - no handler provided', client);
    }
  };

  const handleDeleteClient = async (clientId: string, clientName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${clientName}? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeleting(clientId, true);
      await deleteClient(clientId);
    } catch (error) {
      console.error('Failed to delete client:', error);
      window.alert('Failed to delete client. Please try again.');
    } finally {
      setDeleting(clientId, false);
    }
  };

  const handleConnectIntegration = async (platform: string) => {
    try {
      await connectIntegration(platform);
    } catch (error) {
      console.error(`Failed to connect ${platform}:`, error);
      window.alert(`Failed to connect ${platform}. Please try again.`);
    }
  };

  const handleDisconnectIntegration = async (platform: string) => {
    if (!window.confirm(`Are you sure you want to disconnect ${platform}? This will affect all clients using this integration.`)) {
      return;
    }

    try {
      await disconnectIntegration(platform);
    } catch (error) {
      console.error(`Failed to disconnect ${platform}:`, error);
      window.alert(`Failed to disconnect ${platform}. Please try again.`);
    }
  };

  const handleTestConnection = async (platform: string) => {
    try {
      setTesting(platform, true);
      const result = await testConnection(platform);
      return result;
    } catch (error) {
      console.error(`Failed to test ${platform}:`, error);
      return { success: false, message: `Test failed: ${error}` };
    } finally {
      setTesting(platform, false);
    }
  };

  const loading = clientsLoading || integrationsLoading;

  if (loading) {
    return <LoadingState message="Loading admin panel..." fullScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Use AdminHeader for consistency */}
      <AdminHeader
        clients={[]}
        selectedClientId={undefined}
        onClientSelect={() => {}}
        onBackToDashboard={onBackToDashboard}
        onGoToAdmin={() => {}}
        onExportPDF={() => {}}
        onShare={() => {}}
        exportingPDF={false}
        isShared={false}
        showVenueSelector={false}
        isAdminPanel={true}
      />

      <div className="px-20 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Properly sized Tab Navigation */}
          <TabsList className="bg-white rounded-lg p-0.5 h-10 border border-slate-200 shadow-sm grid grid-cols-3">
            <TabsTrigger 
              value="clients" 
              className="text-sm font-semibold px-3 py-2 rounded-md data-[state=active]:bg-slate-100 data-[state=active]:text-slate-700 text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition-all duration-200 flex items-center justify-center gap-1.5 border-r border-slate-200 last:border-r-0 h-full"
            >
              <Users className="h-4 w-4" />
              Venue Management
            </TabsTrigger>
            <TabsTrigger 
              value="integrations" 
              className="text-sm font-semibold px-3 py-2 rounded-md data-[state=active]:bg-slate-100 data-[state=active]:text-slate-700 text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition-all duration-200 flex items-center justify-center gap-1.5 border-r border-slate-200 last:border-r-0 h-full"
            >
              <Settings className="h-4 w-4" />
              Service Integrations
            </TabsTrigger>
            <TabsTrigger 
              value="ai-insights" 
              data-testid="ai-insights-tab"
              className="text-sm font-semibold px-3 py-2 rounded-md data-[state=active]:bg-slate-100 data-[state=active]:text-slate-700 text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition-all duration-200 flex items-center justify-center gap-1.5 border-r border-slate-200 last:border-r-0 h-full"
            >
              <Bot className="h-4 w-4" />
              AI Insights
            </TabsTrigger>
          </TabsList>

          {/* Client Management Tab */}
          <TabsContent value="clients" className="mt-0">
            <ClientManagementTab
              clients={clients}
              loading={clientsLoading}
              deleting={deleting}
              onAddClient={handleAddClient}
              onEditClient={handleEditClient}
              onDeleteClient={handleDeleteClient}
            />
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="mt-0">
            <IntegrationManagementTab
              integrations={integrations}
              loading={integrationsLoading}
              testing={testing}
              testResults={testResults}
              onConnectIntegration={handleConnectIntegration}
              onDisconnectIntegration={handleDisconnectIntegration}
              onTestConnection={handleTestConnection}
            />
          </TabsContent>

          {/* AI Insights Tab */}
          <TabsContent value="ai-insights" className="mt-0">
            <AIInsightsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
