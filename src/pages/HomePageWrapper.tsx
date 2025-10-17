import { HomePage } from "@/components/dashboard/HomePage";
import { debugLogger } from "@/lib/debug";
import { DatabaseService } from "@/services/data/databaseService";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface Client {
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
      spreadsheetName?: string;
    };
  };
}

interface Integration {
  id: string;
  name: string;
  platform: string;
  status: 'connected' | 'not connected' | 'error';
  clientsUsing: number;
}

const HomePageWrapper = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [_integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [clientsData, integrationsData] = await Promise.all([
        DatabaseService.getAllClients(),
        DatabaseService.getIntegrations()
      ]);
      
      // Transform clients data - include ALL fields from the database
      const transformedClients: Client[] = (clientsData || []).map(client => ({
        id: client.id,
        name: client.name,
        type: client.type,
        status: client.status,
        location: client.location,
        logo_url: client.logo_url,
        services: client.services,
        accounts: {
          facebookAds: client.accounts?.facebookAds,
          googleAds: client.accounts?.googleAds,
          goHighLevel: client.accounts?.goHighLevel,
          googleSheets: client.accounts?.googleSheets,
          googleSheetsConfig: client.accounts?.googleSheetsConfig
        },
        conversion_actions: client.conversion_actions,
        googleSheetsConfig: client.googleSheetsConfig, // Include top-level field
        shareable_link: client.shareable_link,
        created_at: client.created_at,
        updated_at: client.updated_at
      }));
      
      // Transform integrations data
      const transformedIntegrations: Integration[] = (integrationsData || []).map(integration => ({
        id: integration.id,
        name: integration.platform === 'facebookAds' ? 'Facebook Ads' :
              integration.platform === 'googleAds' ? 'Google Ads' :
              integration.platform === 'goHighLevel' ? 'GoHighLevel' :
              integration.platform === 'googleSheets' ? 'Google Sheets' : integration.platform,
        platform: integration.platform,
        status: integration.connected ? 'connected' : 'not connected',
        clientsUsing: 0 // This would need to be calculated
      }));
      
      setClients(transformedClients);
      setIntegrations(transformedIntegrations);
    } catch (error) {
      debugLogger.error('HomePageWrapper', 'Failed to load homepage data', error);
      setClients([]);
      setIntegrations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClientSelect = (clientId: string) => {
    navigate(`/dashboard/${clientId}`);
  };

  const _handleAddClient = () => {
    navigate('/agency');
  };

  const handleGoToAgency = () => {
    navigate('/agency');
  };

  return (
    <HomePage
      clients={clients}
      onClientSelect={handleClientSelect}
      onGoToAgency={handleGoToAgency}
      onRefreshClients={loadData}
      loading={loading}
    />
  );
};

export default HomePageWrapper;
