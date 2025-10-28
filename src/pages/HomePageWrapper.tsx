import { HomePage } from "@/components/dashboard/HomePage";
import { debugLogger } from "@/lib/debug";
import { DatabaseService } from "@/services/data/databaseService";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

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

  // Use React Query to fetch clients - this will auto-update when 'available-clients' cache is invalidated
  const { data: clientsData = [], isLoading: loading } = useQuery({
    queryKey: ['available-clients'],
    queryFn: async () => {
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
      return transformedClients;
    },
    staleTime: 1 * 60 * 1000, // 1 minute - short cache to allow updates
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  const clients = clientsData || [];

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
