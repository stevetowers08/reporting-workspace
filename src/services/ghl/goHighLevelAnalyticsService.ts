// GoHighLevel Analytics Service

import { debugLogger } from '@/lib/debug';
import { GoHighLevelApiService } from './goHighLevelApiService';
import type {
    GHLCalendarAnalytics,
    GHLFunnelAnalytics,
    GHLMetrics,
    GHLOpportunityAnalytics,
    GHLPageAnalytics
} from './goHighLevelTypes';
import { GHLRateLimiter } from './goHighLevelUtils';

export class GoHighLevelAnalyticsService {
  private static readonly API_BASE_URL = 'https://services.leadconnectorhq.com';
  private static readonly API_VERSION = '2021-04-15'; // API 2.0 version header

  // Main Metrics Aggregator
  static async getGHLMetrics(
    locationId: string,
    dateRange?: { startDate?: string; endDate?: string }
  ): Promise<GHLMetrics | null> { // ✅ Changed return type to allow null
    try {
      await GHLRateLimiter.enforceRateLimit();
      
      // ✅ Check if OAuth is connected first
      const token = await GoHighLevelApiService.getValidToken(locationId);
      if (!token) {
        debugLogger.warn('GoHighLevelAnalyticsService', 'GoHighLevel OAuth not connected for this location - skipping GHL metrics', { locationId });
        return null; // Return null to indicate OAuth not connected
      }

      debugLogger.info('GoHighLevelAnalyticsService', 'Getting GHL metrics', { locationId, dateRange });

      // Get all metrics in parallel with proper error handling
      const [contacts, campaigns, funnels, pages, opportunities, calendars] = await Promise.allSettled([
        this.getContactMetrics(locationId, dateRange),
        this.getCampaignMetrics(locationId, dateRange),
        this.getFunnelAnalytics(locationId, dateRange),
        this.getPageAnalytics(locationId, dateRange),
        this.getOpportunitiesAnalytics(locationId, dateRange),
        this.getCalendarAnalytics(locationId, dateRange)
      ]);

      const result: GHLMetrics = {
        contacts: contacts.status === 'fulfilled' ? contacts.value : {
          total: 0,
          newThisMonth: 0,
          growthRate: 0
        },
        campaigns: campaigns.status === 'fulfilled' ? campaigns.value : {
          total: 0,
          active: 0,
          totalSpent: 0,
          totalConversions: 0
        },
        funnels: funnels.status === 'fulfilled' ? funnels.value : [],
        pages: pages.status === 'fulfilled' ? pages.value : [],
        opportunities: opportunities.status === 'fulfilled' ? opportunities.value : {
          totalOpportunities: 0,
          totalValue: 0,
          opportunitiesByStatus: {},
          valueByStatus: {},
          averageDealSize: 0,
          conversionRate: 0
        },
        calendars: calendars.status === 'fulfilled' ? calendars.value : {
          totalEvents: 0,
          totalAppointments: 0,
          totalMeetings: 0,
          eventsByType: {},
          averageEventDuration: 0,
          eventsByStatus: {}
        }
      };

      debugLogger.info('GoHighLevelAnalyticsService', 'GHL metrics retrieved successfully', { locationId });
      
      // Transform the new nested structure to the old flat structure that eventMetricsService expects
      return {
        totalContacts: result.contacts.total,
        newContacts: result.contacts.newThisMonth,
        totalOpportunities: result.opportunities.totalOpportunities,
        wonOpportunities: result.opportunities.opportunitiesByStatus?.won || 0,
        lostOpportunities: result.opportunities.opportunitiesByStatus?.lost || 0,
        pipelineValue: result.opportunities.totalValue,
        avgDealSize: result.opportunities.averageDealSize,
        conversionRate: result.opportunities.conversionRate,
        responseTime: 0, // Not available in new structure
        wonRevenue: result.opportunities.valueByStatus?.won || 0
      };

    } catch (error) {
      debugLogger.error('GoHighLevelAnalyticsService', 'Failed to get GHL metrics', error);
      // Return the old flat structure that eventMetricsService expects
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
      }; // Return default flat structure instead of null
    }
  }

  // Contact Metrics
  private static async getContactMetrics(
    locationId: string,
    _dateRange?: { startDate?: string; endDate?: string }
  ): Promise<{ total: number; newThisMonth: number; growthRate: number }> {
    try {
      // ✅ FIX: Get total count without date filter (supported)
      const total = await GoHighLevelApiService.getContactCount(locationId);
      
      // For date-specific metrics, use a simplified approach or skip
      // since GoHighLevel doesn't support date filtering well in the API
      
      debugLogger.info('GoHighLevelAnalyticsService', 'Contact metrics retrieved', { 
        total,
        note: 'Date filtering disabled due to API limitations'
      });
      
      return {
        total,
        newThisMonth: 0, // Set to 0 or fetch all and filter
        growthRate: 0 // Calculate manually if needed
      };
    } catch (error) {
      debugLogger.warn('GoHighLevelAnalyticsService', 'Failed to get contact metrics', error);
      return { total: 0, newThisMonth: 0, growthRate: 0 };
    }
  }

  // Campaign Metrics
  private static async getCampaignMetrics(
    locationId: string,
    _dateRange?: { startDate?: string; endDate?: string }
  ): Promise<{ total: number; active: number; totalSpent: number; totalConversions: number }> {
    try {
      const campaigns = await GoHighLevelApiService.getCampaigns(locationId);
      
      const total = campaigns.length;
      const active = campaigns.filter(c => c.status === 'active').length;
      const totalSpent = campaigns.reduce((sum, c) => sum + (c.spent || 0), 0);
      const totalConversions = campaigns.reduce((sum, c) => sum + (c.conversions || 0), 0);

      return {
        total,
        active,
        totalSpent,
        totalConversions
      };
    } catch (error) {
      debugLogger.warn('GoHighLevelAnalyticsService', 'Failed to get campaign metrics', error);
      return { total: 0, active: 0, totalSpent: 0, totalConversions: 0 };
    }
  }

  // Funnel Analytics
  static async getFunnelAnalytics(
    locationId: string,
    dateRange?: { startDate?: string; endDate?: string }
  ): Promise<GHLFunnelAnalytics[]> {
    try {
      await GHLRateLimiter.enforceRateLimit();
      
      // Use client-specific OAuth token instead of agency token
      const token = await GoHighLevelApiService.getValidToken(locationId);
      if (!token) {
        throw new Error(`No valid OAuth token found for location ${locationId}`);
      }

      debugLogger.info('GoHighLevelAnalyticsService', 'Getting funnel analytics', { locationId, dateRange });

      const funnels = await GoHighLevelApiService.getFunnels(locationId);
      const result: GHLFunnelAnalytics[] = [];

      for (const funnel of funnels) {
        try {
          // Get funnel pages
          const pages = await GoHighLevelApiService.getFunnelPages(funnel._id, locationId);
          
          // Get analytics for each page
          const pageAnalytics: GHLPageAnalytics[] = [];
          for (const page of pages) {
            try {
              const analytics = await this.getPageAnalyticsForFunnel(funnel._id, page._id, locationId, dateRange);
              pageAnalytics.push(analytics);
            } catch (error) {
              debugLogger.warn('GoHighLevelAnalyticsService', `Failed to get analytics for funnel ${funnel._id}`, error);
              pageAnalytics.push({
                id: page._id,
                name: page.name,
                views: 0,
                uniqueViews: 0,
                conversions: 0,
                conversionRate: 0
              });
            }
          }

          // Calculate funnel totals
          const totalViews = pageAnalytics.reduce((sum, p) => sum + p.views, 0);
          const totalUniqueViews = pageAnalytics.reduce((sum, p) => sum + p.uniqueViews, 0);
          const totalConversions = pageAnalytics.reduce((sum, p) => sum + p.conversions, 0);
          const conversionRate = totalViews > 0 ? (totalConversions / totalViews) * 100 : 0;

          result.push({
            id: funnel._id,
            name: funnel.name,
            views: totalViews,
            uniqueViews: totalUniqueViews,
            conversions: totalConversions,
            conversionRate: Math.round(conversionRate * 100) / 100,
            pages: pageAnalytics
          });
        } catch (error) {
          debugLogger.warn('GoHighLevelAnalyticsService', `Failed to get analytics for funnel ${funnel._id}`, error);
          result.push({
            id: funnel._id,
            name: funnel.name,
            views: 0,
            uniqueViews: 0,
            conversions: 0,
            conversionRate: 0,
            pages: []
          });
        }
      }

      debugLogger.info('GoHighLevelAnalyticsService', `Retrieved analytics for ${result.length} funnels`);
      return result;

    } catch (error) {
      debugLogger.error('GoHighLevelAnalyticsService', 'Failed to get funnel analytics', error);
      return [];
    }
  }

  // Page Analytics
  static async getPageAnalytics(
    locationId: string,
    dateRange?: { startDate?: string; endDate?: string }
  ): Promise<GHLPageAnalytics[]> {
    try {
      await GHLRateLimiter.enforceRateLimit();
      
      // Use client-specific OAuth token instead of agency token
      const token = await GoHighLevelApiService.getValidToken(locationId);
      if (!token) {
        throw new Error(`No valid OAuth token found for location ${locationId}`);
      }

      debugLogger.info('GoHighLevelAnalyticsService', 'Getting page analytics', { locationId, dateRange });

      const funnels = await GoHighLevelApiService.getFunnels(locationId);
      const allPages: GHLPageAnalytics[] = [];

      for (const funnel of funnels) {
        try {
          const pages = await GoHighLevelApiService.getFunnelPages(funnel._id, locationId);
          
          for (const page of pages) {
            try {
              const analytics = await this.getPageAnalyticsForFunnel(funnel._id, page._id, locationId, dateRange);
              allPages.push(analytics);
            } catch (error) {
              debugLogger.warn('GoHighLevelAnalyticsService', `Failed to get analytics for page ${page._id}`, error);
            }
          }
        } catch (error) {
          debugLogger.warn('GoHighLevelAnalyticsService', `Failed to get pages for funnel ${funnel._id}`, error);
        }
      }

      debugLogger.info('GoHighLevelAnalyticsService', `Retrieved analytics for ${allPages.length} pages`);
      return allPages;

    } catch (error) {
      debugLogger.error('GoHighLevelAnalyticsService', 'Failed to get page analytics', error);
      return [];
    }
  }

  private static async getPageAnalyticsForFunnel(
    funnelId: string,
    pageId: string,
    locationId: string,
    _dateRange?: { startDate?: string; endDate?: string }
  ): Promise<GHLPageAnalytics | null> {
    // GoHighLevel doesn't provide page-level analytics in their current API
    debugLogger.warn('GoHighLevelAnalyticsService', 'Page analytics not available in GoHighLevel API', {
      funnelId,
      pageId,
      locationId
    });
    
    return null;
  }

  // Opportunities Analytics
  static async getOpportunitiesAnalytics(
    locationId: string,
    dateRange?: { startDate?: string; endDate?: string }
  ): Promise<GHLOpportunityAnalytics> {
    try {
      await GHLRateLimiter.enforceRateLimit();
      
      // Use client-specific OAuth token instead of agency token
      const token = await GoHighLevelApiService.getValidToken(locationId);
      if (!token) {
        throw new Error(`No valid OAuth token found for location ${locationId}`);
      }

      debugLogger.info('GoHighLevelAnalyticsService', 'Getting opportunities analytics', { locationId, dateRange });

      const opportunities = await GoHighLevelApiService.getOpportunities(locationId);
      
      const totalOpportunities = opportunities.length;
      const totalValue = opportunities.reduce((sum, opp) => sum + (opp.monetaryValue || 0), 0);
      
      const opportunitiesByStatus: Record<string, number> = {};
      const valueByStatus: Record<string, number> = {};
      
      opportunities.forEach(opp => {
        const status = opp.status || 'unknown';
        opportunitiesByStatus[status] = (opportunitiesByStatus[status] || 0) + 1;
        valueByStatus[status] = (valueByStatus[status] || 0) + (opp.monetaryValue || 0);
      });

      const averageDealSize = totalOpportunities > 0 ? totalValue / totalOpportunities : 0;
      
      // Calculate conversion rate (simplified)
      const closedWon = opportunitiesByStatus['closed-won'] || opportunitiesByStatus['won'] || 0;
      const conversionRate = totalOpportunities > 0 ? (closedWon / totalOpportunities) * 100 : 0;

      const result: GHLOpportunityAnalytics = {
        totalOpportunities,
        totalValue,
        opportunitiesByStatus,
        valueByStatus,
        averageDealSize: Math.round(averageDealSize * 100) / 100,
        conversionRate: Math.round(conversionRate * 100) / 100
      };

      debugLogger.info('GoHighLevelAnalyticsService', 'Opportunities analytics retrieved', { 
        totalOpportunities, 
        totalValue 
      });
      
      return result;

    } catch (error) {
      debugLogger.error('GoHighLevelAnalyticsService', 'Failed to get opportunities analytics', error);
      return {
        totalOpportunities: 0,
        totalValue: 0,
        opportunitiesByStatus: {},
        valueByStatus: {},
        averageDealSize: 0,
        conversionRate: 0
      };
    }
  }

  // Calendar Analytics
  static async getCalendarAnalytics(
    locationId: string,
    _dateRange?: { startDate?: string; endDate?: string }
  ): Promise<GHLCalendarAnalytics> {
    try {
      await GHLRateLimiter.enforceRateLimit();
      
      debugLogger.info('GoHighLevelAnalyticsService', 'Getting calendar analytics', { locationId, dateRange: _dateRange });

      // For now, return a placeholder implementation
      // This would need to be implemented based on actual GHL calendar API
      const result: GHLCalendarAnalytics = {
        totalEvents: 0,
        totalAppointments: 0,
        totalMeetings: 0,
        eventsByType: {},
        averageEventDuration: 0,
        eventsByStatus: {}
      };

      debugLogger.info('GoHighLevelAnalyticsService', 'Calendar analytics retrieved', { 
        totalEvents: result.totalEvents 
      });
      
      return result;

    } catch (error) {
      debugLogger.error('GoHighLevelAnalyticsService', 'Failed to get calendar analytics', error);
      return {
        totalEvents: 0,
        totalAppointments: 0,
        totalMeetings: 0,
        eventsByType: {},
        averageEventDuration: 0,
        eventsByStatus: {}
      };
    }
  }

}
