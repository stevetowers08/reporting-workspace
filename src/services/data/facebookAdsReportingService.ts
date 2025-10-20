import { FacebookMetricsWithTrends, TrendResult } from '@/types';
import { DatabaseService } from './databaseService';
import { EventMetricsService } from './eventMetricsService';
import { debugLogger } from '@/lib/debug';

export interface FacebookAdsReportingData {
  clientId: string;
  venueName: string;
  logoUrl?: string;
  status: 'active' | 'paused' | 'inactive';
  facebookAccount: {
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
  trends?: {
    leads: { direction: 'up' | 'down'; percentage: number };
    costPerLead: { direction: 'up' | 'down'; percentage: number };
    conversionRate: { direction: 'up' | 'down'; percentage: number };
    spent: { direction: 'up' | 'down'; percentage: number };
    impressions: { direction: 'up' | 'down'; percentage: number };
    clicks: { direction: 'up' | 'down'; percentage: number };
    costPerClick: { direction: 'up' | 'down'; percentage: number };
    ctr: { direction: 'up' | 'down'; percentage: number };
  };
  shareableLink: string;
}

export interface FacebookAdsReportingResponse {
  data: FacebookAdsReportingData[];
  totalClients: number;
  activeAccounts: number;
  totalSpend: number;
  totalLeads: number;
}

class FacebookAdsReportingService {
  constructor() {
    // No instance needed - using static methods
  }

  /**
   * Calculate trend percentage between current and previous period
   */
  private static calculateTrendPercentage(current: number, previous: number): { direction: 'up' | 'down'; percentage: number } {
    if (previous === 0) {
      return current > 0 ? { direction: 'up', percentage: 100 } : { direction: 'down', percentage: 0 };
    }
    
    const percentage = ((current - previous) / previous) * 100;
    return {
      direction: percentage >= 0 ? 'up' : 'down',
      percentage: Math.abs(percentage)
    };
  }

  /**
   * Calculate trends for all metrics
   */
  private static calculateTrends(currentMetrics: FacebookMetricsWithTrends, previousMetrics: FacebookMetricsWithTrends | undefined): TrendResult | undefined {
    if (!previousMetrics) {
      return undefined;
    }

    return {
      leads: this.calculateTrendPercentage(currentMetrics.leads, previousMetrics.leads),
      costPerLead: this.calculateTrendPercentage(
        currentMetrics.leads > 0 ? currentMetrics.spend / currentMetrics.leads : 0,
        previousMetrics.leads > 0 ? previousMetrics.spend / previousMetrics.leads : 0
      ),
      conversionRate: this.calculateTrendPercentage(
        currentMetrics.clicks > 0 ? (currentMetrics.leads / currentMetrics.clicks) * 100 : 0,
        previousMetrics.clicks > 0 ? (previousMetrics.leads / previousMetrics.clicks) * 100 : 0
      ),
      spent: this.calculateTrendPercentage(currentMetrics.spend, previousMetrics.spend),
      impressions: this.calculateTrendPercentage(currentMetrics.impressions, previousMetrics.impressions),
      clicks: this.calculateTrendPercentage(currentMetrics.clicks, previousMetrics.clicks),
      costPerClick: this.calculateTrendPercentage(
        currentMetrics.clicks > 0 ? currentMetrics.spend / currentMetrics.clicks : 0,
        previousMetrics.clicks > 0 ? previousMetrics.spend / previousMetrics.clicks : 0
      ),
      ctr: this.calculateTrendPercentage(currentMetrics.ctr, previousMetrics.ctr)
    };
  }

  /**
   * Fetch Facebook ads reporting data for all clients
   */
  async getFacebookAdsReportingData(period: string = '30d'): Promise<FacebookAdsReportingResponse> {
    try {
      debugLogger.info('FACEBOOK_REPORTING', 'Fetching Facebook ads reporting data', { period });

      // Get all clients
      const clients = await DatabaseService.getAllClients();
      debugLogger.info('FACEBOOK_REPORTING', 'Retrieved clients', { count: clients.length });

      // If no clients, return empty response
      if (!clients || clients.length === 0) {
        debugLogger.info('FACEBOOK_REPORTING', 'No clients found, returning empty response');
        return {
          data: [],
          totalClients: 0,
          activeAccounts: 0,
          totalSpend: 0,
          totalLeads: 0
        };
      }

      // Filter clients that have Facebook ads integration
      const facebookClients = clients.filter(client =>
        client.accounts?.facebookAds && 
        client.accounts.facebookAds !== 'none'
      );

      // Fetch metrics for each client
      const reportingData: FacebookAdsReportingData[] = [];
      let totalSpend = 0;
      let totalLeads = 0;
      let activeAccounts = 0;

      for (const client of facebookClients) {
        try {
          // Get dashboard data for this client
          debugLogger.info('FACEBOOK_REPORTING', `Fetching metrics for client ${client.name}`, { clientId: client.id, period });
          
          // Convert period to date range
          const endDate = new Date();
          const startDate = new Date();
          switch (period) {
            case '7d':
              startDate.setDate(endDate.getDate() - 7);
              break;
            case '14d':
              startDate.setDate(endDate.getDate() - 14);
              break;
            case '30d':
              startDate.setDate(endDate.getDate() - 30);
              break;
            case 'lastMonth':
              startDate.setMonth(endDate.getMonth() - 1, 1);
              endDate.setDate(0); // Last day of previous month
              break;
            case '90d':
              startDate.setDate(endDate.getDate() - 90);
              break;
            default:
              startDate.setDate(endDate.getDate() - 30);
          }
          
          const dateRange = {
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0]
          };
          
          const dashboardData = await EventMetricsService.getComprehensiveMetrics(
            client.id,
            dateRange,
            client.accounts,
            client.conversion_actions,
            true // Include previous period data
          );
          
          debugLogger.info('FACEBOOK_REPORTING', `Dashboard data for ${client.name}`, { 
            hasData: !!dashboardData,
            hasFacebookMetrics: !!dashboardData?.facebookMetrics,
            facebookMetrics: dashboardData?.facebookMetrics,
            facebookAccountId: client.accounts?.facebookAds,
            dateRange
          });
          
          if (dashboardData?.facebookMetrics) {
            const metrics = dashboardData.facebookMetrics;
            
            // Calculate derived metrics
            const costPerLead = metrics.leads > 0 ? metrics.spend / metrics.leads : 0;
            const conversionRate = metrics.clicks > 0 ? (metrics.leads / metrics.clicks) * 100 : 0;
            const costPerClick = metrics.clicks > 0 ? metrics.spend / metrics.clicks : 0;

            // Calculate trends if previous period data is available
            const trends = FacebookAdsReportingService.calculateTrends(metrics, metrics.previousPeriod);

            const clientData: FacebookAdsReportingData = {
              clientId: client.id,
              venueName: client.name,
              logoUrl: client.logo_url,
              status: client.status,
              facebookAccount: {
                accountId: client.accounts?.facebookAds || '',
                accountName: client.name, // Use client name as account name
                connected: true
              },
              metrics: {
                leads: metrics.leads || 0,
                costPerLead,
                conversionRate,
                spent: metrics.spend || 0,
                impressions: metrics.impressions || 0,
                clicks: metrics.clicks || 0,
                costPerClick,
                ctr: metrics.ctr || 0
              },
              trends,
              shareableLink: client.shareable_link || ''
            };

            reportingData.push(clientData);
            totalSpend += metrics.spend || 0;
            totalLeads += metrics.leads || 0;
            
            if (metrics.spend > 0 || metrics.leads > 0) {
              activeAccounts++;
            }
          } else {
            // Client with no Facebook data
            debugLogger.info('FACEBOOK_REPORTING', `No Facebook metrics for ${client.name}, creating zero data entry`);
            const clientData: FacebookAdsReportingData = {
              clientId: client.id,
              venueName: client.name,
              logoUrl: client.logo_url,
              status: client.status,
              facebookAccount: {
                accountId: client.accounts?.facebookAds || '',
                accountName: client.name,
                connected: true
              },
              metrics: {
                leads: 0,
                costPerLead: 0,
                conversionRate: 0,
                spent: 0,
                impressions: 0,
                clicks: 0,
                costPerClick: 0,
                ctr: 0
              },
              shareableLink: client.shareable_link || ''
            };

            reportingData.push(clientData);
          }
        } catch (error) {
          debugLogger.error('FACEBOOK_REPORTING', `Error fetching data for client ${client.id}`, error);
          
          // Add client with zero metrics on error
          const clientData: FacebookAdsReportingData = {
            clientId: client.id,
            venueName: client.name,
            logoUrl: client.logo_url,
            status: client.status,
            facebookAccount: {
              accountId: client.accounts?.facebookAds || '',
              accountName: client.name,
              connected: false
            },
            metrics: {
              leads: 0,
              costPerLead: 0,
              conversionRate: 0,
              spent: 0,
              impressions: 0,
              clicks: 0,
              costPerClick: 0,
              ctr: 0
            },
            shareableLink: client.shareable_link || ''
          };

          reportingData.push(clientData);
        }
      }

      const response: FacebookAdsReportingResponse = {
        data: reportingData,
        totalClients: facebookClients.length,
        activeAccounts,
        totalSpend,
        totalLeads
      };

      debugLogger.info('FACEBOOK_REPORTING', 'Facebook ads reporting data fetched successfully', {
        totalClients: response.totalClients,
        activeAccounts: response.activeAccounts,
        totalSpend: response.totalSpend,
        totalLeads: response.totalLeads
      });

      return response;
    } catch (error) {
      debugLogger.error('FACEBOOK_REPORTING', 'Error fetching Facebook ads reporting data', error);
      
      // Return empty response instead of throwing error to prevent page crash
      return {
        data: [],
        totalClients: 0,
        activeAccounts: 0,
        totalSpend: 0,
        totalLeads: 0
      };
    }
  }

  /**
   * Get available time periods
   */
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

export const facebookAdsReportingService = new FacebookAdsReportingService();
