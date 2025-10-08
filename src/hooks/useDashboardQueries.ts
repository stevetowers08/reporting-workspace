import { DatabaseService } from '@/services/data/databaseService';
import { EventDashboardData, EventMetricsService } from '@/services/data/eventMetricsService';
import { useQuery } from '@tanstack/react-query';

interface Client {
  id: string;
  name: string;
  logo_url?: string;
  type?: string;
}

// Custom hook for fetching dashboard data with React Query
export const useDashboardData = (clientId: string | undefined, dateRange?: { start: string; end: string }) => {
  return useQuery({
    queryKey: ['dashboard-data', clientId, dateRange],
    queryFn: async (): Promise<EventDashboardData> => {
      if (!clientId) throw new Error('Client ID is required');
      
      console.log('🔍 useDashboardData: Starting data fetch for client:', clientId);
      
      // Get client data first to extract account information
      const clientData = await DatabaseService.getClientById(clientId);
      if (!clientData) throw new Error('Client not found');
      
      console.log('🔍 useDashboardData: Client data:', clientData);
      
      // Extract account information from client data
      const clientAccounts = {
        facebookAds: clientData.accounts?.facebookAds,
        googleAds: clientData.accounts?.googleAds,
        goHighLevel: clientData.accounts?.goHighLevel,
        googleSheets: clientData.accounts?.googleSheets
      };
      
      console.log('🔍 useDashboardData: Client accounts:', clientAccounts);
      
      // Use provided date range or default to last 30 days
      const finalDateRange = dateRange || (() => {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 30);
        
        return {
          start: startDate.toISOString().split('T')[0], 
          end: endDate.toISOString().split('T')[0] 
        };
      })();
      
      console.log('🔍 useDashboardData: Date range:', finalDateRange);
      
      const result = await EventMetricsService.getComprehensiveMetrics(
        clientId,
        finalDateRange,
        clientAccounts
      );
      
      console.log('🔍 useDashboardData: Final result:', result);
      return result;
    },
    enabled: !!clientId,
    staleTime: 10 * 60 * 1000, // 10 minutes - increased to reduce duplicate calls
    gcTime: 30 * 60 * 1000, // 30 minutes - increased cache time
    retry: 2, // Reduced retries
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Reduced max delay
    refetchOnWindowFocus: false, // Prevent refetch on window focus
    refetchOnMount: false, // Prevent refetch on component mount if data is fresh
  });
};

// Custom hook for fetching client data
export const useClientData = (clientId: string | undefined) => {
  return useQuery({
    queryKey: ['client-data', clientId],
    queryFn: async (): Promise<Client | null> => {
      if (!clientId) throw new Error('Client ID is required');
      return await DatabaseService.getClientById(clientId);
    },
    enabled: !!clientId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 3,
  });
};

// Custom hook for fetching available clients
export const useAvailableClients = () => {
  return useQuery({
    queryKey: ['available-clients'],
    queryFn: async (): Promise<Client[]> => {
      return await DatabaseService.getAllClients();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    retry: 3,
  });
};
