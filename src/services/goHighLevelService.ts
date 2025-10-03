export interface GoHighLevelMetrics {
  totalContacts: number;
  newContacts: number;
  totalOpportunities: number;
  wonOpportunities: number;
  lostOpportunities: number;
  pipelineValue: number;
  avgDealSize: number;
  conversionRate: number;
  responseTime: number;
}

export interface GoHighLevelContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  source: string;
  tags: string[];
  customFields: Record<string, any>;
  dateAdded: string;
  lastActivity: string;
}

export interface GoHighLevelOpportunity {
  id: string;
  name: string;
  contactId: string;
  pipelineId: string;
  stageId: string;
  status: 'open' | 'won' | 'lost' | 'abandoned';
  monetaryValue: number;
  dateCreated: string;
  dateModified: string;
  source: string;
}

export class GoHighLevelService {
  private static apiKey: string | null = null;
  private static locationId: string | null = null;
  private static baseUrl = 'https://services.leadconnectorhq.com';

  static async authenticate(apiKey: string, locationId: string): Promise<boolean> {
    try {
      // Validate API key with GHL API
      const response = await fetch(`${this.baseUrl}/locations/${locationId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        this.apiKey = apiKey;
        this.locationId = locationId;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Go High Level authentication failed:', error);
      return false;
    }
  }

  static async getContacts(limit: number = 100, startAfter?: string): Promise<GoHighLevelContact[]> {
    if (!this.apiKey || !this.locationId) {
      throw new Error('Go High Level not authenticated');
    }

    try {
      const params = new URLSearchParams({
        locationId: this.locationId,
        limit: limit.toString()
      });

      if (startAfter) {
        params.append('startAfter', startAfter);
      }

      const response = await fetch(`${this.baseUrl}/contacts/?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`GHL API error: ${response.statusText}`);
      }

      const data = await response.json();

      return (data.contacts || []).map((contact: any) => ({
        id: contact.id,
        firstName: contact.firstName || '',
        lastName: contact.lastName || '',
        email: contact.email || '',
        phone: contact.phone || '',
        source: contact.source || '',
        tags: contact.tags || [],
        customFields: contact.customFields || {},
        dateAdded: contact.dateAdded,
        lastActivity: contact.lastActivity
      }));
    } catch (error) {
      console.error('Error fetching GHL contacts:', error);
      throw error;
    }
  }

  static async getOpportunities(pipelineId?: string): Promise<GoHighLevelOpportunity[]> {
    if (!this.apiKey || !this.locationId) {
      throw new Error('Go High Level not authenticated');
    }

    try {
      const params = new URLSearchParams({
        locationId: this.locationId,
        limit: '100'
      });

      if (pipelineId) {
        params.append('pipelineId', pipelineId);
      }

      const response = await fetch(`${this.baseUrl}/opportunities/?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`GHL API error: ${response.statusText}`);
      }

      const data = await response.json();

      return (data.opportunities || []).map((opp: any) => ({
        id: opp.id,
        name: opp.name,
        contactId: opp.contactId,
        pipelineId: opp.pipelineId,
        stageId: opp.stageId,
        status: opp.status,
        monetaryValue: parseFloat(opp.monetaryValue || '0'),
        dateCreated: opp.dateCreated,
        dateModified: opp.dateModified,
        source: opp.source || ''
      }));
    } catch (error) {
      console.error('Error fetching GHL opportunities:', error);
      throw error;
    }
  }

  static async getMetrics(dateRange?: { start: string; end: string }): Promise<GoHighLevelMetrics> {
    if (!this.apiKey || !this.locationId) {
      throw new Error('Go High Level not authenticated');
    }

    try {
      // Fetch contacts and opportunities to calculate metrics
      const [contacts, opportunities] = await Promise.all([
        this.getContacts(1000),
        this.getOpportunities()
      ]);

      // Filter by date range if provided
      const filteredContacts = dateRange
        ? contacts.filter(c => c.dateAdded >= dateRange.start && c.dateAdded <= dateRange.end)
        : contacts;

      const filteredOpportunities = dateRange
        ? opportunities.filter(o => o.dateCreated >= dateRange.start && o.dateCreated <= dateRange.end)
        : opportunities;

      const wonOpportunities = filteredOpportunities.filter(o => o.status === 'won');
      const lostOpportunities = filteredOpportunities.filter(o => o.status === 'lost');

      const totalRevenue = wonOpportunities.reduce((sum, opp) => sum + opp.monetaryValue, 0);
      const pipelineValue = filteredOpportunities
        .filter(o => o.status === 'open')
        .reduce((sum, opp) => sum + opp.monetaryValue, 0);

      return {
        totalContacts: contacts.length,
        newContacts: filteredContacts.length,
        totalOpportunities: filteredOpportunities.length,
        wonOpportunities: wonOpportunities.length,
        lostOpportunities: lostOpportunities.length,
        totalRevenue,
        conversionRate: filteredOpportunities.length > 0
          ? (wonOpportunities.length / filteredOpportunities.length) * 100
          : 0,
        averageDealSize: wonOpportunities.length > 0
          ? totalRevenue / wonOpportunities.length
          : 0,
        pipelineValue,
        appointmentsScheduled: 0, // Would need calendar API integration
        appointmentsCompleted: 0, // Would need calendar API integration
        emailsSent: 0, // Would need conversations API integration
        emailsOpened: 0, // Would need conversations API integration
        emailsClicked: 0, // Would need conversations API integration
        smsSent: 0, // Would need conversations API integration
        smsReplies: 0 // Would need conversations API integration
      };
    } catch (error) {
      console.error('Error fetching GHL metrics:', error);
      throw error;
    }
  }

  static async createContact(contactData: Partial<GoHighLevelContact>): Promise<GoHighLevelContact> {
    if (!this.apiKey || !this.locationId) {
      throw new Error('Go High Level not authenticated');
    }

    try {
      const response = await fetch(`${this.baseUrl}/contacts/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...contactData,
          locationId: this.locationId
        })
      });

      if (!response.ok) {
        throw new Error(`GHL API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.contact;
    } catch (error) {
      console.error('Error creating GHL contact:', error);
      throw error;
    }
  }

  static disconnect(): void {
    this.apiKey = null;
    this.locationId = null;
  }
}
