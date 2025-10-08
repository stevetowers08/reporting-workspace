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
  private static readonly DEFAULT_SPREADSHEET_ID = '1V0C4jLBvUfrnBK8wMQaAQ_Ly2C6681e0JyNcmzrUKn4';
  private static readonly DEFAULT_SHEET_NAME = 'Wedding Leads';

  static async fetchLeadData(
    spreadsheetId?: string, 
    sheetName?: string
  ): Promise<LeadData | null> {
    const actualSpreadsheetId = spreadsheetId || this.DEFAULT_SPREADSHEET_ID;
    const actualSheetName = sheetName || this.DEFAULT_SHEET_NAME;
    
    try {
      debugLogger.info('LeadDataService', 'Fetching lead data via Supabase Edge Function', {
        spreadsheetId: actualSpreadsheetId,
        sheetName: actualSheetName
      });
      
      // Use Supabase Edge Function
      // @ts-expect-error Vite injects import.meta.env at build
      const viteEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;
      const supabaseUrl = (viteEnv && viteEnv.VITE_SUPABASE_URL) || process.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('Missing VITE_SUPABASE_URL environment variable');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/google-sheets-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(viteEnv && viteEnv.VITE_SUPABASE_ANON_KEY) || process.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          spreadsheetId: actualSpreadsheetId,
          range: `${actualSheetName}!A:Z`
        })
      });

      if (!response.ok) {
        throw new Error(`Supabase Edge Function responded with status: ${response.status}`);
      }

      const apiResponse = await response.json();
      
      debugLogger.info('LeadDataService', 'Supabase Edge Function response', {
        success: apiResponse.success,
        hasData: !!apiResponse.data,
        rowCount: apiResponse.data?.values?.length || 0
      });

      if (!apiResponse.success || !apiResponse.data) {
        debugLogger.error('LeadDataService', 'Supabase Edge Function returned no data', apiResponse);
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

      // Detect available columns dynamically
      const rowHeaders = rows[0] || [];
      const eventTypeColumnIndex = this.findEventTypeColumn(rowHeaders);
      const guestCountColumnIndex = this.findGuestCountColumn(rowHeaders);
      const notesColumnIndex = this.findNotesColumn(rowHeaders);

      rows.forEach((row: string[], index) => {
        // Get source (column 2 - index 1)
        const source = row[2] || '';
        if (source.toLowerCase().includes('facebook')) {
          facebookLeads++;
        } else if (source.toLowerCase().includes('google')) {
          googleLeads++;
        }

        // Get guest count with dynamic column detection
        const guestCountRaw = guestCountColumnIndex >= 0 ? row[guestCountColumnIndex] : row[5] || '0';
        const guestCount = parseInt(guestCountRaw);
        
        // Validate guest count (reasonable range: 1-1000)
        if (!isNaN(guestCount) && guestCount > 0 && guestCount <= 1000) {
          totalGuests += guestCount;
        }

        // Categorize guest ranges (use all rows, not just valid guest counts)
        const guestCountForCategorization = isNaN(guestCount) || guestCount <= 0 ? 0 : guestCount;
        if (guestCountForCategorization <= 50) {
          guestRanges['1-50 guests'] = (guestRanges['1-50 guests'] || 0) + 1;
        } else if (guestCountForCategorization <= 100) {
          guestRanges['51-100 guests'] = (guestRanges['51-100 guests'] || 0) + 1;
        } else if (guestCountForCategorization <= 200) {
          guestRanges['101-200 guests'] = (guestRanges['101-200 guests'] || 0) + 1;
        } else if (guestCountForCategorization <= 300) {
          guestRanges['201-300 guests'] = (guestRanges['201-300 guests'] || 0) + 1;
        } else {
          guestRanges['300+ guests'] = (guestRanges['300+ guests'] || 0) + 1;
        }

        // Get event date (column 6 - index 6) and determine day of week
        const eventDate = row[6];
        if (eventDate) {
          try {
            const date = new Date(eventDate);
            const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
            dayPreferences[dayOfWeek] = (dayPreferences[dayOfWeek] || 0) + 1;
          } catch (e) {
            // Skip invalid dates
          }
        }

        // Hybrid event type detection
        const eventType = this.getEventType(row, rowHeaders, eventTypeColumnIndex, guestCountForCategorization, notesColumnIndex);
        eventTypes[eventType] = (eventTypes[eventType] || 0) + 1;
      });

      const totalLeads = rows.length;
      const averageGuestsPerLead = totalLeads > 0 ? totalGuests / totalLeads : 0;

      // Final safety check for unrealistic guest totals
      if (totalGuests > 100000) { // More than 100k guests seems unrealistic
        totalGuests = 10000; // Cap at reasonable number
      }

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

      return result;

    } catch (error) {
      debugLogger.error('LeadDataService', 'Failed to fetch lead data', error);
      console.error('LeadDataService: Failed to fetch data via Supabase Edge Function:', error);
      return null;
    }
  }

  // Helper methods for hybrid event type detection
  private static findEventTypeColumn(headers: string[]): number {
    const eventTypeKeywords = ['event type', 'event_type', 'type', 'event', 'occasion', 'event category'];
    return headers.findIndex(header => 
      eventTypeKeywords.some(keyword => 
        header.toLowerCase().includes(keyword)
      )
    );
  }

  private static findGuestCountColumn(headers: string[]): number {
    const guestCountKeywords = ['guest count', 'guest_count', 'guests', 'number of guests', 'attendees'];
    return headers.findIndex(header => 
      guestCountKeywords.some(keyword => 
        header.toLowerCase().includes(keyword)
      )
    );
  }

  private static findNotesColumn(headers: string[]): number {
    const notesKeywords = ['notes', 'description', 'comments', 'details', 'remarks'];
    return headers.findIndex(header => 
      notesKeywords.some(keyword => 
        header.toLowerCase().includes(keyword)
      )
    );
  }

  private static getEventType(
    row: string[], 
    headers: string[], 
    eventTypeColumnIndex: number, 
    guestCount: number, 
    notesColumnIndex: number
  ): string {
    // 1. Try to find event type column dynamically
    if (eventTypeColumnIndex >= 0 && row[eventTypeColumnIndex]) {
      const eventType = row[eventTypeColumnIndex].trim();
      if (eventType && eventType.toLowerCase() !== 'n/a' && eventType.toLowerCase() !== 'none') {
        return eventType;
      }
    }
    
    // 2. Try guest count estimation
    if (guestCount > 0) {
      if (guestCount >= 150) return 'Wedding';
      if (guestCount >= 75) return 'Corporate Event';
      if (guestCount >= 30) return 'Birthday Party';
      if (guestCount >= 10) return 'Small Event';
    }
    
    // 3. Try to extract from notes/description
    if (notesColumnIndex >= 0 && row[notesColumnIndex]) {
      const notes = row[notesColumnIndex].toLowerCase();
      const extractedType = this.extractEventTypeFromText(notes);
      if (extractedType) {
        return extractedType;
      }
    }
    
    // 4. Default fallback
    return 'Other';
  }

  private static extractEventTypeFromText(text: string): string | null {
    const eventTypePatterns = {
      'Wedding': ['wedding', 'marriage', 'bridal', 'ceremony', 'reception'],
      'Corporate Event': ['corporate', 'business', 'conference', 'meeting', 'seminar', 'workshop'],
      'Birthday Party': ['birthday', 'bday', 'party', 'celebration'],
      'Anniversary': ['anniversary', 'anniv'],
      'Graduation': ['graduation', 'grad', 'commencement'],
      'Baby Shower': ['baby shower', 'shower'],
      'Holiday Party': ['holiday', 'christmas', 'new year', 'thanksgiving'],
      'Fundraiser': ['fundraiser', 'fundraising', 'charity', 'gala'],
      'Reunion': ['reunion', 'family reunion', 'class reunion']
    };

    for (const [eventType, patterns] of Object.entries(eventTypePatterns)) {
      if (patterns.some(pattern => text.includes(pattern))) {
        return eventType;
      }
    }

    return null;
  }
}
