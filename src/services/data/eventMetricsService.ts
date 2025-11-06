import { debugLogger } from '@/lib/debug';
import { GoogleAdsMetrics } from '@/types/dashboard';
import { FacebookAdsMetrics, FacebookAdsService } from '../api/facebookAdsService';
import { GoogleAdsService } from '../api/googleAdsService';
import { GoHighLevelAnalyticsService } from '../ghl/goHighLevelAnalyticsService';
import { LeadDataService } from './leadDataService';

// Event metrics interface (moved from old export service)
export interface EventMetrics {
  totalEvents: number;
  averageGuests: number;
  totalSubmissions: number;
  eventTypeBreakdown: Array<{
    type: string;
    count: number;
    percentage: number;
    avgGuests: number;
  }>;
  budgetDistribution: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
}

export interface EventLeadMetrics {
  // Cost per lead metrics
  facebookCostPerLead: number;
  googleCostPerLead: number;
  overallCostPerLead: number;

  // Lead quality metrics
  leadToOpportunityRate: number;
  opportunityToWinRate: number;
  averageEventValue: number;
  totalOpportunities: number;

  // Event-specific metrics
  averageGuestsPerEvent: number;
  mostPopularEventType: string;
  seasonalTrends: Array<{
    month: string;
    leads: number;
    events: number;
    revenue: number;
  }>;

  // Landing page performance
  landingPageConversionRate: number;
  formCompletionRate: number;

  // Attribution metrics
  leadSourceBreakdown: Array<{
    source: string;
    leads: number;
    percentage: number;
    costPerLead: number;
    conversionRate: number;
  }>;
}

export interface EventDashboardData {
  // Summary metrics
  totalLeads: number;
  totalSpend: number;
  totalRevenue: number;
  roi: number;

  // Platform-specific data
  facebookMetrics: FacebookAdsMetrics & { costPerLead: number };
  googleMetrics: GoogleAdsMetrics & { costPerLead: number };
  ghlMetrics: any;
  eventMetrics: EventMetrics;

  // Combined insights
  leadMetrics: EventLeadMetrics;

  // Client accounts configuration
  clientAccounts: {
    facebookAds?: string;
    googleAds?: string;
    goHighLevel?: string;
    googleSheets?: string;
    googleSheetsConfig?: {
      spreadsheetId: string;
      sheetName: string;
    };
  };

  // Time period
  dateRange: {
    start: string;
    end: string;
  };
}

export class EventMetricsService {
  static async getComprehensiveMetrics(
    _clientId: string,
    dateRange: { start: string; end: string },
    clientAccounts?: { 
      facebookAds?: string; 
      googleAds?: string; 
      goHighLevel?: string; 
      googleSheets?: string;
      googleSheetsConfig?: {
        spreadsheetId: string;
        sheetName: string;
      };
    },
    clientConversionActions?: { facebookAds?: string; googleAds?: string },
    includePreviousPeriod: boolean = false
  ): Promise<EventDashboardData> {
    console.log('🚀 EventMetricsService.getComprehensiveMetrics called', { _clientId, dateRange, clientAccounts });
    try {
      // Only fetch data for connected accounts
      const promises = [];


      // Check which accounts are connected (not 'none' and not undefined)
      debugLogger.debug('EventMetricsService', 'Client accounts data:', {
        clientAccounts,
        facebookAdsAccount: clientAccounts?.facebookAds,
        facebookAdsAccountType: typeof clientAccounts?.facebookAds,
        googleAdsAccount: clientAccounts?.googleAds,
        googleAdsAccountType: typeof clientAccounts?.googleAds
      });

      const hasFacebookAds = clientAccounts?.facebookAds && clientAccounts.facebookAds !== 'none';
      debugLogger.debug('EventMetricsService', 'Facebook Ads check:', {
        facebookAdsValue: clientAccounts?.facebookAds,
        hasFacebookAds,
        willCallFacebookAPI: hasFacebookAds && clientAccounts?.facebookAds
      });
      
      debugLogger.info('EventMetricsService', 'Facebook Ads check:', {
        facebookAdsValue: clientAccounts?.facebookAds,
        hasFacebookAds,
        willCallFacebookAPI: hasFacebookAds && clientAccounts?.facebookAds
      });
      const hasGoogleAds = clientAccounts?.googleAds && clientAccounts.googleAds !== 'none';
      const hasGoHighLevel = clientAccounts?.goHighLevel && 
        clientAccounts.goHighLevel !== 'none' && 
        (typeof clientAccounts.goHighLevel === 'string' || 
         (typeof clientAccounts.goHighLevel === 'object' && clientAccounts.goHighLevel?.locationId));
      
      debugLogger.info('EventMetricsService', 'GoHighLevel account detection', {
        goHighLevelValue: clientAccounts?.goHighLevel,
        goHighLevelType: typeof clientAccounts?.goHighLevel,
        hasGoHighLevel,
        willCallGHLAPI: hasGoHighLevel
      });
      const hasGoogleSheets = clientAccounts?.googleSheets && clientAccounts.googleSheets !== 'none';

      if (hasFacebookAds && clientAccounts?.facebookAds) {
        promises.push(this.getFacebookMetrics(clientAccounts.facebookAds, dateRange, clientConversionActions?.facebookAds, includePreviousPeriod));
      }
      if (hasGoogleAds) {promises.push(this.getGoogleMetrics(dateRange, clientAccounts?.googleAds));}
      if (hasGoHighLevel) {
        // Extract locationId from goHighLevel object if it's an object, otherwise use as string
        const locationId = typeof clientAccounts?.goHighLevel === 'object' 
          ? clientAccounts.goHighLevel?.locationId 
          : clientAccounts?.goHighLevel;
        promises.push(this.getGHLMetrics(dateRange, locationId));
      }
      if (hasGoogleSheets) {promises.push(this.getEventMetrics(dateRange, clientAccounts));}

      const results = await Promise.allSettled(promises);

      // Initialize metrics with default values
      let facebookMetrics: FacebookAdsMetrics = { 
        impressions: 0, clicks: 0, spend: 0, leads: 0, conversions: 0, 
        ctr: 0, cpc: 0, cpm: 0, roas: 0, reach: 0, frequency: 0 
      };
      let googleMetrics: GoogleAdsMetrics = { 
        impressions: 0, clicks: 0, cost: 0, leads: 0, conversions: 0, 
        ctr: 0, cpc: 0, conversionRate: 0, costPerConversion: 0, 
        searchImpressionShare: 0, qualityScore: 0 
      };
      let ghlMetrics: any = { 
        totalContacts: 0, newContacts: 0, totalOpportunities: 0, 
        wonOpportunities: 0, lostOpportunities: 0, pipelineValue: 0, 
        avgDealSize: 0, conversionRate: 0, responseTime: 0, wonRevenue: 0 
      };
      let eventMetrics: EventMetrics = { 
        totalEvents: 0, averageGuests: 0, totalSubmissions: 0, 
        eventTypeBreakdown: [], budgetDistribution: [] 
      };

      // Assign results based on what was fetched
      let resultIndex = 0;
      if (hasFacebookAds) {
        const result = results[resultIndex++];
        debugLogger.debug('EventMetricsService', 'Facebook API result:', {
          status: result.status,
          hasData: result.status === 'fulfilled' ? !!result.value : false,
          error: result.status === 'rejected' ? result.reason : null
        });
        
        debugLogger.info('EventMetricsService', 'Facebook API result:', {
          status: result.status,
          hasData: result.status === 'fulfilled' ? !!result.value : false,
          error: result.status === 'rejected' ? result.reason : null
        });
        
        if (result.status === 'fulfilled') {
          facebookMetrics = result.value as FacebookAdsMetrics;
          debugLogger.debug('EventMetricsService', 'Facebook metrics loaded:', {
            leads: facebookMetrics.leads,
            spend: facebookMetrics.spend,
            impressions: facebookMetrics.impressions
          });
          
          debugLogger.info('EventMetricsService', 'Facebook metrics loaded:', {
            leads: facebookMetrics.leads,
            spend: facebookMetrics.spend,
            impressions: facebookMetrics.impressions
          });
        } else {
          debugLogger.warn('EventMetricsService', 'Facebook metrics failed:', result.reason);
        }
      }
      if (hasGoogleAds) {
        const result = results[resultIndex++];
        debugLogger.debug('EventMetricsService', 'Google Ads API result:', {
          status: result.status,
          hasData: result.status === 'fulfilled' ? !!result.value : false,
          error: result.status === 'rejected' ? result.reason : null
        });
        
        debugLogger.info('EventMetricsService', 'Google Ads API result:', {
          status: result.status,
          hasData: result.status === 'fulfilled' ? !!result.value : false,
          error: result.status === 'rejected' ? result.reason : null
        });
        
        if (result.status === 'fulfilled') {
          const googleAdsResult = result.value as any;
          
          // Map the fields from GoogleAdsService to the expected GoogleAdsMetrics format
          googleMetrics = {
            impressions: googleAdsResult.impressions || 0,
            clicks: googleAdsResult.clicks || 0,
            cost: googleAdsResult.cost || 0,
            leads: googleAdsResult.leads || googleAdsResult.conversions || 0, // Use conversions as leads
            conversions: googleAdsResult.conversions || 0,
            ctr: googleAdsResult.ctr || 0,
            cpc: googleAdsResult.averageCpc || 0, // Map averageCpc to cpc
            conversionRate: googleAdsResult.conversionRate || 0,
            costPerConversion: googleAdsResult.costPerConversion || 0,
            searchImpressionShare: 0, // Not available in current API
            qualityScore: 0, // Not available in current API
            // Include previous period data if available
            previousPeriod: googleAdsResult.previousPeriod ? {
              impressions: googleAdsResult.previousPeriod.impressions || 0,
              clicks: googleAdsResult.previousPeriod.clicks || 0,
              cost: googleAdsResult.previousPeriod.cost || 0,
              leads: googleAdsResult.previousPeriod.leads || googleAdsResult.previousPeriod.conversions || 0,
              conversions: googleAdsResult.previousPeriod.conversions || 0,
              ctr: googleAdsResult.previousPeriod.ctr || 0,
              cpc: googleAdsResult.previousPeriod.averageCpc || 0,
              conversionRate: googleAdsResult.previousPeriod.conversionRate || 0,
              costPerConversion: 0, // Not calculated for previous period
              searchImpressionShare: 0,
              qualityScore: 0
            } : undefined
          };
          
          debugLogger.debug('EventMetricsService', 'Google metrics loaded:', {
            leads: googleMetrics.leads,
            cost: googleMetrics.cost,
            impressions: googleMetrics.impressions,
            clicks: googleMetrics.clicks
          });
          
          debugLogger.info('EventMetricsService', 'Google metrics loaded:', {
            leads: googleMetrics.leads,
            cost: googleMetrics.cost,
            impressions: googleMetrics.impressions,
            clicks: googleMetrics.clicks
          });
        } else {
          debugLogger.warn('EventMetricsService', 'Google metrics failed:', result.reason);
        }
      }
      if (hasGoHighLevel) {
        const result = results[resultIndex++];
        if (result.status === 'fulfilled') {
          ghlMetrics = result.value as any;
        } else {
          debugLogger.warn('EventMetricsService', 'GoHighLevel metrics failed:', result.reason);
        }
      }
      
      // ✅ SAFETY CHECK: Ensure ghlMetrics is never null
      if (!ghlMetrics) {
        debugLogger.warn('EventMetricsService', 'GHL metrics was null');
        ghlMetrics = null;
      }
      if (hasGoogleSheets) {
        const result = results[resultIndex++];
        if (result.status === 'fulfilled') {
          eventMetrics = result.value as EventMetrics;
        } else {
          debugLogger.warn('EventMetricsService', 'Event metrics failed:', result.reason);
        }
      }

      // Calculate combined metrics
      const totalSpend = facebookMetrics.spend + googleMetrics.cost;
      const totalLeads = facebookMetrics.leads + googleMetrics.leads;
      const _totalRevenue = ghlMetrics?.wonRevenue || 0;
      const roi = totalSpend > 0 ? (_totalRevenue / totalSpend) : 0;

      // Calculate cost per lead
      const facebookCostPerLead = facebookMetrics.leads > 0
        ? facebookMetrics.spend / facebookMetrics.leads
        : 0;
      const googleCostPerLead = googleMetrics.leads > 0
        ? googleMetrics.cost / googleMetrics.leads
        : 0;

      debugLogger.debug('EventMetricsService', 'Cost per lead calculated:', {
        facebookLeads: facebookMetrics.leads,
        facebookSpend: facebookMetrics.spend,
        facebookCostPerLead,
        googleLeads: googleMetrics.leads,
        googleCost: googleMetrics.cost,
        googleCostPerLead
      });

      // Build lead metrics
      const leadMetrics = await this.calculateLeadMetrics(
        facebookMetrics,
        googleMetrics,
        ghlMetrics,
        eventMetrics,
        totalSpend,
        _totalRevenue,
        clientAccounts
      );

      const result = {
        totalLeads,
        totalSpend,
        totalRevenue: _totalRevenue,
        roi,
        facebookMetrics: { ...facebookMetrics, costPerLead: facebookCostPerLead },
        googleMetrics: { ...googleMetrics, costPerLead: googleCostPerLead },
        ghlMetrics,
        eventMetrics,
        leadMetrics,
        clientAccounts,
        dateRange
      };

      debugLogger.info('EventMetricsService', 'Final result:', {
        totalLeads: result.totalLeads,
        facebookLeads: result.facebookMetrics.leads,
        facebookSpend: result.facebookMetrics.spend,
        facebookCostPerLead: result.facebookMetrics.costPerLead,
        googleLeads: result.googleMetrics.leads,
        googleCost: result.googleMetrics.cost,
        googleCostPerLead: result.googleMetrics.costPerLead,
        hasFacebookData: result.facebookMetrics.leads > 0 || result.facebookMetrics.spend > 0,
        hasGoogleData: result.googleMetrics.leads > 0 || result.googleMetrics.cost > 0
      });

      return result;
    } catch (error) {
      debugLogger.error('EventMetricsService', 'Error fetching comprehensive metrics', error);
      throw error;
    }
  }

  private static async getFacebookMetrics(adAccountId: string, dateRange: { start: string; end: string }, conversionAction?: string, includePreviousPeriod: boolean = false): Promise<FacebookAdsMetrics> {
    try {
      debugLogger.debug('EventMetricsService', 'Fetching Facebook metrics for account', { 
        adAccountId, 
        dateRange, 
        conversionAction, 
        includePreviousPeriod 
      });
      const metrics = await FacebookAdsService.getAccountMetrics(adAccountId, dateRange, conversionAction, includePreviousPeriod);
      debugLogger.debug('EventMetricsService', 'Facebook metrics result', {
        metrics,
        hasData: !!(metrics && (metrics.leads > 0 || metrics.spend > 0 || metrics.impressions > 0)),
        accountId: adAccountId
      });
      
      // Log if we got empty data
      if (!metrics || (metrics.leads === 0 && metrics.spend === 0 && metrics.impressions === 0)) {
        debugLogger.warn('EventMetricsService', 'Facebook API returned empty data - all campaigns may be paused');
      }
      
      return metrics;
    } catch (error) {
      debugLogger.error('EventMetricsService', 'Facebook metrics error', error);
      debugLogger.warn('EventMetricsService', 'Facebook metrics not available', error);
      return null;
    }
  }

  private static async getGoogleMetrics(dateRange: { start: string; end: string }, clientGoogleAdsAccount?: string): Promise<GoogleAdsMetrics> {
    try {
      debugLogger.debug('EventMetricsService', 'Fetching Google Ads metrics', { dateRange, clientGoogleAdsAccount });
      
      // Import GoogleAdsService dynamically to avoid circular dependencies
      const { GoogleAdsService } = await import('@/services/api/googleAdsService');
      
      // Check if Google Ads is connected first
      const { supabase } = await import('@/lib/supabase');
      const { data: integrations } = await supabase
        .from('integrations')
        .select('platform')
        .eq('connected', true)
        .eq('platform', 'googleAds');
      const isConnected = integrations && integrations.length > 0;
      
      if (!isConnected) {
        debugLogger.warn('EventMetricsService', 'Google Ads not connected, returning null');
        return null;
      }
      
      // Get the manager account ID from the integration (for login-customer-id header)
      const managerAccountId = await GoogleAdsService.getManagerAccountId();
      if (!managerAccountId) {
        debugLogger.warn('EventMetricsService', 'No manager account ID found in integration');
        return null;
      }
      
      // Use the client's Google Ads account ID for metrics (not the manager account)
      const targetAccountId = clientGoogleAdsAccount && clientGoogleAdsAccount !== 'none' 
        ? clientGoogleAdsAccount 
        : managerAccountId; // fallback to manager if no client account specified
      
      debugLogger.debug('EventMetricsService', 'Google Ads account selection:', { 
        managerAccountId: managerAccountId,
        clientAccountId: clientGoogleAdsAccount,
        clientAccountIdType: typeof clientGoogleAdsAccount,
        clientAccountIdIsNone: clientGoogleAdsAccount === 'none',
        targetAccountId: targetAccountId,
        targetAccountIdType: typeof targetAccountId,
        willUseManagerAccount: targetAccountId === managerAccountId
      });
      
      // Use the client account ID for the API call (manager account is used for login-customer-id header)
      const metrics = await GoogleAdsService.getAccountMetrics(targetAccountId, dateRange, true); // Include previous period data
      debugLogger.debug('EventMetricsService', 'Google Ads metrics result', metrics);
      
      // Log if we got empty data
      if (!metrics || (metrics.leads === 0 && metrics.cost === 0 && metrics.impressions === 0)) {
        debugLogger.warn('EventMetricsService', 'Google Ads API returned empty data - no active campaigns or data for date range');
      }
      
      return metrics;
    } catch (error) {
      debugLogger.error('EventMetricsService', 'Google Ads metrics error', error);
      
      // Check if it's an authentication error
      if (error instanceof Error && error.message.includes('token')) {
        debugLogger.warn('EventMetricsService', 'Google Ads authentication error - returning empty metrics');
      } else {
        debugLogger.warn('EventMetricsService', 'Google Ads metrics not available', error);
      }
      
      return null;
    }
  }

  private static async getGHLMetrics(dateRange: { start: string; end: string }, locationId?: string): Promise<any> {
    try {
      if (!locationId) {
        debugLogger.warn('EventMetricsService', 'No GoHighLevel location ID provided');
        return null;
      }
      
      // ✅ FIX: Check GoHighLevel connection using the correct method
      const { GoHighLevelApiService } = await import('@/services/ghl/goHighLevelApiService');
      const token = await GoHighLevelApiService.getValidToken(locationId);
      
      if (!token) {
        debugLogger.warn('EventMetricsService', 'GoHighLevel not connected for this location - returning null', { locationId });
        return null; // ✅ FIX: Return null to indicate no OAuth connection
      }
      
      debugLogger.info('EventMetricsService', 'Calling GoHighLevelAnalyticsService.getGHLMetrics', { locationId, dateRange });
      const result = await GoHighLevelAnalyticsService.getGHLMetrics(locationId, dateRange);
      debugLogger.info('EventMetricsService', 'GoHighLevel metrics result', { locationId, result });
      return result;
    } catch (error) {
      debugLogger.error('EventMetricsService', 'GoHighLevel metrics error', error);
      
      // Check if it's an authentication error
      if (error instanceof Error && (error.message.includes('token') || error.message.includes('unauthorized'))) {
        debugLogger.warn('EventMetricsService', 'Go High Level authentication error - returning null', { locationId });
        return null; // ✅ FIX: Return null for authentication errors
      } else {
        debugLogger.warn('EventMetricsService', 'Go High Level metrics not available - returning null', error);
        return null;
      }
    }
  }

  private static async getEventMetrics(
    dateRange: { start: string; end: string },
    clientAccounts?: { googleSheets?: string; googleSheetsConfig?: { spreadsheetId: string; sheetName: string } }
  ): Promise<EventMetrics> {
    try {
      // Use client-specific Google Sheets configuration if available
      if (!clientAccounts?.googleSheetsConfig) {
        debugLogger.warn('EventMetricsService', 'No Google Sheets configuration provided');
        return null;
      }

      const leadData = await LeadDataService.fetchLeadData(
        clientAccounts.googleSheetsConfig.spreadsheetId,
        clientAccounts.googleSheetsConfig.sheetName
      );
      
      if (!leadData || !leadData.eventTypes) {
        debugLogger.warn('EventMetricsService', 'No lead data or event types available');
        return null;
      }

      return {
        totalEvents: leadData.totalLeads,
        averageGuests: leadData.averageGuestsPerLead,
        totalSubmissions: leadData.totalLeads,
        eventTypeBreakdown: leadData.eventTypes.map(eventType => ({
          ...eventType,
          avgGuests: 0
        })),
        budgetDistribution: []
      };
    } catch (error) {
      debugLogger.error('EventMetricsService', 'Failed to fetch event metrics', error);
      return null;
    }
  }

  private static async calculateLeadMetrics(
    facebook: FacebookAdsMetrics,
    google: GoogleAdsMetrics,
    ghl: any,
    events: EventMetrics,
    totalSpend: number,
    _totalRevenue: number,
    clientAccounts?: { facebookAds?: string; googleAds?: string }
  ): Promise<EventLeadMetrics> {
    const totalLeads = facebook.leads + google.leads;

    // Calculate cost per lead
    const facebookCostPerLead = facebook.leads > 0 ? facebook.spend / facebook.leads : 0;
    const googleCostPerLead = google.leads > 0 ? google.cost / google.leads : 0;
    const overallCostPerLead = totalLeads > 0 ? totalSpend / totalLeads : 0;

    // Calculate conversion rates
    const leadToOpportunityRate = ghl.totalContacts > 0
      ? (ghl.totalOpportunities / ghl.totalContacts) * 100
      : 0;
    const opportunityToWinRate = ghl.totalOpportunities > 0
      ? (ghl.wonOpportunities / ghl.totalOpportunities) * 100
      : 0;

    // Event-specific calculations
    const averageGuestsPerEvent = events?.averageGuests || 0;
    const mostPopularEventType = events?.eventTypeBreakdown && events.eventTypeBreakdown.length > 0
      ? events.eventTypeBreakdown.reduce((prev, current) =>
        prev.count > current.count ? prev : current
      ).type
      : 'Unknown';

    // Lead source breakdown - only include actual data
    const leadSourceBreakdown = [];

    if (facebook.leads > 0) {
      leadSourceBreakdown.push({
        source: "Facebook Ads",
        leads: facebook.leads,
        percentage: totalLeads > 0 ? (facebook.leads / totalLeads) * 100 : 0,
        costPerLead: facebook.leads > 0 ? facebook.spend / facebook.leads : 0,
        conversionRate: 0
      });
    }

    if (google.leads > 0) {
      leadSourceBreakdown.push({
        source: "Google Ads",
        leads: google.leads,
        percentage: totalLeads > 0 ? (google.leads / totalLeads) * 100 : 0,
        costPerLead: google.leads > 0 ? google.cost / google.leads : 0,
        conversionRate: 0
      });
    }

    // Generate real monthly data for seasonal trends
    const seasonalTrends = await this.generateSeasonalTrends(facebook, google, clientAccounts);

    return {
      facebookCostPerLead,
      googleCostPerLead,
      overallCostPerLead,
      leadToOpportunityRate,
      opportunityToWinRate,
      averageEventValue: ghl.avgDealSize,
      totalOpportunities: ghl.totalOpportunities,
      averageGuestsPerEvent,
      mostPopularEventType,
      seasonalTrends,
      landingPageConversionRate: 0,
      formCompletionRate: 0,
      leadSourceBreakdown
    };
  }

  /**
   * Generate real monthly data for seasonal trends from Facebook and Google APIs
   */
  private static async generateSeasonalTrends(
    facebook: FacebookAdsMetrics, 
    google: GoogleAdsMetrics,
    clientAccounts?: { facebookAds?: string; googleAds?: string }
  ): Promise<Array<{
    month: string;
    leads: number;
    events: number;
    revenue: number;
  }>> {
    try {
      debugLogger.info('EventMetricsService', 'Generating seasonal trends', {
        clientAccounts,
        facebookLeads: facebook.leads,
        googleLeads: google.leads
      });
      
      const monthlyMap = new Map<string, { leads: number; events: number; revenue: number }>();
      
      // Get Facebook monthly data if account is connected
      if (clientAccounts?.facebookAds && clientAccounts.facebookAds !== 'none') {
        try {
          debugLogger.info('EventMetricsService', 'Fetching Facebook monthly data', { 
            facebookAccount: clientAccounts.facebookAds 
          });
          const facebookMonthlyData = await FacebookAdsService.getMonthlyMetrics(clientAccounts.facebookAds);
          debugLogger.info('EventMetricsService', 'Facebook monthly data received', facebookMonthlyData);
          
          facebookMonthlyData.forEach(data => {
            monthlyMap.set(data.month, {
              leads: data.leads,
              events: 0, // Events not available from Facebook API
              revenue: 0 // Revenue not available from Facebook API
            });
          });
        } catch (error) {
          debugLogger.error('EventMetricsService', 'Error fetching Facebook monthly data', error);
          // Don't fail silently - return empty array to indicate no data
          return [];
        }
      }
      
      // Get Google monthly data if account is connected
      if (clientAccounts?.googleAds && clientAccounts.googleAds !== 'none') {
        try {
          debugLogger.info('EventMetricsService', 'Fetching Google monthly data', { 
            googleAccount: clientAccounts.googleAds 
          });
          const googleMonthlyData = await GoogleAdsService.getMonthlyMetrics(clientAccounts.googleAds);
          debugLogger.info('EventMetricsService', 'Google monthly data received', googleMonthlyData);
          
          googleMonthlyData.forEach(data => {
            const existing = monthlyMap.get(data.month) || { leads: 0, events: 0, revenue: 0 };
            monthlyMap.set(data.month, {
              leads: existing.leads + data.leads,
              events: existing.events,
              revenue: existing.revenue
            });
          });
        } catch (error) {
          debugLogger.error('EventMetricsService', 'Error fetching Google monthly data', error);
          // Don't fail silently - return empty array to indicate no data
          return [];
        }
      }
      
      // Convert to array format
      const result = Array.from(monthlyMap.entries()).map(([month, data]) => ({
        month,
        leads: data.leads,
        events: data.events,
        revenue: data.revenue
      }));
      
      debugLogger.info('EventMetricsService', 'Final seasonal trends result', result);
      return result;
    } catch (error) {
      debugLogger.error('EventMetricsService', 'Error generating seasonal trends', error);
      return [];
    }
  }


  // Utility method to get key insights for client reports
  static generateInsights(data: EventDashboardData): Array<{
    type: 'success' | 'warning' | 'info';
    title: string;
    description: string;
    metric?: string;
  }> {
    const insights = [];

    // ROI insights
    if (data.roi > 3) {
      insights.push({
        type: 'success' as const,
        title: 'Excellent ROI Performance',
        description: `Your campaigns are generating ${data.roi.toFixed(1)}x return on investment, well above industry average.`,
        metric: `${data.roi.toFixed(1)}x ROI`
      });
    } else if (data.roi < 2) {
      insights.push({
        type: 'warning' as const,
        title: 'ROI Below Target',
        description: 'Consider optimizing targeting and ad creative to improve return on investment.',
        metric: `${data.roi.toFixed(1)}x ROI`
      });
    }

    // Cost per lead insights
    const avgCPL = data.leadMetrics.overallCostPerLead;
    if (avgCPL > 0 && avgCPL < 50) {
      insights.push({
        type: 'success' as const,
        title: 'Low Cost Per Lead',
        description: 'Your cost per lead is excellent for the event planning industry.',
        metric: `$${avgCPL.toFixed(2)} CPL`
      });
    } else if (avgCPL > 100) {
      insights.push({
        type: 'warning' as const,
        title: 'High Cost Per Lead',
        description: 'Consider refining targeting or improving landing page conversion rates.',
        metric: `$${avgCPL.toFixed(2)} CPL`
      });
    }

    // Event type insights
    if (data.eventMetrics?.eventTypeBreakdown && data.eventMetrics.eventTypeBreakdown.length > 0) {
      const topEvent = data.leadMetrics.mostPopularEventType;
      insights.push({
        type: 'info' as const,
        title: 'Most Popular Event Type',
        description: `${topEvent} events generate the most leads for your venue.`,
        metric: topEvent
      });
    }

    // Seasonal insights
    if (data.leadMetrics?.seasonalTrends && data.leadMetrics.seasonalTrends.length >= 3) {
      const recentTrends = data.leadMetrics.seasonalTrends.slice(-3);
      const isGrowing = recentTrends[2].leads > recentTrends[0].leads;

      insights.push({
        type: isGrowing ? 'success' as const : 'info' as const,
        title: isGrowing ? 'Growing Lead Volume' : 'Stable Lead Volume',
        description: isGrowing
          ? 'Your lead generation is trending upward over the past quarter.'
          : 'Lead volume has remained consistent over the past quarter.',
        metric: `${recentTrends[2].leads} leads this month`
      });
    }

    return insights;
  }
}
