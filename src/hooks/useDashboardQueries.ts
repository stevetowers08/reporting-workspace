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
export const useDashboardData = (clientId: string | undefined, dateRange?: { start: string; end: string }, clientData?: Client | null) => {
  return useQuery({
    queryKey: ['dashboard-data', clientId, dateRange, 'with-previous-period'],
    queryFn: async ({ signal }): Promise<EventDashboardData> => {
      if (!clientId) {throw new Error('Client ID is required');}
      
      // Use provided client data or fetch if not available
      let finalClientData = clientData;
      if (!finalClientData) {
        finalClientData = await DatabaseService.getClientById(clientId);
      }
      if (!finalClientData) {throw new Error('Client not found');}
      
      // Check for cancellation
      if (signal?.aborted) {
        throw new Error('Request cancelled');
      }
      
      // Extract account information from client data
      const clientAccounts = {
        facebookAds: finalClientData.accounts?.facebookAds,
        googleAds: finalClientData.accounts?.googleAds,
        goHighLevel: finalClientData.accounts?.goHighLevel,
        googleSheets: finalClientData.accounts?.googleSheets,
        googleSheetsConfig: finalClientData.accounts?.googleSheetsConfig
      };
      
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
      
      console.log('🚀 useDashboardQueries calling EventMetricsService', { clientId, finalDateRange, clientAccounts });
      const result = await EventMetricsService.getComprehensiveMetrics(
        clientId,
        finalDateRange,
        clientAccounts,
        undefined, // clientConversionActions
        true, // includePreviousPeriod
        signal // Pass abort signal
      );
      console.log('✅ useDashboardQueries got result', result);
      
      return result;
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000, // 5 minutes - standardized
    gcTime: 15 * 60 * 1000, // 15 minutes - standardized
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

// Custom hook for fetching client data
export const useClientData = (clientId: string | undefined) => {
  return useQuery({
    queryKey: ['client-data', clientId],
    queryFn: async (): Promise<Client | null> => {
      if (!clientId) {throw new Error('Client ID is required');}
      return await DatabaseService.getClientById(clientId);
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000, // 5 minutes - standardized
    gcTime: 15 * 60 * 1000, // 15 minutes - standardized
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
    staleTime: 5 * 60 * 1000, // 5 minutes - standardized
    gcTime: 15 * 60 * 1000, // 15 minutes - standardized
    retry: 3,
  });
};
