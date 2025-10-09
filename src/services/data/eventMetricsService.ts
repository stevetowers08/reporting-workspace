import { debugLogger } from '@/lib/debug';
import { FacebookAdsMetrics, FacebookAdsService } from '../api/facebookAdsService';
import { GoHighLevelService } from '../ghl/goHighLevelService';
import { GoogleAdsMetrics } from '../api/googleAdsService';
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
    clientAccounts?: { facebookAds?: string; googleAds?: string; goHighLevel?: string; googleSheets?: string },
    clientConversionActions?: { facebookAds?: string; googleAds?: string }
  ): Promise<EventDashboardData> {
    try {
      // Only fetch data for connected accounts
      const promises = [];

      // Check which accounts are connected (not 'none' and not undefined)
      debugLogger.debug('EventMetricsService', 'Client accounts data:', {
        clientAccounts,
        googleAdsAccount: clientAccounts?.googleAds,
        googleAdsAccountType: typeof clientAccounts?.googleAds
      });

      const hasFacebookAds = clientAccounts?.facebookAds && clientAccounts.facebookAds !== 'none';
      const hasGoogleAds = clientAccounts?.googleAds && clientAccounts.googleAds !== 'none';
      const hasGoHighLevel = clientAccounts?.goHighLevel && clientAccounts.goHighLevel !== 'none';
      const hasGoogleSheets = clientAccounts?.googleSheets && clientAccounts.googleSheets !== 'none';

      if (hasFacebookAds && clientAccounts?.facebookAds) {promises.push(this.getFacebookMetrics(clientAccounts.facebookAds, dateRange, clientConversionActions?.facebookAds));}
      if (hasGoogleAds) {promises.push(this.getGoogleMetrics(dateRange, clientAccounts?.googleAds));}
      if (hasGoHighLevel) {
        promises.push(this.getGHLMetrics(dateRange, clientAccounts?.goHighLevel));
      }
      if (hasGoogleSheets) {promises.push(this.getEventMetrics(dateRange, clientAccounts));}

      const results = await Promise.all(promises);

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
        facebookMetrics = results[resultIndex++] as FacebookAdsMetrics;
      }
      if (hasGoogleAds) {
        googleMetrics = results[resultIndex++] as GoogleAdsMetrics;
      }
      if (hasGoHighLevel) {
        ghlMetrics = results[resultIndex++] as any;
      }
      if (hasGoogleSheets) {
        eventMetrics = results[resultIndex++] as EventMetrics;
      }

      // Calculate combined metrics
      const totalSpend = facebookMetrics.spend + googleMetrics.cost;
      const totalLeads = facebookMetrics.leads + googleMetrics.leads;
      const _totalRevenue = ghlMetrics.wonRevenue;
      const roi = totalSpend > 0 ? (_totalRevenue / totalSpend) : 0;

      // Calculate cost per lead
      const facebookCostPerLead = facebookMetrics.leads > 0
        ? facebookMetrics.spend / facebookMetrics.leads
        : 0;
      const googleCostPerLead = googleMetrics.leads > 0
        ? googleMetrics.cost / googleMetrics.leads
        : 0;

      // Build lead metrics
      const leadMetrics = this.calculateLeadMetrics(
        facebookMetrics,
        googleMetrics,
        ghlMetrics,
        eventMetrics,
        totalSpend,
        _totalRevenue
      );

      return {
        totalLeads,
        totalSpend,
        totalRevenue: _totalRevenue,
        roi,
        facebookMetrics: { ...facebookMetrics, costPerLead: facebookCostPerLead },
        googleMetrics: { ...googleMetrics, costPerLead: googleCostPerLead },
        ghlMetrics,
        eventMetrics,
        leadMetrics,
        dateRange
      };
    } catch (error) {
      debugLogger.error('EventMetricsService', 'Error fetching comprehensive metrics', error);
      throw error;
    }
  }

  private static async getFacebookMetrics(adAccountId: string, dateRange: { start: string; end: string }, conversionAction?: string): Promise<FacebookAdsMetrics> {
    try {
      debugLogger.debug('EventMetricsService', 'Fetching Facebook metrics for account', { adAccountId, dateRange, conversionAction });
      const metrics = await FacebookAdsService.getAccountMetrics(adAccountId, dateRange, conversionAction);
      debugLogger.debug('EventMetricsService', 'Facebook metrics result', metrics);
      
      // Log if we got empty data
      if (!metrics || (metrics.leads === 0 && metrics.spend === 0 && metrics.impressions === 0)) {
        debugLogger.warn('EventMetricsService', 'Facebook API returned empty data - all campaigns may be paused');
      }
      
      return metrics;
    } catch (error) {
      debugLogger.error('EventMetricsService', 'Facebook metrics error', error);
      debugLogger.warn('EventMetricsService', 'Facebook metrics not available', error);
      return this.getEmptyFacebookMetrics();
    }
  }

  private static async getGoogleMetrics(dateRange: { start: string; end: string }, clientGoogleAdsAccount?: string): Promise<GoogleAdsMetrics> {
    try {
      debugLogger.debug('EventMetricsService', 'Fetching Google Ads metrics', { dateRange, clientGoogleAdsAccount });
      
      // Import GoogleAdsService dynamically to avoid circular dependencies
      const { GoogleAdsService } = await import('@/services/api/googleAdsService');
      
      // Check if Google Ads is connected first
      const { TokenManager } = await import('@/services/auth/TokenManager');
      const isConnected = await TokenManager.isConnected('googleAds');
      
      if (!isConnected) {
        debugLogger.warn('EventMetricsService', 'Google Ads not connected, returning empty metrics');
        return this.getEmptyGoogleMetrics();
      }
      
      // Get the manager account ID from the integration (for login-customer-id header)
      const managerAccountId = await GoogleAdsService.getManagerAccountId();
      if (!managerAccountId) {
        debugLogger.warn('EventMetricsService', 'No manager account ID found in integration');
        return this.getEmptyGoogleMetrics();
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
      const metrics = await GoogleAdsService.getAccountMetrics(targetAccountId, dateRange);
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
      
      return this.getEmptyGoogleMetrics();
    }
  }

  private static async getGHLMetrics(dateRange: { start: string; end: string }, locationId?: string): Promise<any> {
    try {
      if (!locationId) {
        debugLogger.warn('EventMetricsService', 'No GoHighLevel location ID provided');
        return this.getEmptyGHLMetrics();
      }
      
      // Check if Go High Level is connected first
      const { TokenManager } = await import('@/services/auth/TokenManager');
      const isConnected = await TokenManager.isConnected('goHighLevel');
      
      if (!isConnected) {
        debugLogger.warn('EventMetricsService', 'Go High Level not connected, returning empty metrics');
        return this.getEmptyGHLMetrics();
      }
      
      const result = await GoHighLevelService.getGHLMetrics(locationId, dateRange);
      debugLogger.debug('EventMetricsService', 'Go High Level metrics result', result);
      return result;
    } catch (error) {
      debugLogger.error('EventMetricsService', 'GoHighLevel metrics error', error);
      
      // Check if it's an authentication error
      if (error instanceof Error && (error.message.includes('token') || error.message.includes('unauthorized'))) {
        debugLogger.warn('EventMetricsService', 'Go High Level authentication error - returning empty metrics');
      } else {
        debugLogger.warn('EventMetricsService', 'Go High Level metrics not available', error);
      }
      
      return this.getEmptyGHLMetrics();
    }
  }

  private static async getEventMetrics(
    dateRange: { start: string; end: string },
    clientAccounts?: { googleSheets?: string; googleSheetsConfig?: { spreadsheetId: string; sheetName: string } }
  ): Promise<EventMetrics> {
    try {
      // Use client-specific Google Sheets configuration if available
      let leadData;
      if (clientAccounts?.googleSheetsConfig) {
        leadData = await LeadDataService.fetchLeadData(
          clientAccounts.googleSheetsConfig.spreadsheetId,
          clientAccounts.googleSheetsConfig.sheetName
        );
      } else {
        // Fallback to default configuration
        leadData = await LeadDataService.fetchLeadData();
      }
      
      if (leadData) {
        return {
          totalEvents: leadData.totalLeads,
          averageGuests: leadData.averageGuestsPerLead,
          totalSubmissions: leadData.totalLeads,
          eventTypeBreakdown: (leadData.eventTypes || []).map(eventType => ({
            ...eventType,
            avgGuests: 0
          })),
          budgetDistribution: []
        };
      }
      return this.getEmptyEventMetrics();
    } catch (error) {
      debugLogger.warn('EventMetricsService', 'Event metrics not available - using LeadDataService fallback', error);
      return this.getEmptyEventMetrics();
    }
  }

  private static calculateLeadMetrics(
    facebook: FacebookAdsMetrics,
    google: GoogleAdsMetrics,
    ghl: any,
    events: EventMetrics,
    totalSpend: number,
    _totalRevenue: number
  ): EventLeadMetrics {
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

    // No seasonal trends - only real data
    const seasonalTrends: any[] = [];

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

  // Helper methods for empty metrics when services are not connected
  private static getEmptyFacebookMetrics(): FacebookAdsMetrics {
    return {
      impressions: 0,
      clicks: 0,
      spend: 0,
      leads: 0,
      conversions: 0,
      ctr: 0,
      cpc: 0,
      cpm: 0,
      roas: 0,
      reach: 0,
      frequency: 0
    };
  }

  private static getEmptyGoogleMetrics(): GoogleAdsMetrics {
    return {
      impressions: 0,
      clicks: 0,
      cost: 0,
      leads: 0,
      conversions: 0,
      ctr: 0,
      cpc: 0,
      conversionRate: 0,
      costPerConversion: 0,
      searchImpressionShare: 0,
      qualityScore: 0
    };
  }

  private static getEmptyGHLMetrics(): any {
    return {
      totalContacts: 0,
      newContacts: 0,
      totalOpportunities: 0,
      wonOpportunities: 0,
      lostOpportunities: 0,
      pipelineValue: 0,
      avgDealSize: 0,
      conversionRate: 0,
      responseTime: 0,
      wonRevenue: 0
    };
  }

  private static getEmptyEventMetrics(): EventMetrics {
    return {
      totalEvents: 0,
      averageGuests: 0,
      totalSubmissions: 0,
      eventTypeBreakdown: [],
      budgetDistribution: []
    };
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
