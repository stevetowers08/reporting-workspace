import { debugLogger } from '@/lib/debug';
import { GoHighLevelService } from '../goHighLevelService';
import { GHLContactsModule } from './contacts';

export interface GHLAnalyticsMetrics {
  totalContacts: number;
  newContacts: number;
  totalGuests: number;
  averageGuestsPerLead: number;
  sourceBreakdown: Array<{ source: string; count: number; percentage: number }>;
  guestCountDistribution: Array<{ range: string; count: number; percentage: number }>;
  eventTypeBreakdown: Array<{ type: string; count: number; percentage: number }>;
  recentContacts: Array<{
    id: string;
    name: string;
    email: string;
    phone: string;
    source: string;
    dateAdded: string;
    guestCount?: number;
    eventDate?: string;
  }>;
  conversionRate: number;
  topPerformingSources: Array<{ source: string; leads: number; avgGuests: number }>;
  pageViewAnalytics: {
    totalPageViews: number;
    uniquePages: Array<{ page: string; views: number; percentage: number }>;
    topLandingPages: Array<{ url: string; views: number; conversions: number; conversionRate: number }>;
    utmCampaigns: Array<{ campaign: string; views: number; conversions: number; conversionRate: number }>;
    utmSources: Array<{ source: string; views: number; conversions: number; conversionRate: number }>;
    referrerBreakdown: Array<{ referrer: string; views: number; percentage: number }>;
  };
}

export interface DateRange {
  start: string;
  end: string;
}

export class GHLAnalyticsModule {
  /**
   * Get comprehensive GHL metrics for a specific location
   */
  static async getMetrics(locationId: string, dateRange?: DateRange): Promise<GHLAnalyticsMetrics> {
    debugLogger.info('GHL-Analytics', `Calculating metrics for location: ${locationId}`);
    
    try {
      // Use the existing getGHLMetrics method from the main service
      const metrics = await GoHighLevelService['getGHLMetrics'](locationId, dateRange);
      
      debugLogger.info('GHL-Analytics', `Calculated metrics for ${metrics.totalContacts} total contacts`);
      return metrics;
    } catch (error) {
      debugLogger.error('GHL-Analytics', 'Failed to calculate metrics', error);
      throw error;
    }
  }

  /**
   * Get source breakdown analytics
   */
  static async getSourceBreakdown(locationId: string, dateRange?: DateRange): Promise<Array<{ source: string; count: number; percentage: number }>> {
    debugLogger.info('GHL-Analytics', `Getting source breakdown for location: ${locationId}`);
    
    try {
      const metrics = await this.getMetrics(locationId, dateRange);
      debugLogger.info('GHL-Analytics', `Retrieved breakdown for ${metrics.sourceBreakdown.length} sources`);
      return metrics.sourceBreakdown;
    } catch (error) {
      debugLogger.error('GHL-Analytics', 'Failed to get source breakdown', error);
      throw error;
    }
  }

  /**
   * Get guest count distribution analytics
   */
  static async getGuestDistribution(locationId: string, dateRange?: DateRange): Promise<Array<{ range: string; count: number; percentage: number }>> {
    debugLogger.info('GHL-Analytics', `Getting guest distribution for location: ${locationId}`);
    
    try {
      const metrics = await this.getMetrics(locationId, dateRange);
      debugLogger.info('GHL-Analytics', `Retrieved distribution for ${metrics.guestCountDistribution.length} ranges`);
      return metrics.guestCountDistribution;
    } catch (error) {
      debugLogger.error('GHL-Analytics', 'Failed to get guest distribution', error);
      throw error;
    }
  }

  /**
   * Get top performing sources
   */
  static async getTopPerformingSources(locationId: string, dateRange?: DateRange): Promise<Array<{ source: string; leads: number; avgGuests: number }>> {
    debugLogger.info('GHL-Analytics', `Getting top performing sources for location: ${locationId}`);
    
    try {
      const metrics = await this.getMetrics(locationId, dateRange);
      debugLogger.info('GHL-Analytics', `Retrieved ${metrics.topPerformingSources.length} top sources`);
      return metrics.topPerformingSources;
    } catch (error) {
      debugLogger.error('GHL-Analytics', 'Failed to get top performing sources', error);
      throw error;
    }
  }

  /**
   * Get page view analytics
   */
  static async getPageViewAnalytics(locationId: string, dateRange?: DateRange): Promise<GHLAnalyticsMetrics['pageViewAnalytics']> {
    debugLogger.info('GHL-Analytics', `Getting page view analytics for location: ${locationId}`);
    
    try {
      const metrics = await this.getMetrics(locationId, dateRange);
      debugLogger.info('GHL-Analytics', `Retrieved page view analytics with ${metrics.pageViewAnalytics.totalPageViews} total views`);
      return metrics.pageViewAnalytics;
    } catch (error) {
      debugLogger.error('GHL-Analytics', 'Failed to get page view analytics', error);
      throw error;
    }
  }

  /**
   * Get conversion rate analytics
   */
  static async getConversionRate(locationId: string, dateRange?: DateRange): Promise<number> {
    debugLogger.info('GHL-Analytics', `Getting conversion rate for location: ${locationId}`);
    
    try {
      const metrics = await this.getMetrics(locationId, dateRange);
      debugLogger.info('GHL-Analytics', `Conversion rate: ${metrics.conversionRate}%`);
      return metrics.conversionRate;
    } catch (error) {
      debugLogger.error('GHL-Analytics', 'Failed to get conversion rate', error);
      throw error;
    }
  }

  /**
   * Get recent contacts analytics
   */
  static async getRecentContactsAnalytics(locationId: string, limit: number = 10): Promise<Array<{
    id: string;
    name: string;
    email: string;
    phone: string;
    source: string;
    dateAdded: string;
    guestCount?: number;
    eventDate?: string;
  }>> {
    debugLogger.info('GHL-Analytics', `Getting recent contacts analytics for location: ${locationId}`);
    
    try {
      const metrics = await this.getMetrics(locationId);
      const recentContacts = metrics.recentContacts.slice(0, limit);
      
      debugLogger.info('GHL-Analytics', `Retrieved ${recentContacts.length} recent contacts`);
      return recentContacts;
    } catch (error) {
      debugLogger.error('GHL-Analytics', 'Failed to get recent contacts analytics', error);
      throw error;
    }
  }

  /**
   * Calculate custom analytics based on contact data
   */
  static async calculateCustomAnalytics(
    locationId: string, 
    dateRange?: DateRange,
    customFields?: string[]
  ): Promise<Record<string, any>> {
    debugLogger.info('GHL-Analytics', `Calculating custom analytics for location: ${locationId}`);
    
    try {
      const contacts = await GHLContactsModule.getContacts(locationId, {
        startDate: dateRange?.start,
        endDate: dateRange?.end
      });

      const analytics: Record<string, any> = {
        totalContacts: contacts.length,
        customFieldBreakdown: {} as Record<string, Record<string, number>>,
        customFieldStats: {} as Record<string, any>
      };

      // Analyze custom fields if provided
      if (customFields) {
        for (const field of customFields) {
          const fieldValues = contacts
            .map(contact => contact.customFields?.[field])
            .filter(value => value !== undefined && value !== null);

          analytics.customFieldBreakdown[field] = fieldValues.reduce((acc, value) => {
            const key = String(value);
            acc[key] = (acc[key] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          analytics.customFieldStats[field] = {
            total: fieldValues.length,
            unique: new Set(fieldValues).size,
            average: fieldValues.length > 0 ? fieldValues.reduce((sum, val) => sum + Number(val || 0), 0) / fieldValues.length : 0
          };
        }
      }

      debugLogger.info('GHL-Analytics', `Calculated custom analytics for ${analytics.totalContacts} contacts`);
      return analytics;
    } catch (error) {
      debugLogger.error('GHL-Analytics', 'Failed to calculate custom analytics', error);
      throw error;
    }
  }

  /**
   * Get event type breakdown
   */
  static async getEventTypeBreakdown(locationId: string, dateRange?: DateRange): Promise<Array<{ type: string; count: number; percentage: number }>> {
    debugLogger.info('GHL-Analytics', `Getting event type breakdown for location: ${locationId}`);
    
    try {
      const metrics = await this.getMetrics(locationId, dateRange);
      debugLogger.info('GHL-Analytics', `Retrieved breakdown for ${metrics.eventTypeBreakdown.length} event types`);
      return metrics.eventTypeBreakdown;
    } catch (error) {
      debugLogger.error('GHL-Analytics', 'Failed to get event type breakdown', error);
      throw error;
    }
  }
}
