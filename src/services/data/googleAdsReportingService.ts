import { debugLogger } from '@/lib/debug';
import { DatabaseService } from '@/services/data/databaseService';
import { EventMetricsService } from '@/services/data/eventMetricsService';

export interface GoogleAdsReportingData {
  clientId: string;
  venueName: string;
  logoUrl?: string;
  status: string;
  googleAccount: {
    accountId: string;
    accountName: string;
    connected: boolean;
  };
  metrics: {
    leads: number;
    costPerLead: number;
    conversionRate: number;
    spent: number;
    impressions: number;
    clicks: number;
    costPerClick: number;
    ctr: number;
  };
  shareableLink?: string;
}

export interface GoogleAdsReportingResponse {
  data: GoogleAdsReportingData[];
  totalClients: number;
  activeAccounts: number;
  totalSpend: number;
  totalLeads: number;
}

export class GoogleAdsReportingService {
  constructor() {
    // No instance needed - using static methods
  }

  async getGoogleAdsReportingData(period: string = '30d'): Promise<GoogleAdsReportingResponse> {
    try {
      debugLogger.info('GOOGLE_REPORTING', 'Fetching Google Ads reporting data', { period });
      const clients = await DatabaseService.getAllClients();
      debugLogger.info('GOOGLE_REPORTING', 'Retrieved clients', { count: clients.length });

      if (!clients || clients.length === 0) {
        debugLogger.info('GOOGLE_REPORTING', 'No clients found, returning empty response');
        return { data: [], totalClients: 0, activeAccounts: 0, totalSpend: 0, totalLeads: 0 };
      }

      const googleClients = clients.filter(client =>
        client.accounts?.googleAds &&
        client.accounts.googleAds !== 'none'
      );

      console.log('🔍 Google Reporting: All clients:', clients.map(c => ({
        id: c.id,
        name: c.name,
        googleAds: c.accounts?.googleAds,
        services: c.services
      })));

      console.log('🔍 Google Reporting: Filtered Google clients:', googleClients.map(c => ({
        id: c.id,
        name: c.name,
        googleAds: c.accounts?.googleAds
      })));

      const reportingData: GoogleAdsReportingData[] = [];
      let totalSpend = 0;
      let totalLeads = 0;
      let activeAccounts = 0;

      for (const client of googleClients) {
        try {
          debugLogger.info('GOOGLE_REPORTING', `Fetching metrics for client ${client.name}`, { clientId: client.id, period });

          const endDate = new Date();
          const startDate = new Date();
          switch (period) {
            case '7d': startDate.setDate(endDate.getDate() - 7); break;
            case '14d': startDate.setDate(endDate.getDate() - 14); break;
            case '30d': startDate.setDate(endDate.getDate() - 30); break;
            case 'lastMonth': 
              startDate.setMonth(endDate.getMonth() - 1, 1);
              endDate.setDate(0); // Last day of previous month
              break;
            case '90d': startDate.setDate(endDate.getDate() - 90); break;
            default: startDate.setDate(endDate.getDate() - 30);
          }

          const dateRange = {
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0]
          };

          const dashboardData = await EventMetricsService.getComprehensiveMetrics(
            client.id,
            dateRange,
            client.accounts,
            client.conversion_actions
          );

          debugLogger.info('GOOGLE_REPORTING', `Dashboard data for ${client.name}`, {
            hasData: !!dashboardData,
            hasGoogleMetrics: !!dashboardData?.googleMetrics,
            googleMetrics: dashboardData?.googleMetrics
          });

          if (dashboardData?.googleMetrics) {
            const metrics = dashboardData.googleMetrics;
            const costPerLead = metrics.leads > 0 ? metrics.cost / metrics.leads : 0;
            const conversionRate = metrics.clicks > 0 ? (metrics.leads / metrics.clicks) * 100 : 0;
            const costPerClick = metrics.clicks > 0 ? metrics.cost / metrics.clicks : 0;

            const clientData: GoogleAdsReportingData = {
              clientId: client.id,
              venueName: client.name,
              logoUrl: client.logo_url,
              status: client.status,
              googleAccount: {
                accountId: client.accounts?.googleAds || '',
                accountName: client.name,
                connected: true
              },
              metrics: {
                leads: metrics.leads || 0,
                costPerLead,
                conversionRate,
                spent: metrics.cost || 0,
                impressions: metrics.impressions || 0,
                clicks: metrics.clicks || 0,
                costPerClick,
                ctr: metrics.ctr || 0
              },
              shareableLink: client.shareable_link || ''
            };
            reportingData.push(clientData);
            totalSpend += metrics.cost || 0;
            totalLeads += metrics.leads || 0;
            if (metrics.cost > 0 || metrics.leads > 0) { activeAccounts++; }
          } else {
            debugLogger.info('GOOGLE_REPORTING', `No Google metrics for ${client.name}, creating zero data entry`);
            const clientData: GoogleAdsReportingData = {
              clientId: client.id,
              venueName: client.name,
              logoUrl: client.logo_url,
              status: client.status,
              googleAccount: {
                accountId: client.accounts?.googleAds || '',
                accountName: client.name,
                connected: true
              },
              metrics: { leads: 0, costPerLead: 0, conversionRate: 0, spent: 0, impressions: 0, clicks: 0, costPerClick: 0, ctr: 0 },
              shareableLink: client.shareable_link || ''
            };
            reportingData.push(clientData);
          }
        } catch (error) {
          debugLogger.error('GOOGLE_REPORTING', `Error fetching data for client ${client.id}`, error);
          const clientData: GoogleAdsReportingData = {
            clientId: client.id,
            venueName: client.name,
            logoUrl: client.logo_url,
            status: client.status,
            googleAccount: {
              accountId: client.accounts?.googleAds || '',
              accountName: client.name,
              connected: false
            },
            metrics: { leads: 0, costPerLead: 0, conversionRate: 0, spent: 0, impressions: 0, clicks: 0, costPerClick: 0, ctr: 0 },
            shareableLink: client.shareable_link || ''
          };
          reportingData.push(clientData);
        }
      }

      const response: GoogleAdsReportingResponse = {
        data: reportingData,
        totalClients: googleClients.length,
        activeAccounts,
        totalSpend,
        totalLeads
      };

      debugLogger.info('GOOGLE_REPORTING', 'Google Ads reporting data fetched successfully', {
        totalClients: response.totalClients, 
        activeAccounts: response.activeAccounts, 
        totalSpend: response.totalSpend, 
        totalLeads: response.totalLeads
      });

      return response;
    } catch (error) {
      debugLogger.error('GOOGLE_REPORTING', 'Error fetching Google Ads reporting data', error);
      return { data: [], totalClients: 0, activeAccounts: 0, totalSpend: 0, totalLeads: 0 };
    }
  }

  getAvailablePeriods() {
    return [
      { value: '7d', label: 'Last 7 days' },
      { value: '14d', label: 'Last 14 days' },
      { value: '30d', label: 'Last 30 days' },
      { value: 'lastMonth', label: 'Last month' },
      { value: '90d', label: 'Last 90 days' }
    ];
  }
}

export const googleAdsReportingService = new GoogleAdsReportingService();
