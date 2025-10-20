import { AIInsightsTab } from '@/components/agency/AIInsightsTab';
import { ClientManagementTab } from '@/components/agency/ClientManagementTab';
import { IntegrationManagementTab } from '@/components/agency/IntegrationManagementTab';
import { AgencyHeader } from '@/components/dashboard/AgencyHeader';
import { AGENCY_TABS, StandardizedTabs } from '@/components/ui/StandardizedTabs';
import { PageLoader } from '@/components/ui/UnifiedLoadingSystem';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { useAgencyClients } from '@/hooks/useAgencyClients';
import { useIntegrations } from '@/hooks/useIntegrations';
import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface AgencyPanelProps {
  onBackToDashboard: () => void;
  onAddClient?: () => void;
  onEditClient?: (client: unknown) => void;
}

export const AgencyPanel: React.FC<AgencyPanelProps> = ({
  onBackToDashboard,
  onAddClient,
  onEditClient
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Determine active tab from URL path
  const getActiveTabFromPath = (pathname: string): string => {
    if (pathname.includes('/integrations')) {return 'integrations';}
    if (pathname.includes('/ai-insights')) {return 'ai-insights';}
    if (pathname.includes('/clients')) {return 'clients';}
    return 'clients'; // default
  };
  
  const [activeTab, setActiveTab] = useState(getActiveTabFromPath(location.pathname));
  const hasLoadedRef = useRef(false);
  
  // Use our custom hooks
  const {
    clients,
    loading: clientsLoading,
    deleting,
    loadClients,
    deleteClient,
    setDeleting
  } = useAgencyClients();

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

  // Load data on component mount (only once)
  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadClients();
      loadIntegrations();
    }
  }, [loadClients, loadIntegrations]);

  // Sync active tab with URL changes
  useEffect(() => {
    const newActiveTab = getActiveTabFromPath(location.pathname);
    setActiveTab(newActiveTab);
  }, [location.pathname]);

  // Handle tab change with URL navigation
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    navigate(`/agency/${newTab}`);
  };

  const handleAddClient = () => {
    if (onAddClient) {
      onAddClient();
    } else {
      // Handle case where no handler is provided
    }
  };

  const handleEditClient = (client: unknown) => {
    if (onEditClient) {
      onEditClient(client);
    } else {
      // Handle case where no handler is provided
    }
  };

  const handleOpenClient = (clientId: string) => {
    navigate(`/dashboard/${clientId}`);
  };

  const handleDeleteClient = async (clientId: string, clientName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${clientName}? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeleting(clientId, true);
      await deleteClient(clientId);
    } catch (error) {
      console.error('AgencyPanel', 'Failed to delete client', error);
      window.alert('Failed to delete client. Please try again.');
    } finally {
      setDeleting(clientId, false);
    }
  };

  const handleConnectIntegration = async (platform: string) => {
    try {
      await connectIntegration(platform);
    } catch (error) {
      console.error('AgencyPanel', `Failed to connect ${platform}`, error);
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
      console.error('AgencyPanel', `Failed to disconnect ${platform}`, error);
      window.alert(`Failed to disconnect ${platform}. Please try again.`);
    }
  };

  const handleTestConnection = async (platform: string) => {
    try {
      setTesting(platform, true);
      const result = await testConnection(platform);
      return result;
    } catch (error) {
      console.error('AgencyPanel', `Failed to test ${platform}`, error);
      return { success: false, message: `Test failed: ${error}` };
    } finally {
      setTesting(platform, false);
    }
  };

  const loading = clientsLoading || integrationsLoading;

  if (loading) {
    return <PageLoader message="Loading agency panel..." />;
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Use AgencyHeader for consistency */}
      <AgencyHeader
        clients={[]}
        selectedClientId={undefined}
        onClientSelect={() => {}}
        onBackToDashboard={onBackToDashboard}
        onGoToAgency={() => {}}
        onExportPDF={() => {}}
        onShare={() => {}}
        exportingPDF={false}
        isShared={false}
        showVenueSelector={false}
        isAgencyPanel={true}
      />

      <div className="px-20 py-6">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          {/* Tab Navigation - Using Standardized Component */}
          <StandardizedTabs 
            value={activeTab} 
            onValueChange={handleTabChange} 
            tabs={AGENCY_TABS}
          />

          {/* Client Management Tab */}
          <TabsContent value="clients" className="mt-0">
            <ClientManagementTab
              clients={clients}
              loading={clientsLoading}
              deleting={deleting}
              onAddClient={handleAddClient}
              onEditClient={handleEditClient}
              onDeleteClient={handleDeleteClient}
              onOpenClient={handleOpenClient}
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
