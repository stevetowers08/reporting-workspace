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
  availableColumns: {
    hasTypeColumn: boolean;
    hasGuestCountColumn: boolean;
    hasSourceColumn: boolean;
    hasDateColumn: boolean;
  };
}

export interface LeadDataComparison {
  allTime: LeadData;
  lastMonth: LeadData;
}

export class LeadDataService {
  /**
   * Fetch lead data comparison between all time and last month
   */
  static async fetchLeadDataComparison(
    spreadsheetId: string, 
    sheetName: string
  ): Promise<LeadDataComparison | null> {
    if (!spreadsheetId || !sheetName) {
      debugLogger.warn('LeadDataService', 'Missing required spreadsheetId or sheetName');
      return {
        allTime: this.getEmptyLeadData(),
        lastMonth: this.getEmptyLeadData()
      };
    }

    try {
      debugLogger.info('LeadDataService', 'Fetching lead data comparison', {
        spreadsheetId,
        sheetName
      });

      // Fetch all data first
      const allTimeData = await this.fetchLeadData(spreadsheetId, sheetName);
      
      // Calculate last month date range
      const endDate = new Date();
      const lastMonthStart = new Date(endDate.getFullYear(), endDate.getMonth() - 1, 1);
      const lastMonthEnd = new Date(endDate.getFullYear(), endDate.getMonth(), 0);
      
      const lastMonthData = await this.fetchLeadDataForDateRange(
        spreadsheetId, 
        sheetName, 
        lastMonthStart.toISOString().split('T')[0],
        lastMonthEnd.toISOString().split('T')[0]
      );

      return {
        allTime: allTimeData || this.getEmptyLeadData(),
        lastMonth: lastMonthData || this.getEmptyLeadData()
      };
    } catch (error) {
      debugLogger.error('LeadDataService', 'Failed to fetch lead data comparison', error);
      return {
        allTime: this.getEmptyLeadData(),
        lastMonth: this.getEmptyLeadData()
      };
    }
  }

  /**
   * Fetch lead data for a specific date range
   */
  static async fetchLeadDataForDateRange(
    spreadsheetId: string, 
    sheetName: string,
    startDate: string,
    endDate: string
  ): Promise<LeadData | null> {
    if (!spreadsheetId || !sheetName) {
      debugLogger.warn('LeadDataService', 'Missing required spreadsheetId or sheetName');
      return this.getEmptyLeadData();
    }
    
    try {
      debugLogger.info('LeadDataService', 'Fetching lead data for date range', {
        spreadsheetId,
        sheetName,
        startDate,
        endDate
      });
      
      // Use direct Google Sheets API
      const { GoogleSheetsService } = await import('@/services/api/googleSheetsService');
      
      const data = await GoogleSheetsService.getSpreadsheetData(
        spreadsheetId, 
        `${sheetName}!A1:Z100`
      );

      if (!data || !data.values || data.values.length < 2) {
        debugLogger.warn('LeadDataService', 'No data found in Google Sheets for date range');
        return this.getEmptyLeadData();
      }

      const headers = data.values[0];
      const rows = data.values.slice(1);
      
      // Find date column index
      const dateColumnIndex = this.findDateColumnIndex(headers);
      if (dateColumnIndex === -1) {
        debugLogger.warn('LeadDataService', 'No date column found, returning all data');
        return this.processLeadData(headers, rows);
      }

      // Filter rows by date range
      const filteredRows = rows.filter(row => {
        const dateValue = row[dateColumnIndex];
        if (!dateValue) return false;
        
        try {
          const rowDate = new Date(dateValue);
          const start = new Date(startDate);
          const end = new Date(endDate);
          
          return rowDate >= start && rowDate <= end;
        } catch (error) {
          debugLogger.warn('LeadDataService', 'Invalid date format in row', { dateValue });
          return false;
        }
      });

      debugLogger.info('LeadDataService', 'Filtered rows by date range', {
        totalRows: rows.length,
        filteredRows: filteredRows.length,
        dateRange: { startDate, endDate }
      });

      return this.processLeadData(headers, filteredRows);
    } catch (error) {
      debugLogger.error('LeadDataService', 'Failed to fetch lead data for date range', error);
      return this.getEmptyLeadData();
    }
  }

  static async fetchLeadData(
    spreadsheetId: string, 
    sheetName: string
  ): Promise<LeadData | null> {
    if (!spreadsheetId || !sheetName) {
      debugLogger.warn('LeadDataService', 'Missing required spreadsheetId or sheetName');
      return this.getEmptyLeadData();
    }
    
    try {
      debugLogger.info('LeadDataService', 'Fetching lead data via direct Google Sheets API', {
        spreadsheetId,
        sheetName
      });
      
      // Use direct Google Sheets API (updated architecture)
      const { GoogleSheetsService } = await import('@/services/api/googleSheetsService');
      
      debugLogger.info('LeadDataService', 'Fetching lead data via direct Google Sheets API', {
        spreadsheetId,
        sheetName
      });

      const data = await GoogleSheetsService.getSpreadsheetData(
        spreadsheetId, 
        `${sheetName}!A1:Z100`
      );

      if (!data) {
        debugLogger.warn('LeadDataService', 'No data returned from Google Sheets API - returning empty data');
        return this.getEmptyLeadData();
      }

      debugLogger.info('LeadDataService', 'Direct Google Sheets API response', {
        hasData: !!data,
        hasValues: !!(data && data.values),
        rowCount: data?.values?.length || 0
      });

      if (!data || !data.values || data.values.length < 2) {
        debugLogger.warn('LeadDataService', 'No data found in Google Sheets - returning empty data', {
          data: data,
          valuesLength: data?.values?.length
        });
        return this.getEmptyLeadData();
      }

      const headers = data.values[0];
      const rows = data.values.slice(1);
      
      debugLogger.info('LeadDataService', 'Processing lead data', {
        totalRows: rows.length,
        headers: headers.length
      });

      return this.processLeadData(headers, rows);

    } catch (error) {
      debugLogger.error('LeadDataService', 'Failed to fetch lead data - returning empty data', error);
      return this.getEmptyLeadData();
    }
  }

  /**
   * Process lead data from headers and rows
   */
  private static processLeadData(headers: string[], rows: string[][]): LeadData {
    // Process the actual data
    let facebookLeads = 0;
    let googleLeads = 0;
    let totalGuests = 0;
    const eventTypes: { [key: string]: number } = {};
    const guestRanges: { [key: string]: number } = {};
    const dayPreferences: { [key: string]: number } = {};

    // Map headers to column indices for your specific structure
    const columnMap = this.mapHeadersToColumns(headers);
    
    debugLogger.debug('LeadDataService', 'Column mapping results', {
      headers: headers,
      columnMap: columnMap
    });

    rows.forEach((row: string[], index) => {
      // Get source from mapped column
      const source = columnMap.source >= 0 ? row[columnMap.source] || '' : '';
      if (source.toLowerCase().includes('facebook')) {
        facebookLeads++;
      } else if (source.toLowerCase().includes('google')) {
        googleLeads++;
      }

      // Get guest count from mapped column
      const guestCountRaw = columnMap.guestCount >= 0 ? row[columnMap.guestCount] || '0' : '0';
      const guestCount = parseInt(guestCountRaw);
      
      // Debug logging for first few rows
      if (index < 5) {
        debugLogger.debug('LeadDataService', `Row ${index} guest count processing`, {
          guestCountRaw,
          guestCount,
          guestCountColumnIndex: columnMap.guestCount,
          isValid: !isNaN(guestCount) && guestCount > 0 && guestCount <= 1000
        });
      }
      
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
        } catch (_e) {
          // Skip invalid dates
        }
      }

      // Hybrid event type detection
      const eventType = this.getEventType(row, headers, columnMap.eventType, guestCountForCategorization, this.findNotesColumn(headers));
      eventTypes[eventType] = (eventTypes[eventType] || 0) + 1;
      
      // Debug logging for first few rows
      if (index < 5) {
        debugLogger.debug('LeadDataService', `Row ${index} event type detection`, {
          guestCount: guestCountForCategorization,
          eventTypeColumnIndex: columnMap.eventType,
          notesColumnIndex: this.findNotesColumn(headers),
          eventType,
          row: row.slice(0, 10) // First 10 columns
        });
      }
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

    // Create landing page types - remove hardcoded estimates
    // TODO: Implement real landing page analytics from GHL or Google Analytics
    const landingPageTypesArray: Array<{ type: string; views: number; leads: number; color: string }> = [];

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
      landingPageTypes: landingPageTypesArray,
      availableColumns: {
        hasTypeColumn: columnMap.eventType >= 0,
        hasGuestCountColumn: columnMap.guestCount >= 0,
        hasSourceColumn: columnMap.source >= 0,
        hasDateColumn: this.findDateColumnIndex(headers) >= 0
      }
    };

    debugLogger.info('LeadDataService', 'Successfully processed lead data', {
      totalLeads,
      facebookLeads,
      googleLeads,
      totalGuests,
      averageGuestsPerLead
    });

    return result;
  }

  /**
   * Find date column index in headers
   */
  private static findDateColumnIndex(headers: string[]): number {
    const dateKeywords = ['date', 'event date', 'event_date', 'submission date', 'submission_date', 'created', 'timestamp'];
    return headers.findIndex(header => 
      dateKeywords.some(keyword => 
        header.toLowerCase().includes(keyword)
      )
    );
  }

  // Helper methods for hybrid event type detection
  private static findEventTypeColumn(headers: string[]): number {
    const eventTypeKeywords = ['event type', 'event_type', 'type of event', 'type of', 'occasion', 'event category'];
    return headers.findIndex(header => 
      eventTypeKeywords.some(keyword => 
        header.toLowerCase().includes(keyword)
      )
    );
  }

  private static findGuestCountColumn(headers: string[]): number {
    const guestCountKeywords = ['guest count', 'guest_count', 'guests', 'number of guests', 'attendees', '# guests'];
    return headers.findIndex(header => 
      guestCountKeywords.some(keyword => 
        header.toLowerCase().includes(keyword)
      )
    );
  }

  // Map your specific header structure
  private static mapHeadersToColumns(headers: string[]): {
    dateSubmitted: number;
    contactId: number;
    source: number;
    name: number;
    email: number;
    eventType: number;
    guestCount: number;
    replied: number;
    callBooked: number;
    tourBooked: number;
    dateOfEvent: number;
    amount: number;
    finalPaymentAmount: number;
  } {
    const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
    
    return {
      dateSubmitted: normalizedHeaders.findIndex(h => h.includes('date submitted')),
      contactId: normalizedHeaders.findIndex(h => h.includes('contact id')),
      source: normalizedHeaders.findIndex(h => h.includes('source')),
      name: normalizedHeaders.findIndex(h => h.includes('name')),
      email: normalizedHeaders.findIndex(h => h.includes('email')),
      eventType: normalizedHeaders.findIndex(h => h.includes('type')),
      guestCount: normalizedHeaders.findIndex(h => h.includes('guest')),
      replied: normalizedHeaders.findIndex(h => h.includes('replied')),
      callBooked: normalizedHeaders.findIndex(h => h.includes('call booked')),
      tourBooked: normalizedHeaders.findIndex(h => h.includes('tour booked')),
      dateOfEvent: normalizedHeaders.findIndex(h => h.includes('date of event')),
      amount: normalizedHeaders.findIndex(h => h.includes('amount') && !h.includes('final')),
      finalPaymentAmount: normalizedHeaders.findIndex(h => h.includes('final payment amount'))
    };
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
      if (guestCount >= 150) {return 'Wedding';}
      if (guestCount >= 75) {return 'Corporate Event';}
      if (guestCount >= 30) {return 'Birthday Party';}
      if (guestCount >= 10) {return 'Small Event';}
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

  /**
   * Get empty lead data structure for fallback
   */
  private static getEmptyLeadData(): LeadData {
    return {
      totalLeads: 0,
      facebookLeads: 0,
      googleLeads: 0,
      totalGuests: 0,
      averageGuestsPerLead: 0,
      eventTypes: [],
      leadSources: [],
      guestRanges: [],
      dayPreferences: [],
      landingPageTypes: [],
      availableColumns: {
        hasTypeColumn: false,
        hasGuestCountColumn: false,
        hasSourceColumn: false,
        hasDateColumn: false
      }
    };
  }
}
