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
  };
}

// Removed unused Integration interface - integration status is now handled by useIntegrationStatus hook

const HomePageWrapper = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Only fetch clients data - integration status is handled by useIntegrationStatus hook
      const clientsData = await DatabaseService.getAllClients();
      
      // Transform clients data
      const transformedClients: Client[] = (clientsData || []).map(client => ({
        id: client.id,
        name: client.name,
        logo_url: client.logo_url,
        status: client.status as 'active' | 'paused' | 'inactive',
        accounts: {
          facebookAds: client.accounts?.facebookAds,
          googleAds: client.accounts?.googleAds,
          goHighLevel: client.accounts?.goHighLevel,
          googleSheets: client.accounts?.googleSheets
        }
      }));
      
      setClients(transformedClients);
    } catch (error) {
      debugLogger.error('HomePageWrapper', 'Failed to load clients data', error);
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClientSelect = (clientId: string) => {
    navigate(`/dashboard/${clientId}`);
  };

  const handleAddClient = () => {
    navigate('/agency');
  };

  const handleGoToAgency = () => {
    navigate('/agency');
  };

  return (
    <HomePage
      clients={clients}
      onClientSelect={handleClientSelect}
      onAddClient={handleAddClient}
      onGoToAgency={handleGoToAgency}
      loading={loading}
    />
  );
};

export default HomePageWrapper;
