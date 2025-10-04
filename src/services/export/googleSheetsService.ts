import { debugLogger } from '@/lib/debug';

export interface EventFormData {
  timestamp: string;
  eventType: string;
  numberOfGuests: number;
  eventDate: string;
  venue: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  budget: number;
  specialRequests?: string;
  leadSource: string; // Facebook, Google, Organic, etc.
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

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

export class GoogleSheetsService {
  private static accessToken: string | null = null;
  private static spreadsheetId: string | null = null;
  private static sheetName: string = 'Form Responses';

  static async authenticate(accessToken: string): Promise<boolean> {
    try {
      // Validate token with Google Sheets API
      const response = await fetch('https://www.googleapis.com/oauth2/v1/tokeninfo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `access_token=${accessToken}`
      });

      if (response.ok) {
        this.accessToken = accessToken;
        return true;
      }
      return false;
    } catch (error) {
      debugLogger.error('GoogleSheetsService', 'Google Sheets authentication failed', error);
      return false;
    }
  }

  static async connectSpreadsheet(spreadsheetId: string, sheetName: string = 'Form Responses'): Promise<boolean> {
    if (!this.accessToken) {
      throw new Error('Google Sheets not authenticated');
    }

    try {
      // Verify spreadsheet exists and is accessible
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        this.spreadsheetId = spreadsheetId;
        this.sheetName = sheetName;
        return true;
      }
      return false;
    } catch (error) {
      debugLogger.error('GoogleSheetsService', 'Error connecting to spreadsheet', error);
      return false;
    }
  }

  static async getFormData(range?: string): Promise<EventFormData[]> {
    if (!this.accessToken || !this.spreadsheetId) {
      throw new Error('Google Sheets not properly configured');
    }

    try {
      const sheetRange = range || `${this.sheetName}!A:Z`;
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${encodeURIComponent(sheetRange)}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Google Sheets API error: ${response.statusText}`);
      }

      const data = await response.json();
      const rows = data.values || [];

      if (rows.length === 0) {
        return [];
      }

      // Assume first row contains headers
      const headers = rows[0];
      const dataRows = rows.slice(1);

      return dataRows.map((row: any[]) => this.parseFormRow(headers, row));
    } catch (error) {
      debugLogger.error('GoogleSheetsService', 'Error fetching Google Sheets data', error);
      throw error;
    }
  }

  private static parseFormRow(headers: string[], row: any[]): EventFormData {
    const data: any = {};

    headers.forEach((header, index) => {
      const value = row[index] || '';
      const normalizedHeader = header.toLowerCase().replace(/\s+/g, '_');

      switch (normalizedHeader) {
        case 'timestamp':
        case 'date':
        case 'submission_date':
          data.timestamp = value;
          break;
        case 'event_type':
        case 'type_of_event':
        case 'event':
          data.eventType = value;
          break;
        case 'number_of_guests':
        case 'guest_count':
        case 'guests':
        case 'attendees':
          data.numberOfGuests = parseInt(value) || 0;
          break;
        case 'event_date':
        case 'date_of_event':
        case 'preferred_date':
          data.eventDate = value;
          break;
        case 'venue':
        case 'location':
        case 'venue_preference':
          data.venue = value;
          break;
        case 'name':
        case 'contact_name':
        case 'full_name':
        case 'client_name':
          data.contactName = value;
          break;
        case 'email':
        case 'email_address':
        case 'contact_email':
          data.contactEmail = value;
          break;
        case 'phone':
        case 'phone_number':
        case 'contact_phone':
        case 'mobile':
          data.contactPhone = value;
          break;
        case 'budget':
        case 'estimated_budget':
        case 'budget_range':
          data.budget = parseFloat(value.replace(/[^0-9.]/g, '')) || 0;
          break;
        case 'special_requests':
        case 'additional_info':
        case 'notes':
        case 'comments':
          data.specialRequests = value;
          break;
        case 'lead_source':
        case 'source':
        case 'how_did_you_hear':
          data.leadSource = value;
          break;
        case 'utm_source':
          data.utm_source = value;
          break;
        case 'utm_medium':
          data.utm_medium = value;
          break;
        case 'utm_campaign':
          data.utm_campaign = value;
          break;
        default:
          // Store any additional fields
          data[normalizedHeader] = value;
      }
    });

    // Set defaults for required fields
    return {
      timestamp: data.timestamp || new Date().toISOString(),
      eventType: data.eventType || 'Unknown',
      numberOfGuests: data.numberOfGuests || 0,
      eventDate: data.eventDate || '',
      venue: data.venue || '',
      contactName: data.contactName || '',
      contactEmail: data.contactEmail || '',
      contactPhone: data.contactPhone || '',
      budget: data.budget || 0,
      specialRequests: data.specialRequests,
      leadSource: data.leadSource || this.determineLeadSource(data),
      utm_source: data.utm_source,
      utm_medium: data.utm_medium,
      utm_campaign: data.utm_campaign
    };
  }

  private static determineLeadSource(data: any): string {
    if (data.utm_source) {
      return data.utm_source;
    }
    if (data.utm_medium) {
      if (data.utm_medium.includes('facebook') || data.utm_medium.includes('social')) {
        return 'Facebook';
      }
      if (data.utm_medium.includes('google') || data.utm_medium.includes('cpc')) {
        return 'Google Ads';
      }
    }
    return 'Organic';
  }

  static async calculateMetrics(dateRange?: { start: string; end: string }): Promise<EventMetrics> {
    const formData = await this.getFormData();

    // Filter by date range if provided
    const filteredData = dateRange
      ? formData.filter(item => {
        const itemDate = new Date(item.timestamp);
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);
        return itemDate >= startDate && itemDate <= endDate;
      })
      : formData;

    const totalSubmissions = filteredData.length;
    const totalGuests = filteredData.reduce((sum, item) => sum + item.numberOfGuests, 0);
    const averageGuests = totalSubmissions > 0 ? totalGuests / totalSubmissions : 0;

    // Event type breakdown
    const eventTypes = new Map<string, { count: number; guests: number; budget: number }>();
    filteredData.forEach(item => {
      const type = item.eventType || 'Unknown';
      const existing = eventTypes.get(type) || { count: 0, guests: 0, budget: 0 };
      eventTypes.set(type, {
        count: existing.count + 1,
        guests: existing.guests + item.numberOfGuests,
        budget: existing.budget + item.budget
      });
    });

    const eventTypeBreakdown = Array.from(eventTypes.entries()).map(([type, data]) => ({
      type,
      count: data.count,
      percentage: (data.count / totalSubmissions) * 100,
      averageGuests: data.guests / data.count,
      averageBudget: data.budget / data.count
    }));

    // Lead source breakdown
    const leadSources = new Map<string, number>();
    filteredData.forEach(item => {
      const source = item.leadSource || 'Unknown';
      leadSources.set(source, (leadSources.get(source) || 0) + 1);
    });

    const leadSourceBreakdown = Array.from(leadSources.entries()).map(([source, count]) => ({
      source,
      count,
      percentage: (count / totalSubmissions) * 100,
      conversionRate: 0 // Would need conversion data from GHL
    }));

    // Budget ranges
    const budgetRanges = [
      { range: '$0 - $5,000', min: 0, max: 5000 },
      { range: '$5,001 - $15,000', min: 5001, max: 15000 },
      { range: '$15,001 - $30,000', min: 15001, max: 30000 },
      { range: '$30,001 - $50,000', min: 30001, max: 50000 },
      { range: '$50,000+', min: 50001, max: Infinity }
    ];

    const budgetBreakdown = budgetRanges.map(range => {
      const count = filteredData.filter(item =>
        item.budget >= range.min && item.budget <= range.max
      ).length;
      return {
        range: range.range,
        count,
        percentage: (count / totalSubmissions) * 100
      };
    });

    // Monthly trends (last 12 months)
    const monthlyData = new Map<string, { submissions: number; guests: number; revenue: number }>();
    filteredData.forEach(item => {
      const date = new Date(item.timestamp);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const existing = monthlyData.get(monthKey) || { submissions: 0, guests: 0, revenue: 0 };
      monthlyData.set(monthKey, {
        submissions: existing.submissions + 1,
        guests: existing.guests + item.numberOfGuests,
        revenue: existing.revenue + item.budget
      });
    });

    const monthlyTrends = Array.from(monthlyData.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        submissions: data.submissions,
        averageGuests: data.guests / data.submissions,
        totalRevenue: data.revenue
      }));

    return {
      totalSubmissions,
      averageGuests,
      totalGuests,
      eventTypeBreakdown,
      monthlyTrends,
      leadSourceBreakdown,
      budgetRanges: budgetBreakdown
    };
  }

  static async syncWithGHL(_ghlApiKey: string, _ghlLocationId: string): Promise<void> {
    // Sync form data with Go High Level contacts
    const formData = await this.getFormData();

    // This would integrate with the GoHighLevelService to create/update contacts
    // Implementation would depend on specific GHL setup
    debugLogger.info('GoogleSheetsService', `Syncing ${formData.length} form submissions with GHL`);
  }

  static disconnect(): void {
    this.accessToken = null;
    this.spreadsheetId = null;
  }
}
