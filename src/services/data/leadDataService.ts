import { debugLogger } from '@/lib/debug';

export interface LeadData {
  totalLeads: number;
  facebookLeads: number;
  googleLeads: number;
  totalGuests: number;
  averageGuestsPerLead: number;
  eventTypes: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  leadSources: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  guestRanges: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
  dayPreferences: Array<{
    day: string;
    count: number;
    percentage: number;
  }>;
  landingPageTypes: Array<{
    type: string;
    views: number;
    leads: number;
    color: string;
  }>;
}

export class LeadDataService {
  private static readonly SPREADSHEET_ID = '1V0C4jLBvUfrnBK8wMQaAQ_Ly2C6681e0JyNcmzrUKn4';
  private static readonly SHEET_NAME = 'Wedding Leads';

  static async fetchLeadData(): Promise<LeadData | null> {
    try {
      debugLogger.info('LeadDataService', 'Fetching lead data via local proxy server', {
        spreadsheetId: this.SPREADSHEET_ID,
        sheetName: this.SHEET_NAME
      });
      
      // Use local proxy server to avoid CORS issues
      const response = await fetch(`http://localhost:3001/google-sheets-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          spreadsheetId: this.SPREADSHEET_ID,
          range: `${this.SHEET_NAME}!A:Z`
        })
      });

      if (!response.ok) {
        throw new Error(`Server API responded with status: ${response.status}`);
      }

      const apiResponse = await response.json();
      
      debugLogger.info('LeadDataService', 'Server API response', {
        success: apiResponse.success,
        hasData: !!apiResponse.data,
        rowCount: apiResponse.data?.values?.length || 0
      });

      if (!apiResponse.success || !apiResponse.data) {
        debugLogger.error('LeadDataService', 'Server API returned no data', apiResponse);
        return null;
      }

      const data = apiResponse.data;

      debugLogger.info('LeadDataService', 'Raw Google Sheets response', {
        hasData: !!data,
        hasValues: !!(data && data.values),
        rowCount: data?.values?.length || 0
      });

      if (!data || !data.values || data.values.length < 2) {
        debugLogger.error('LeadDataService', 'No data found in Google Sheets', {
          data: data,
          valuesLength: data?.values?.length
        });
        return null;
      }

      const headers = data.values[0];
      const rows = data.values.slice(1);
      
      debugLogger.info('LeadDataService', 'Processing lead data', {
        totalRows: rows.length,
        headers: headers.length
      });

      // Process the actual data
      let facebookLeads = 0;
      let googleLeads = 0;
      let totalGuests = 0;
      const eventTypes: { [key: string]: number } = {};
      const guestRanges: { [key: string]: number } = {};
      const dayPreferences: { [key: string]: number } = {};

      rows.forEach((row: string[]) => {
        // Get source (column 2 - index 1)
        const source = row[2] || '';
        if (source.toLowerCase().includes('facebook')) {
          facebookLeads++;
        } else if (source.toLowerCase().includes('google')) {
          googleLeads++;
        }

        // Get guest count (column 5 - index 5)
        const guestCount = parseInt(row[5]) || 0;
        totalGuests += guestCount;

        // Categorize guest ranges
        if (guestCount <= 50) {
          guestRanges['1-50 guests'] = (guestRanges['1-50 guests'] || 0) + 1;
        } else if (guestCount <= 100) {
          guestRanges['51-100 guests'] = (guestRanges['51-100 guests'] || 0) + 1;
        } else if (guestCount <= 200) {
          guestRanges['101-200 guests'] = (guestRanges['101-200 guests'] || 0) + 1;
        } else if (guestCount <= 300) {
          guestRanges['201-300 guests'] = (guestRanges['201-300 guests'] || 0) + 1;
        } else {
          guestRanges['300+ guests'] = (guestRanges['300+ guests'] || 0) + 1;
        }

        // Get event date (column 6 - index 5) and determine day of week
        const eventDate = row[5];
        if (eventDate) {
          try {
            const date = new Date(eventDate);
            const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
            dayPreferences[dayOfWeek] = (dayPreferences[dayOfWeek] || 0) + 1;
          } catch (e) {
            // Skip invalid dates
          }
        }

        // Estimate event type based on guest count (this is a heuristic)
        if (guestCount >= 100) {
          eventTypes['Wedding'] = (eventTypes['Wedding'] || 0) + 1;
        } else if (guestCount >= 50) {
          eventTypes['Corporate Event'] = (eventTypes['Corporate Event'] || 0) + 1;
        } else if (guestCount >= 25) {
          eventTypes['Birthday Party'] = (eventTypes['Birthday Party'] || 0) + 1;
        } else {
          eventTypes['Other'] = (eventTypes['Other'] || 0) + 1;
        }
      });

      const totalLeads = rows.length;
      const averageGuestsPerLead = totalLeads > 0 ? totalGuests / totalLeads : 0;

      // Convert to arrays with percentages
      const eventTypesArray = Object.entries(eventTypes).map(([type, count]) => ({
        type,
        count,
        percentage: totalLeads > 0 ? (count / totalLeads) * 100 : 0
      }));

      const guestRangesArray = Object.entries(guestRanges).map(([range, count]) => ({
        range,
        count,
        percentage: totalLeads > 0 ? (count / totalLeads) * 100 : 0
      }));

      const dayPreferencesArray = Object.entries(dayPreferences).map(([day, count]) => ({
        day,
        count,
        percentage: totalLeads > 0 ? (count / totalLeads) * 100 : 0
      }));

      // Create lead sources array
      const leadSourcesArray = [
        { type: 'Facebook Ads', count: facebookLeads, percentage: totalLeads > 0 ? (facebookLeads / totalLeads) * 100 : 0 },
        { type: 'Google Ads', count: googleLeads, percentage: totalLeads > 0 ? (googleLeads / totalLeads) * 100 : 0 }
      ].filter(source => source.count > 0);

      // Create landing page types (using estimated data for now)
      const landingPageTypesArray = [
        { type: 'Wedding Venue Tour', views: Math.floor(totalLeads * 2), leads: Math.floor(totalLeads * 0.5), color: 'bg-pink-500' },
        { type: 'Event Planning Guide', views: Math.floor(totalLeads * 1.5), leads: Math.floor(totalLeads * 0.3), color: 'bg-blue-500' },
        { type: 'Pricing Calculator', views: Math.floor(totalLeads * 1), leads: Math.floor(totalLeads * 0.15), color: 'bg-green-500' },
        { type: 'Virtual Tour', views: Math.floor(totalLeads * 0.8), leads: Math.floor(totalLeads * 0.05), color: 'bg-purple-500' }
      ].filter(page => page.views > 0);

      const result: LeadData = {
        totalLeads,
        facebookLeads,
        googleLeads,
        totalGuests,
        averageGuestsPerLead,
        eventTypes: eventTypesArray,
        leadSources: leadSourcesArray,
        guestRanges: guestRangesArray,
        dayPreferences: dayPreferencesArray,
        landingPageTypes: landingPageTypesArray
      };

      debugLogger.info('LeadDataService', 'Successfully processed lead data', {
        totalLeads,
        facebookLeads,
        googleLeads,
        totalGuests,
        averageGuestsPerLead
      });

      console.log('LeadDataService: Successfully fetched real data via local proxy server!', {
        totalLeads,
        facebookLeads,
        googleLeads,
        totalGuests,
        averageGuestsPerLead,
        eventTypesCount: eventTypesArray.length,
        guestRangesCount: guestRangesArray.length,
        dayPreferencesCount: dayPreferencesArray.length
      });

      return result;

    } catch (error) {
      debugLogger.error('LeadDataService', 'Failed to fetch lead data', error);
      console.error('LeadDataService: Failed to fetch data via local proxy server:', error);
      return null;
    }
  }
}
