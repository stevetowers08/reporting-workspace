/**
 * Monthly Leads Service
 * Fetches actual monthly leads data from Google Ads and Facebook Ads APIs
 * for the last 5 complete months (excluding current month)
 */

import { debugLogger } from '@/lib/debug';
import { FacebookAdsService } from '@/services/api/facebookAdsService';
import { GoogleAdsService } from '@/services/api/googleAdsService';

export interface MonthlyLeadsData {
  month: string; // YYYY-MM format
  monthLabel: string; // "Jun 2025" format
  facebookLeads: number;
  googleLeads: number;
  totalLeads: number;
}

export interface MonthlyLeadsServiceConfig {
  clientId: string;
  facebookAdAccountId?: string;
  googleCustomerId?: string;
}

export class MonthlyLeadsService {
  /**
   * Get leads data for the last 5 complete months
   */
  static async getMonthlyLeads(config: MonthlyLeadsServiceConfig): Promise<MonthlyLeadsData[]> {
    try {
      debugLogger.debug('MonthlyLeadsService', 'Fetching monthly leads data', config);

      // Calculate date range for last 5 complete months
      const { startDate, endDate } = this.calculateDateRange();
      
      debugLogger.debug('MonthlyLeadsService', 'Date range calculated', { startDate, endDate });

      // Fetch data from both platforms in parallel
      const [facebookLeads, googleLeads] = await Promise.allSettled([
        config.facebookAdAccountId 
          ? this.fetchFacebookMonthlyLeads(config.facebookAdAccountId, startDate, endDate)
          : Promise.resolve({}),
        config.googleCustomerId 
          ? this.fetchGoogleMonthlyLeads(config.googleCustomerId, startDate, endDate)
          : Promise.resolve({})
      ]);

      // Process results
      const facebookData = facebookLeads.status === 'fulfilled' ? facebookLeads.value : {};
      const googleData = googleLeads.status === 'fulfilled' ? googleLeads.value : {};

      debugLogger.debug('MonthlyLeadsService', 'Platform data fetched', { 
        facebookMonths: Object.keys(facebookData).length,
        googleMonths: Object.keys(googleData).length
      });

      // Combine data by month
      const combinedData = this.combineMonthlyData(facebookData, googleData);
      
      debugLogger.debug('MonthlyLeadsService', 'Data combined', { 
        totalMonths: combinedData.length,
        totalLeads: combinedData.reduce((sum, month) => sum + month.totalLeads, 0),
        months: combinedData.map(m => ({ month: m.month, facebook: m.facebookLeads, google: m.googleLeads, total: m.totalLeads }))
      });

      return combinedData;
    } catch (error) {
      debugLogger.error('MonthlyLeadsService', 'Failed to fetch monthly leads', error);
      throw new Error('Failed to fetch monthly leads data');
    }
  }

  /**
   * Calculate date range for last 5 complete months
   */
  private static calculateDateRange(): { startDate: string; endDate: string } {
    const today = new Date();
    const currentMonth = today.getMonth(); // 0-11
    const currentYear = today.getFullYear();

    // Start: 5 months ago, first day
    const startDate = new Date(currentYear, currentMonth - 5, 1);
    const startDateStr = startDate.toISOString().split('T')[0]; // YYYY-MM-DD

    // End: Last day of previous month
    const endDate = new Date(currentYear, currentMonth, 0);
    const endDateStr = endDate.toISOString().split('T')[0]; // YYYY-MM-DD

    return { startDate: startDateStr, endDate: endDateStr };
  }

  /**
   * Fetch monthly leads from Facebook Ads API
   */
  private static async fetchFacebookMonthlyLeads(
    adAccountId: string, 
    startDate: string, 
    endDate: string
  ): Promise<Record<string, number>> {
    try {
      debugLogger.debug('MonthlyLeadsService', 'Fetching Facebook monthly leads', {
        adAccountId, startDate, endDate
      });

      // Use the existing getMonthlyMetrics method
      const monthlyMetrics = await FacebookAdsService.getMonthlyMetrics(adAccountId);

      const leadsByMonth: Record<string, number> = {};

      for (const metric of monthlyMetrics) {
        leadsByMonth[metric.month] = metric.leads;
      }

      debugLogger.debug('MonthlyLeadsService', 'Facebook leads processed', {
        months: Object.keys(leadsByMonth),
        totalLeads: Object.values(leadsByMonth).reduce((sum, leads) => sum + leads, 0)
      });

      return leadsByMonth;
    } catch (error) {
      debugLogger.error('MonthlyLeadsService', 'Failed to fetch Facebook monthly leads', error);
      return {};
    }
  }

  /**
   * Fetch monthly leads from Google Ads API
   */
  private static async fetchGoogleMonthlyLeads(
    customerId: string, 
    startDate: string, 
    endDate: string
  ): Promise<Record<string, number>> {
    try {
      debugLogger.debug('MonthlyLeadsService', 'Fetching Google monthly leads', {
        customerId, startDate, endDate
      });

      // Use the existing getMonthlyMetrics method
      const monthlyMetrics = await GoogleAdsService.getMonthlyMetrics(customerId);
      
      const leadsByMonth: Record<string, number> = {};

      for (const metric of monthlyMetrics) {
        leadsByMonth[metric.month] = metric.leads;
      }

      debugLogger.debug('MonthlyLeadsService', 'Google leads processed', {
        months: Object.keys(leadsByMonth),
        totalLeads: Object.values(leadsByMonth).reduce((sum, leads) => sum + leads, 0)
      });

      return leadsByMonth;
    } catch (error) {
      debugLogger.error('MonthlyLeadsService', 'Failed to fetch Google monthly leads', error);
      return {};
    }
  }

  /**
   * Combine Facebook and Google data by month
   * Generates entries for all months in the date range, even if they have 0 leads
   */
  private static combineMonthlyData(
    facebookData: Record<string, number>,
    googleData: Record<string, number>
  ): MonthlyLeadsData[] {
    // Generate all months in the 5-month range
    // Use the same calculation as calculateDateRange to avoid timezone issues
    const today = new Date();
    const currentMonth = today.getMonth(); // 0-11
    const currentYear = today.getFullYear();
    
    const allMonths: string[] = [];
    
    // Generate 5 months starting from 5 months ago
    for (let i = 0; i < 5; i++) {
      const monthDate = new Date(currentYear, currentMonth - 5 + i, 1);
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth() + 1; // getMonth() returns 0-11, we need 1-12
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      allMonths.push(monthStr);
    }

    const combinedData: MonthlyLeadsData[] = [];

    debugLogger.debug('MonthlyLeadsService', 'Combining monthly data', {
      generatedMonths: allMonths,
      facebookMonths: Object.keys(facebookData),
      googleMonths: Object.keys(googleData)
    });

    // Include all months in the range, even if they have 0 leads
    for (const month of allMonths) {
      const facebookLeads = facebookData[month] || 0;
      const googleLeads = googleData[month] || 0;
      const totalLeads = facebookLeads + googleLeads;

      debugLogger.debug('MonthlyLeadsService', `Month ${month}`, {
        facebookLeads,
        googleLeads,
        totalLeads,
        hasFacebookData: month in facebookData,
        hasGoogleData: month in googleData
      });

      combinedData.push({
        month,
        monthLabel: new Date(month + '-01').toLocaleDateString('en-US', { 
          month: 'short', 
          year: 'numeric' 
        }),
        facebookLeads,
        googleLeads,
        totalLeads
      });
    }

    // Sort by month
    return combinedData.sort((a, b) => a.month.localeCompare(b.month));
  }
}
