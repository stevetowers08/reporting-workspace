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
   * Calculate date range for last 5 months including previous month
   * Uses UTC to ensure consistent behavior across different server timezones
   */
  private static calculateDateRange(): { startDate: string; endDate: string } {
    const today = new Date();
    const utcYear = today.getUTCFullYear();
    const utcMonth = today.getUTCMonth(); // 0-11

    // Start: 5 months ago, first day (using UTC)
    const startDate = new Date(Date.UTC(utcYear, utcMonth - 5, 1));
    const startDateStr = startDate.toISOString().split('T')[0]; // YYYY-MM-DD

    // End: Last day of previous month (to include previous month data)
    // Use UTC to avoid timezone shifts that could exclude the previous month
    const endDate = new Date(Date.UTC(utcYear, utcMonth, 0));
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
    // Generate all months in the 5-month range including previous month
    // Use UTC to avoid timezone issues - ensures consistent month calculation regardless of server timezone
    const today = new Date();
    const utcYear = today.getUTCFullYear();
    const utcMonth = today.getUTCMonth(); // 0-11
    
    const allMonths: string[] = [];
    
    // Generate 5 months starting from 5 months ago, including previous month
    // This ensures we show: [5 months ago, 4 months ago, 3 months ago, 2 months ago, previous month]
    // Use UTC to match how the APIs calculate months
    for (let i = 0; i < 5; i++) {
      // Calculate month using UTC to avoid timezone shifts
      let year = utcYear;
      let month = utcMonth - 5 + i;
      
      // Handle year rollover
      while (month < 0) {
        month += 12;
        year -= 1;
      }
      while (month >= 12) {
        month -= 12;
        year += 1;
      }
      
      const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
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
