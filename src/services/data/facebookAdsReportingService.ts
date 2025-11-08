import { debugLogger } from '@/lib/debug';
import { FacebookMetricsWithTrends, TrendResult } from '@/types';
import { AnalyticsOrchestrator } from './analyticsOrchestrator';
import { DatabaseService } from './databaseService';

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

export interface FacebookAdsReportingSummary {
  totalClients: number;
  activeAccounts: number;
  totalSpend: number;
  totalLeads: number;
}

export type ClientDataCallback = (clientData: FacebookAdsReportingData) => void;

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
  private calculateTrends(currentMetrics: FacebookMetricsWithTrends, previousMetrics: FacebookMetricsWithTrends | undefined): TrendResult | undefined {
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
   * Get summary statistics quickly without loading all client data
   * BEST PRACTICE: Load summary first for fast initial render
   */
  async getFacebookAdsReportingSummary(period: string = '30d'): Promise<FacebookAdsReportingSummary> {
    try {
      const clients = await DatabaseService.getAllClients();
      const facebookClients = clients.filter(client =>
        client.accounts?.facebookAds && 
        client.accounts.facebookAds !== 'none'
      );
      
      return {
        totalClients: facebookClients.length,
        activeAccounts: facebookClients.length,
        totalSpend: 0, // Will be calculated as data loads
        totalLeads: 0  // Will be calculated as data loads
      };
    } catch (error) {
      debugLogger.error('FACEBOOK_REPORTING', 'Error getting summary', error);
      return {
        totalClients: 0,
        activeAccounts: 0,
        totalSpend: 0,
        totalLeads: 0
      };
    }
  }

  /**
   * Fetch Facebook ads reporting data for all clients with progressive loading
   * BEST PRACTICE: Stream data as it loads, don't wait for everything
   */
  async getFacebookAdsReportingDataProgressive(
    period: string = '30d',
    onClientData?: ClientDataCallback
  ): Promise<FacebookAdsReportingResponse> {
    const summary = await this.getFacebookAdsReportingSummary(period);
    const reportingData: FacebookAdsReportingData[] = [];
    let totalSpend = 0;
    let totalLeads = 0;
    let activeAccounts = 0;

    try {
      const clients = await DatabaseService.getAllClients();
      const facebookClients = clients.filter(client =>
        client.accounts?.facebookAds && 
        client.accounts.facebookAds !== 'none'
      );

      if (!facebookClients || facebookClients.length === 0) {
        return {
          data: [],
          totalClients: 0,
          activeAccounts: 0,
          totalSpend: 0,
          totalLeads: 0
        };
      }

      const dateRange = this.getDateRangeForPeriod(period);
      const CLIENT_FETCH_TIMEOUT = 8000; // 8 seconds - enterprise standard (2-3s per account with batching)
      const INITIAL_BATCH_SIZE = 10; // Load first 10 accounts immediately for fast initial render
      const BATCH_SIZE = 5; // Then load remaining in smaller batches

      debugLogger.info('FACEBOOK_REPORTING', 'Starting progressive load', {
        totalClients: facebookClients.length,
        initialBatch: INITIAL_BATCH_SIZE,
        batchSize: BATCH_SIZE
      });

      const createTimeoutPromise = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
        return Promise.race([
          promise,
          new Promise<T>((_, reject) => 
            setTimeout(() => reject(new Error(`Client fetch timeout after ${timeoutMs}ms`)), timeoutMs)
          )
        ]);
      };

      // BEST PRACTICE: Load first batch immediately for fast initial render (enterprise standard: 2-3s)
      const initialBatch = facebookClients.slice(0, INITIAL_BATCH_SIZE);
      const initialResults = await Promise.allSettled(
        initialBatch.map(client => 
          createTimeoutPromise(
            (async () => {
              debugLogger.debug('FACEBOOK_REPORTING', 'Loading client', { clientId: client.id, accountId: client.accounts?.facebookAds });
              const facebookMetrics = await AnalyticsOrchestrator.getFacebookDataOnly(
                client.id,
                dateRange,
                client
              );
              return { client, facebookMetrics };
            })(),
            CLIENT_FETCH_TIMEOUT
          )
        )
      );

      // Process initial batch immediately
      for (let j = 0; j < initialResults.length; j++) {
        const result = initialResults[j];
        const client = initialBatch[j];
        
        if (result.status === 'fulfilled' && result.value.facebookMetrics) {
          const metrics = result.value.facebookMetrics;
          const costPerLead = metrics.leads > 0 ? metrics.spend / metrics.leads : 0;
          const conversionRate = metrics.clicks > 0 ? (metrics.leads / metrics.clicks) * 100 : 0;
          const costPerClick = metrics.clicks > 0 ? metrics.spend / metrics.clicks : 0;
          const trends = this.calculateTrends(metrics, metrics.previousPeriod);

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
          if (metrics.leads > 0 || metrics.spend > 0) activeAccounts++;

          // Emit data immediately for progressive rendering
          if (onClientData) {
            onClientData(clientData);
          }
        } else if (result.status === 'rejected') {
          debugLogger.warn('FACEBOOK_REPORTING', 'Client fetch failed', {
            clientId: client.id,
            accountId: client.accounts?.facebookAds,
            error: result.reason instanceof Error ? result.reason.message : String(result.reason)
          });
        }
      }

      // Process remaining clients in batches (load in background)
      for (let i = INITIAL_BATCH_SIZE; i < facebookClients.length; i += BATCH_SIZE) {
        const batch = facebookClients.slice(i, i + BATCH_SIZE);
        
        const batchResults = await Promise.allSettled(
          batch.map(client => 
            createTimeoutPromise(
              (async () => {
                const facebookMetrics = await AnalyticsOrchestrator.getFacebookDataOnly(
                  client.id,
                  dateRange,
                  client
                );
                return { client, facebookMetrics };
              })(),
              CLIENT_FETCH_TIMEOUT
            )
          )
        );

        // Process and emit each client's data as soon as it's ready
        for (let j = 0; j < batchResults.length; j++) {
          const result = batchResults[j];
          const client = batch[j];
          
          if (result.status === 'fulfilled' && result.value.facebookMetrics) {
            debugLogger.debug('FACEBOOK_REPORTING', 'Client loaded successfully', { clientId: client.id, accountId: client.accounts?.facebookAds });
            const metrics = result.value.facebookMetrics;
            const costPerLead = metrics.leads > 0 ? metrics.spend / metrics.leads : 0;
            const conversionRate = metrics.clicks > 0 ? (metrics.leads / metrics.clicks) * 100 : 0;
            const costPerClick = metrics.clicks > 0 ? metrics.spend / metrics.clicks : 0;
            const trends = this.calculateTrends(metrics, metrics.previousPeriod);

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
            if (metrics.leads > 0 || metrics.spend > 0) activeAccounts++;

            // Emit data immediately for progressive rendering
            if (onClientData) {
              onClientData(clientData);
            }
          } else if (result.status === 'rejected') {
            debugLogger.warn('FACEBOOK_REPORTING', 'Client fetch failed', {
              clientId: client.id,
              accountId: client.accounts?.facebookAds,
              error: result.reason instanceof Error ? result.reason.message : String(result.reason)
            });
          } else if (result.status === 'fulfilled' && !result.value.facebookMetrics) {
            debugLogger.warn('FACEBOOK_REPORTING', 'Client returned no metrics', {
              clientId: client.id,
              accountId: client.accounts?.facebookAds
            });
          }
        }
      }

      debugLogger.info('FACEBOOK_REPORTING', 'Progressive load complete', {
        totalClients: facebookClients.length,
        loadedClients: reportingData.length,
        totalSpend,
        totalLeads
      });

      return {
        data: reportingData,
        totalClients: summary.totalClients,
        activeAccounts,
        totalSpend,
        totalLeads
      };
    } catch (error) {
      debugLogger.error('FACEBOOK_REPORTING', 'Error in progressive loading', error);
      return {
        data: reportingData, // Return what we have so far
        totalClients: summary.totalClients,
        activeAccounts,
        totalSpend,
        totalLeads
      };
    }
  }

  /**
   * Helper to get date range for period
   */
  private getDateRangeForPeriod(period: string): { start: string; end: string } {
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
        endDate.setDate(0);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }
    return {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    };
  }

  /**
   * Fetch Facebook ads reporting data for all clients (legacy - use progressive version)
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

      // OPTIMIZED: Fetch metrics for all clients in parallel with timeout (matches venue improvements)
      const CLIENT_FETCH_TIMEOUT = 30000; // 30 seconds per client
      
      const createTimeoutPromise = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
        return Promise.race([
          promise,
          new Promise<T>((_, reject) => 
            setTimeout(() => reject(new Error(`Client fetch timeout after ${timeoutMs}ms`)), timeoutMs)
          )
        ]);
      };

      // Convert period to date range (shared for all clients)
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

      // OPTIMIZED: Batch clients to avoid overwhelming APIs and rate limits
      // Process 5 clients at a time (increased from 3 for better parallelization)
      const BATCH_SIZE = 5;
      const clientResults: PromiseSettledResult<{ client: any; facebookMetrics: any }>[] = [];
      
      for (let i = 0; i < facebookClients.length; i += BATCH_SIZE) {
        const batch = facebookClients.slice(i, i + BATCH_SIZE);
        debugLogger.info('FACEBOOK_REPORTING', `Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(facebookClients.length / BATCH_SIZE)}`, {
          batchSize: batch.length,
          totalClients: facebookClients.length
        });
        
        const batchResults = await Promise.allSettled(
          batch.map(client => 
            createTimeoutPromise(
              (async () => {
                debugLogger.info('FACEBOOK_REPORTING', `Fetching metrics for client ${client.name}`, { clientId: client.id, period });
                
                // Use getFacebookDataOnly (same as Meta tab) - faster and more reliable
                const facebookMetrics = await AnalyticsOrchestrator.getFacebookDataOnly(
                  client.id,
                  dateRange,
                  client
                );
                
                debugLogger.info('FACEBOOK_REPORTING', `Facebook data for ${client.name}`, { 
                  hasFacebookMetrics: !!facebookMetrics,
                  facebookMetrics: facebookMetrics,
                  facebookAccountId: client.accounts?.facebookAds,
                  dateRange,
                  leads: facebookMetrics?.leads,
                  spend: facebookMetrics?.spend
                });
                
                return { client, facebookMetrics };
              })(),
              CLIENT_FETCH_TIMEOUT
            )
          )
        );
        
        clientResults.push(...batchResults);
      }

      // Process results
      const reportingData: FacebookAdsReportingData[] = [];
      let totalSpend = 0;
      let totalLeads = 0;
      let activeAccounts = 0;

      for (let i = 0; i < clientResults.length; i++) {
        const result = clientResults[i];
        const client = facebookClients[i];
        
        if (result.status === 'fulfilled') {
          const { facebookMetrics } = result.value;
          
          if (facebookMetrics) {
            const metrics = facebookMetrics;
            
            // Calculate derived metrics
            const costPerLead = metrics.leads > 0 ? metrics.spend / metrics.leads : 0;
            const conversionRate = metrics.clicks > 0 ? (metrics.leads / metrics.clicks) * 100 : 0;
            const costPerClick = metrics.clicks > 0 ? metrics.spend / metrics.clicks : 0;

            // Calculate trends if previous period data is available
            const trends = this.calculateTrends(metrics, metrics.previousPeriod);

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
        } else {
          // Error or timeout - add client with zero metrics
          debugLogger.error('FACEBOOK_REPORTING', `Error fetching data for client ${client.id}`, result.reason);
          
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
