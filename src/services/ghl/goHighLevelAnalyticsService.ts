// GoHighLevel Analytics Service

import { debugLogger } from '@/lib/debug';
import { supabase } from '@/lib/supabase';
import { GHLRateLimiter, GHLValidator } from './goHighLevelUtils';
import { GoHighLevelAuthService } from './goHighLevelAuthService';
import { GoHighLevelApiService } from './goHighLevelApiService';
import type { 
  GHLMetrics,
  GHLFunnelAnalytics,
  GHLPageAnalytics,
  GHLOpportunityAnalytics,
  GHLCalendarAnalytics
} from './goHighLevelTypes';

export class GoHighLevelAnalyticsService {
  private static readonly API_BASE_URL = 'https://services.leadconnectorhq.com';
  private static readonly API_VERSION = '2021-07-28';

  // Main Metrics Aggregator
  static async getGHLMetrics(
    locationId: string,
    dateRange?: { startDate?: string; endDate?: string }
  ): Promise<GHLMetrics> {
    try {
      await GHLRateLimiter.enforceRateLimit();
      await GoHighLevelAuthService.ensureAgencyToken();
      
      if (!GoHighLevelAuthService.getAgencyToken()) {
        throw new Error('Private integration token not set');
      }

      debugLogger.info('GoHighLevelAnalyticsService', 'Getting GHL metrics', { locationId, dateRange });

      // Get all metrics in parallel
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
          eventsByStatus: {},
          averageEventDuration: 0,
          eventsByMonth: {}
        }
      };

      debugLogger.info('GoHighLevelAnalyticsService', 'GHL metrics retrieved successfully', { locationId });
      return result;

    } catch (error) {
      debugLogger.error('GoHighLevelAnalyticsService', 'Failed to get GHL metrics', error);
      throw error;
    }
  }

  // Contact Metrics
  private static async getContactMetrics(
    locationId: string,
    dateRange?: { startDate?: string; endDate?: string }
  ): Promise<{ total: number; newThisMonth: number; growthRate: number }> {
    try {
      const total = await GoHighLevelApiService.getContactCount(locationId);
      
      // Calculate new this month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const newThisMonth = await GoHighLevelApiService.getContactCount(locationId, {
        startDate: startOfMonth.toISOString(),
        endDate: now.toISOString()
      });

      // Calculate growth rate (simplified)
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      const lastMonthCount = await GoHighLevelApiService.getContactCount(locationId, {
        startDate: lastMonth.toISOString(),
        endDate: endOfLastMonth.toISOString()
      });

      const growthRate = lastMonthCount > 0 ? ((newThisMonth - lastMonthCount) / lastMonthCount) * 100 : 0;

      return {
        total,
        newThisMonth,
        growthRate: Math.round(growthRate * 100) / 100
      };
    } catch (error) {
      debugLogger.warn('GoHighLevelAnalyticsService', 'Failed to get contact metrics', error);
      return { total: 0, newThisMonth: 0, growthRate: 0 };
    }
  }

  // Campaign Metrics
  private static async getCampaignMetrics(
    locationId: string,
    dateRange?: { startDate?: string; endDate?: string }
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
      await GoHighLevelAuthService.ensureAgencyToken();
      
      if (!GoHighLevelAuthService.getAgencyToken()) {
        throw new Error('Private integration token not set');
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
      await GoHighLevelAuthService.ensureAgencyToken();
      
      if (!GoHighLevelAuthService.getAgencyToken()) {
        throw new Error('Private integration token not set');
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
    dateRange?: { startDate?: string; endDate?: string }
  ): Promise<GHLPageAnalytics> {
    // This would typically call a specific analytics endpoint
    // For now, return mock data structure
    return {
      id: pageId,
      name: `Page ${pageId}`,
      views: Math.floor(Math.random() * 1000),
      uniqueViews: Math.floor(Math.random() * 800),
      conversions: Math.floor(Math.random() * 50),
      conversionRate: Math.round(Math.random() * 10 * 100) / 100
    };
  }

  // Opportunities Analytics
  static async getOpportunitiesAnalytics(
    locationId: string,
    dateRange?: { startDate?: string; endDate?: string }
  ): Promise<GHLOpportunityAnalytics> {
    try {
      await GHLRateLimiter.enforceRateLimit();
      await GoHighLevelAuthService.ensureAgencyToken();
      
      if (!GoHighLevelAuthService.getAgencyToken()) {
        throw new Error('Private integration token not set');
      }

      debugLogger.info('GoHighLevelAnalyticsService', 'Getting opportunities analytics', { locationId, dateRange });

      const opportunities = await GoHighLevelApiService.getOpportunities(locationId);
      
      const totalOpportunities = opportunities.length;
      const totalValue = opportunities.reduce((sum, opp) => sum + (opp.value || 0), 0);
      
      const opportunitiesByStatus: Record<string, number> = {};
      const valueByStatus: Record<string, number> = {};
      
      opportunities.forEach(opp => {
        const status = opp.status || 'unknown';
        opportunitiesByStatus[status] = (opportunitiesByStatus[status] || 0) + 1;
        valueByStatus[status] = (valueByStatus[status] || 0) + (opp.value || 0);
      });

      const averageDealSize = totalOpportunities > 0 ? totalValue / totalOpportunities : 0;
      
      // Calculate conversion rate (simplified)
      const closedWon = opportunitiesByStatus['closed-won'] || 0;
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
    dateRange?: { startDate?: string; endDate?: string }
  ): Promise<GHLCalendarAnalytics> {
    try {
      await GHLRateLimiter.enforceRateLimit();
      await GoHighLevelAuthService.ensureAgencyToken();
      
      if (!GoHighLevelAuthService.getAgencyToken()) {
        throw new Error('Private integration token not set');
      }

      debugLogger.info('GoHighLevelAnalyticsService', 'Getting calendar analytics', { locationId, dateRange });

      const events = await GoHighLevelApiService.getCalendarEvents(locationId);
      
      const totalEvents = events.length;
      const eventsByStatus: Record<string, number> = {};
      const eventsByMonth: Record<string, number> = {};
      
      let totalDuration = 0;
      let eventsWithDuration = 0;

      events.forEach(event => {
        const status = event.status || 'unknown';
        eventsByStatus[status] = (eventsByStatus[status] || 0) + 1;
        
        const eventDate = new Date(event.startTime);
        const monthKey = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}`;
        eventsByMonth[monthKey] = (eventsByMonth[monthKey] || 0) + 1;
        
        // Calculate duration
        const startTime = new Date(event.startTime);
        const endTime = new Date(event.endTime);
        const duration = endTime.getTime() - startTime.getTime();
        
        if (duration > 0) {
          totalDuration += duration;
          eventsWithDuration++;
        }
      });

      const averageEventDuration = eventsWithDuration > 0 ? totalDuration / eventsWithDuration : 0;

      const result: GHLCalendarAnalytics = {
        totalEvents,
        eventsByStatus,
        averageEventDuration: Math.round(averageEventDuration / (1000 * 60 * 60) * 100) / 100, // Convert to hours
        eventsByMonth
      };

      debugLogger.info('GoHighLevelAnalyticsService', 'Calendar analytics retrieved', { 
        totalEvents, 
        averageEventDuration: result.averageEventDuration 
      });
      
      return result;

    } catch (error) {
      debugLogger.error('GoHighLevelAnalyticsService', 'Failed to get calendar analytics', error);
      return {
        totalEvents: 0,
        eventsByStatus: {},
        averageEventDuration: 0,
        eventsByMonth: {}
      };
    }
  }
}
