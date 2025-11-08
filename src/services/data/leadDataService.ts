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
  static async fetchLeadData(
    spreadsheetId: string, 
    sheetName: string,
    dateRange?: { start: string; end: string }
  ): Promise<LeadData | null> {
    if (!spreadsheetId || !sheetName) {
      debugLogger.warn('LeadDataService', 'Missing required parameters: spreadsheetId and sheetName');
      return null;
    }
    
    try {
      debugLogger.info('LeadDataService', 'Fetching lead data via direct Google Sheets API', {
        spreadsheetId: spreadsheetId,
        sheetName: sheetName
      });
      
      // Use direct Google Sheets API (updated architecture)
      const { GoogleSheetsService } = await import('@/services/api/googleSheetsService');
      
      debugLogger.info('LeadDataService', 'Fetching lead data via direct Google Sheets API', {
        spreadsheetId: spreadsheetId,
        sheetName: sheetName
      });

      const data = await GoogleSheetsService.getSpreadsheetData(
        spreadsheetId, 
        `${sheetName}!A:Z`
      );

      if (!data) {
        debugLogger.warn('LeadDataService', 'No data returned from Google Sheets API');
        return null;
      }

      debugLogger.info('LeadDataService', 'Direct Google Sheets API response', {
        hasData: !!data,
        hasValues: !!(data && data.values),
        rowCount: data?.values?.length || 0
      });

      if (!data || !data.values || data.values.length < 2) {
        debugLogger.warn('LeadDataService', 'No data found in Google Sheets', {
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
      const eventTypeColumnIndex = this.findEventTypeColumn(headers);
      const guestCountColumnIndex = this.findGuestCountColumn(headers);
      const dateColumnIndex = this.findDateColumn(headers);

      debugLogger.info('LeadDataService', 'Detected columns', {
        headers: headers,
        eventTypeColumnIndex,
        eventTypeColumnHeader: eventTypeColumnIndex >= 0 ? headers[eventTypeColumnIndex] : 'not found',
        guestCountColumnIndex,
        dateColumnIndex,
        dateColumnHeader: dateColumnIndex >= 0 ? headers[dateColumnIndex] : 'not found'
      });

      if (eventTypeColumnIndex < 0) {
        debugLogger.warn('LeadDataService', 'No event type column found in sheet. Event types will only be counted if a column with "type" in the header exists.');
      }

      // Filter rows by date range if provided
      let filteredRows = rows;
      if (dateRange && dateColumnIndex >= 0) {
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);
        endDate.setHours(23, 59, 59, 999); // Include the entire end date
        
        // Validate that the date column actually contains dates
        let validDatesFound = 0;
        let invalidDatesFound = 0;
        
        filteredRows = rows.filter((row: string[]) => {
          const eventDateStr = row[dateColumnIndex];
          if (!eventDateStr || eventDateStr.trim() === '') {
            invalidDatesFound++;
            return false;
          }
          
          try {
            const eventDate = new Date(eventDateStr);
            if (isNaN(eventDate.getTime())) {
              invalidDatesFound++;
              return false;
            }
            validDatesFound++;
            return eventDate >= startDate && eventDate <= endDate;
          } catch {
            invalidDatesFound++;
            return false;
          }
        });
        
        debugLogger.info('LeadDataService', 'Filtered rows by date range', {
          totalRows: rows.length,
          filteredRows: filteredRows.length,
          dateRange,
          dateColumnIndex,
          dateColumnHeader: headers[dateColumnIndex],
          validDatesFound,
          invalidDatesFound
        });
      } else if (dateRange) {
        debugLogger.warn('LeadDataService', 'Date range provided but no date column found', {
          dateRange,
          headers: headers,
          dateColumnIndex
        });
      }

      filteredRows.forEach((row: string[], _index) => {
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

        // Get event date using dynamically found date column
        const eventDate = dateColumnIndex >= 0 ? row[dateColumnIndex] : row[6];
        if (eventDate) {
          try {
            const date = new Date(eventDate);
            if (!isNaN(date.getTime())) { // Validate date
              const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
              dayPreferences[dayOfWeek] = (dayPreferences[dayOfWeek] || 0) + 1;
            }
          } catch (_e) {
            // Skip invalid dates
          }
        }

        // Only use event type from actual column in sheet - no estimation or fallbacks
        if (eventTypeColumnIndex >= 0 && row[eventTypeColumnIndex]) {
          const eventType = row[eventTypeColumnIndex].trim();
          if (eventType && eventType.toLowerCase() !== 'n/a' && eventType.toLowerCase() !== 'none' && eventType !== '') {
            eventTypes[eventType] = (eventTypes[eventType] || 0) + 1;
          }
        }
      });

      const totalLeads = filteredRows.length;
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

      // Ensure all guest ranges are included in order, even if they have 0 count
      // This creates a proper histogram-style distribution
      const allPossibleRanges = ['1-50 guests', '51-100 guests', '101-200 guests', '201-300 guests', '300+ guests'];
      const guestRangesArray = allPossibleRanges.map((range) => {
        const count = guestRanges[range] || 0;
        return {
          range,
          count,
          percentage: totalLeads > 0 ? (count / totalLeads) * 100 : 0
        };
      }); // Show all ranges to create proper histogram visualization
      
      debugLogger.info('LeadDataService', 'Guest ranges calculated', {
        totalRanges: guestRangesArray.length,
        ranges: guestRangesArray,
        rawGuestRanges: guestRanges
      });

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

      // Create landing page types (using real data from actual page analytics)
      const landingPageTypesArray = [
        // Only include landing page types if we have actual analytics data
        // This would need to be connected to actual page analytics service
      ];

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
      return null;
    }
  }

  // Helper methods for hybrid event type detection
  private static findEventTypeColumn(headers: string[]): number {
    return headers.findIndex(header => 
      header.toLowerCase().includes('type')
    );
  }

  private static findGuestCountColumn(headers: string[]): number {
    return headers.findIndex(header => 
      header.toLowerCase().includes('guest')
    );
  }

  // NOTE: findNotesColumn method removed - no longer using notes for event type extraction

  private static findDateColumn(headers: string[]): number {
    // First, try to find a column that contains "date" (most common)
    const dateIndex = headers.findIndex(header => 
      header.toLowerCase().includes('date')
    );
    
    if (dateIndex >= 0) {
      return dateIndex;
    }
    
    // Fallback to other date-related keywords
    const dateKeywords = ['event date', 'event_date', 'lead date', 'created', 'submitted', 'event date', 'date created'];
    const fallbackIndex = headers.findIndex(header => 
      dateKeywords.some(keyword => 
        header.toLowerCase().includes(keyword)
      )
    );
    
    // If still not found, default to column 6 (index 6) as legacy fallback
    return fallbackIndex >= 0 ? fallbackIndex : 6;
  }

  // NOTE: getEventType and extractEventTypeFromText methods removed
  // We now only use event types from actual sheet columns - no estimation or fallbacks

}




