import { debugLogger } from '@/lib/debug';
import { GoHighLevelService } from '../goHighLevelService';

export interface GHLContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  source: string;
  tags: string[];
  customFields: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  dateAdded: string;
}

export interface ContactSearchOptions {
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
  query?: Record<string, unknown>;
}

export class GHLContactsModule {
  /**
   * Get contacts for a specific location with optional filtering
   */
  static async getContacts(locationId: string, options?: ContactSearchOptions): Promise<GHLContact[]> {
    debugLogger.info('GHL-Contacts', `Fetching contacts for location: ${locationId}`);
    
    try {
      // Use the existing getAllContacts method from the main service
      const contacts = await GoHighLevelService['getAllContacts'](locationId, {
        startDate: options?.startDate,
        endDate: options?.endDate
      });
      
      debugLogger.info('GHL-Contacts', `Retrieved ${contacts?.length || 0} contacts`);
      return contacts;
    } catch (error) {
      debugLogger.error('GHL-Contacts', 'Failed to fetch contacts', error);
      throw error;
    }
  }

  /**
   * Get contact count for a specific location
   */
  static async getContactCount(locationId: string, dateParams?: { startDate?: string; endDate?: string }): Promise<number> {
    debugLogger.info('GHL-Contacts', `Getting contact count for location: ${locationId}`);
    
    try {
      const count = await GoHighLevelService['getContactCount'](locationId, dateParams);
      debugLogger.info('GHL-Contacts', `Contact count: ${count}`);
      return count;
    } catch (error) {
      debugLogger.error('GHL-Contacts', 'Failed to get contact count', error);
      throw error;
    }
  }

  /**
   * Search contacts with specific criteria
   */
  static async searchContacts(locationId: string, searchCriteria: ContactSearchOptions): Promise<GHLContact[]> {
    debugLogger.info('GHL-Contacts', `Searching contacts for location: ${locationId}`, searchCriteria);
    
    try {
      // Use the existing getAllContacts method with search criteria
      const contacts = await GoHighLevelService['getAllContacts'](locationId, {
        startDate: searchCriteria.startDate,
        endDate: searchCriteria.endDate
      });

      // Apply additional filtering if needed
      let filteredContacts = contacts;
      
      if (searchCriteria.query) {
        filteredContacts = contacts.filter(contact => {
          // Basic filtering logic - can be extended based on query structure
          return Object.entries(searchCriteria.query!).every(([key, value]) => {
            if (key === 'source' && contact.source) {
              return contact.source.toLowerCase().includes(String(value).toLowerCase());
            }
            if (key === 'email' && contact.email) {
              return contact.email.toLowerCase().includes(String(value).toLowerCase());
            }
            if (key === 'phone' && contact.phone) {
              return contact.phone.includes(String(value));
            }
            return true;
          });
        });
      }

      debugLogger.info('GHL-Contacts', `Found ${filteredContacts.length} contacts matching criteria`);
      return filteredContacts;
    } catch (error) {
      debugLogger.error('GHL-Contacts', 'Failed to search contacts', error);
      throw error;
    }
  }

  /**
   * Get recent contacts for a location
   */
  static async getRecentContacts(locationId: string, limit: number = 10): Promise<GHLContact[]> {
    debugLogger.info('GHL-Contacts', `Getting recent ${limit} contacts for location: ${locationId}`);
    
    try {
      const contacts = await this.getContacts(locationId, { limit });
      
      // Sort by dateAdded descending and limit results
      const recentContacts = contacts
        .sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime())
        .slice(0, limit);

      debugLogger.info('GHL-Contacts', `Retrieved ${recentContacts.length} recent contacts`);
      return recentContacts;
    } catch (error) {
      debugLogger.error('GHL-Contacts', 'Failed to get recent contacts', error);
      throw error;
    }
  }

  /**
   * Get contacts by source
   */
  static async getContactsBySource(locationId: string, source: string): Promise<GHLContact[]> {
    debugLogger.info('GHL-Contacts', `Getting contacts by source: ${source} for location: ${locationId}`);
    
    try {
      const contacts = await this.searchContacts(locationId, { query: { source } });
      debugLogger.info('GHL-Contacts', `Found ${contacts.length} contacts from source: ${source}`);
      return contacts;
    } catch (error) {
      debugLogger.error('GHL-Contacts', 'Failed to get contacts by source', error);
      throw error;
    }
  }

  /**
   * Get contacts with guest count information
   */
  static async getContactsWithGuests(locationId: string): Promise<GHLContact[]> {
    debugLogger.info('GHL-Contacts', `Getting contacts with guest info for location: ${locationId}`);
    
    try {
      const contacts = await this.getContacts(locationId);
      
      // Filter contacts that have guest count information
      const contactsWithGuests = contacts.filter(contact => {
        const guestCount = contact.customFields?.guestCount || contact.customFields?.guests;
        return guestCount && Number(guestCount) > 0;
      });

      debugLogger.info('GHL-Contacts', `Found ${contactsWithGuests.length} contacts with guest information`);
      return contactsWithGuests;
    } catch (error) {
      debugLogger.error('GHL-Contacts', 'Failed to get contacts with guests', error);
      throw error;
    }
  }
}
