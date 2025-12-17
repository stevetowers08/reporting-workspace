import { debugLogger } from '@/lib/debug';
import { BaseReportingService } from '@/services/base/BaseService';
import { DatabaseService } from '@/services/data/databaseService';
import { GoogleMetricsWithTrends, TrendResult } from '@/types';
import { AnalyticsOrchestrator } from './analyticsOrchestrator';

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
  shareableLink?: string;
}

export interface GoogleAdsReportingResponse {
  data: GoogleAdsReportingData[];
  totalClients: number;
  activeAccounts: number;
  totalSpend: number;
  totalLeads: number;
}

export interface GoogleAdsReportingSummary {
  totalClients: number;
  activeAccounts: number;
  totalSpend: number;
  totalLeads: number;
}

export type GoogleClientDataCallback = (clientData: GoogleAdsReportingData) => void;

export class GoogleAdsReportingService extends BaseReportingService {
  constructor() {
    super('GoogleAdsReportingService');
  }

  /**
   * Calculate trends for all metrics
   */
  private calculateTrends(currentMetrics: GoogleMetricsWithTrends, previousMetrics: GoogleMetricsWithTrends | undefined): TrendResult | undefined {
    if (!previousMetrics) {return undefined;}
    
    return {
      leads: this.calculateTrendPercentage(currentMetrics.leads, previousMetrics.leads),
      costPerLead: this.calculateTrendPercentage(
        currentMetrics.leads > 0 ? currentMetrics.cost / currentMetrics.leads : 0,
        previousMetrics.leads > 0 ? previousMetrics.cost / previousMetrics.leads : 0
      ),
      conversionRate: this.calculateTrendPercentage(
        currentMetrics.clicks > 0 ? (currentMetrics.leads / currentMetrics.clicks) * 100 : 0,
        previousMetrics.clicks > 0 ? (previousMetrics.leads / previousMetrics.clicks) * 100 : 0
      ),
      spent: this.calculateTrendPercentage(currentMetrics.cost, previousMetrics.cost),
      impressions: this.calculateTrendPercentage(currentMetrics.impressions, previousMetrics.impressions),
      clicks: this.calculateTrendPercentage(currentMetrics.clicks, previousMetrics.clicks),
      costPerClick: this.calculateTrendPercentage(
        currentMetrics.clicks > 0 ? currentMetrics.cost / currentMetrics.clicks : 0,
        previousMetrics.clicks > 0 ? previousMetrics.cost / previousMetrics.clicks : 0
      ),
      ctr: this.calculateTrendPercentage(currentMetrics.ctr, previousMetrics.ctr)
    };
  }

  /**
   * Get summary statistics quickly without loading all client data
   * BEST PRACTICE: Load summary first for fast initial render
   */
  async getGoogleAdsReportingSummary(period: string = '30d'): Promise<GoogleAdsReportingSummary> {
    try {
      const clients = await DatabaseService.getAllClients();
      const googleClients = clients.filter(client =>
        client.accounts?.googleAds &&
        client.accounts.googleAds !== 'none'
      );
      return {
        totalClients: googleClients.length,
        activeAccounts: googleClients.length,
        totalSpend: 0, // Will be calculated as data loads
        totalLeads: 0  // Will be calculated as data loads
      };
    } catch (error) {
      debugLogger.error('GOOGLE_REPORTING', 'Error getting summary', error);
      return {
        totalClients: 0,
        activeAccounts: 0,
        totalSpend: 0,
        totalLeads: 0
      };
    }
  }

  /**
   * Fetch Google Ads reporting data with progressive loading
   * BEST PRACTICE: Stream data as it loads, don't wait for everything
   */
  async getGoogleAdsReportingDataProgressive(
    period: string = '30d',
    onClientData?: GoogleClientDataCallback
  ): Promise<GoogleAdsReportingResponse> {
    const summary = await this.getGoogleAdsReportingSummary(period);
    const reportingData: GoogleAdsReportingData[] = [];
    let totalSpend = 0;
    let totalLeads = 0;
    let activeAccounts = 0;

    try {
      const clients = await DatabaseService.getAllClients();
      const googleClients = clients.filter(client =>
        client.accounts?.googleAds &&
        client.accounts.googleAds !== 'none'
      );

      if (!googleClients || googleClients.length === 0) {
        return {
          data: [],
          totalClients: 0,
          activeAccounts: 0,
          totalSpend: 0,
          totalLeads: 0
        };
      }

      const dateRange = this.getDateRangeForPeriod(period);
      const CLIENT_FETCH_TIMEOUT = 10000; // 10 seconds - enterprise standard (main metrics only, breakdown in background)
      const INITIAL_BATCH_SIZE = 10; // Load first 10 accounts immediately for fast initial render
      const BATCH_SIZE = 5; // Then load remaining in smaller batches

      debugLogger.info('GOOGLE_REPORTING', 'Starting progressive load', {
        totalClients: googleClients.length,
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
      const initialBatch = googleClients.slice(0, INITIAL_BATCH_SIZE);
      const initialResults = await Promise.allSettled(
        initialBatch.map(client => 
          createTimeoutPromise(
            (async () => {
              debugLogger.debug('GOOGLE_REPORTING', 'Loading client', { clientId: client.id, accountId: client.accounts?.googleAds });
              const googleMetrics = await AnalyticsOrchestrator.getGoogleDataOnly(
                client.id,
                dateRange,
                client
              );
              return { client, googleMetrics };
            })(),
            CLIENT_FETCH_TIMEOUT
          )
        )
      );

      // Process initial batch immediately
      for (let j = 0; j < initialResults.length; j++) {
        const result = initialResults[j];
        const client = initialBatch[j];
        
        if (result.status === 'fulfilled' && result.value.googleMetrics) {
          const metrics = result.value.googleMetrics;
          const costPerLead = metrics.leads > 0 ? metrics.cost / metrics.leads : 0;
          const conversionRate = metrics.clicks > 0 ? (metrics.leads / metrics.clicks) * 100 : 0;
          const costPerClick = metrics.clicks > 0 ? metrics.cost / metrics.clicks : 0;
          const trends = this.calculateTrends(metrics, metrics.previousPeriod);

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
            trends,
            shareableLink: client.shareable_link
          };

          reportingData.push(clientData);
          totalSpend += metrics.cost || 0;
          totalLeads += metrics.leads || 0;
          if (metrics.leads > 0 || metrics.cost > 0) activeAccounts++;

          // Emit data immediately for progressive rendering
          if (onClientData) {
            onClientData(clientData);
          }
        } else if (result.status === 'rejected') {
          debugLogger.warn('GOOGLE_REPORTING', 'Client fetch failed', {
            clientId: client.id,
            accountId: client.accounts?.googleAds,
            error: result.reason instanceof Error ? result.reason.message : String(result.reason)
          });
        }
      }

      // Process remaining clients in batches (load in background)
      for (let i = INITIAL_BATCH_SIZE; i < googleClients.length; i += BATCH_SIZE) {
        const batch = googleClients.slice(i, i + BATCH_SIZE);
        
        const batchResults = await Promise.allSettled(
          batch.map(client => 
            createTimeoutPromise(
              (async () => {
                const googleMetrics = await AnalyticsOrchestrator.getGoogleDataOnly(
                  client.id,
                  dateRange,
                  client
                );
                return { client, googleMetrics };
              })(),
              CLIENT_FETCH_TIMEOUT
            )
          )
        );

        // Process and emit each client's data as soon as it's ready
        for (let j = 0; j < batchResults.length; j++) {
          const result = batchResults[j];
          const client = batch[j];
          
          if (result.status === 'fulfilled' && result.value && result.value.googleMetrics !== undefined && result.value.googleMetrics !== null) {
            const metrics = result.value.googleMetrics;
            const costPerLead = metrics.leads > 0 ? metrics.cost / metrics.leads : 0;
            const conversionRate = metrics.clicks > 0 ? (metrics.leads / metrics.clicks) * 100 : 0;
            const costPerClick = metrics.clicks > 0 ? metrics.cost / metrics.clicks : 0;
            const trends = this.calculateTrends(metrics, metrics.previousPeriod);

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
              trends,
              shareableLink: client.shareable_link
            };

            reportingData.push(clientData);
            totalSpend += metrics.cost || 0;
            totalLeads += metrics.leads || 0;
            if (metrics.leads > 0 || metrics.cost > 0) activeAccounts++;

            // Emit data immediately for progressive rendering
            if (onClientData) {
              onClientData(clientData);
            }
          } else if (result.status === 'rejected') {
            debugLogger.warn('GOOGLE_REPORTING', 'Client fetch failed', {
              clientId: client.id,
              accountId: client.accounts?.googleAds,
              error: result.reason instanceof Error ? result.reason.message : String(result.reason)
            });
          }
        }
      }

      debugLogger.info('GOOGLE_REPORTING', 'Progressive load complete', {
        totalClients: googleClients.length,
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
      debugLogger.error('GOOGLE_REPORTING', 'Error in progressive loading', error);
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
   * Fetch Google Ads reporting data for all clients (legacy - use progressive version)
   */
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

      // OPTIMIZED: Batch clients to avoid overwhelming APIs and rate limits
      // Process 5 clients at a time (increased from 3 for better parallelization)
      const BATCH_SIZE = 5;
      const clientResults: PromiseSettledResult<{ client: any; googleMetrics: any }>[] = [];
      
      for (let i = 0; i < googleClients.length; i += BATCH_SIZE) {
        const batch = googleClients.slice(i, i + BATCH_SIZE);
        debugLogger.info('GOOGLE_REPORTING', `Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(googleClients.length / BATCH_SIZE)}`, {
          batchSize: batch.length,
          totalClients: googleClients.length
        });
        
        const batchResults = await Promise.allSettled(
          batch.map(client => 
            createTimeoutPromise(
              (async () => {
                debugLogger.info('GOOGLE_REPORTING', `Fetching metrics for client ${client.name}`, { clientId: client.id, period });

                // Use getGoogleDataOnly (same as Google tab) - faster and more reliable
                const googleMetrics = await AnalyticsOrchestrator.getGoogleDataOnly(
                  client.id,
                  dateRange,
                  client
                );

                debugLogger.info('GOOGLE_REPORTING', `Google data for ${client.name}`, {
                  hasGoogleMetrics: !!googleMetrics,
                  googleMetrics: googleMetrics,
                  leads: googleMetrics?.leads,
                  cost: googleMetrics?.cost
                });

                return { client, googleMetrics };
              })(),
              CLIENT_FETCH_TIMEOUT
            )
          )
        );
        
        clientResults.push(...batchResults);
      }

      // Process results
      const reportingData: GoogleAdsReportingData[] = [];
      let totalSpend = 0;
      let totalLeads = 0;
      let activeAccounts = 0;

      for (let i = 0; i < clientResults.length; i++) {
        const result = clientResults[i];
        const client = googleClients[i];
        
        if (result.status === 'fulfilled') {
          const { googleMetrics } = result.value;
          
          debugLogger.info('GOOGLE_REPORTING', `Processing result for ${client.name}`, {
            hasGoogleMetrics: !!googleMetrics,
            googleMetricsType: typeof googleMetrics,
            googleMetricsKeys: googleMetrics ? Object.keys(googleMetrics) : null,
            leads: googleMetrics?.leads,
            cost: googleMetrics?.cost,
            impressions: googleMetrics?.impressions,
            clicks: googleMetrics?.clicks
          });
          
          if (googleMetrics) {
            const metrics = googleMetrics;
            const costPerLead = metrics.leads > 0 ? metrics.cost / metrics.leads : 0;
            const conversionRate = metrics.clicks > 0 ? (metrics.leads / metrics.clicks) * 100 : 0;
            const costPerClick = metrics.clicks > 0 ? metrics.cost / metrics.clicks : 0;

            // Calculate trends if previous period data is available
            const trends = this.calculateTrends(metrics, metrics.previousPeriod);

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
              trends,
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
        } else {
          // Error or timeout - add client with zero metrics
          const errorReason = result.reason;
          const isTimeout = errorReason instanceof Error && errorReason.message.includes('timeout');
          debugLogger.error('GOOGLE_REPORTING', `Error fetching data for client ${client.id}`, {
            error: errorReason,
            isTimeout,
            errorMessage: errorReason instanceof Error ? errorReason.message : String(errorReason),
            errorStack: errorReason instanceof Error ? errorReason.stack : undefined
          });
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
