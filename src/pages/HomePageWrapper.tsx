import { HomePage } from "@/components/dashboard/HomePage";
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
  const [integrations, setIntegrations] = useState<Integration[]>([]);
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
      
      // Transform clients data
      const transformedClients: Client[] = (clientsData || []).map(client => ({
        id: client.id,
        name: client.name,
        logo_url: client.logo_url,
        status: client.status as 'active' | 'paused' | 'inactive',
        accounts: {
          facebookAds: client.facebook_ads_account_id,
          googleAds: client.google_ads_account_id,
          goHighLevel: client.gohighlevel_account_id,
          googleSheets: client.google_sheets_account_id
        }
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
      console.error('Failed to load homepage data:', error);
      setClients([]);
      setIntegrations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClientSelect = (clientId: string) => {
    navigate(`/dashboard/${clientId}`);
  };

  const handleAddClient = () => {
    navigate('/admin');
  };

  const handleGoToAdmin = () => {
    navigate('/admin');
  };

  return (
    <HomePage
      clients={clients}
      integrations={integrations}
      onClientSelect={handleClientSelect}
      onAddClient={handleAddClient}
      onGoToAdmin={handleGoToAdmin}
      loading={loading}
    />
  );
};

export default HomePageWrapper;
