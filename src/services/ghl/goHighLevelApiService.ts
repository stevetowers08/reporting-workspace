// GoHighLevel Core API Service

import { debugLogger } from '@/lib/debug';
import { supabase } from '@/lib/supabase';
import { GHLRateLimiter, GHLQueryBuilder, GHLValidator } from './goHighLevelUtils';
import { GoHighLevelAuthService } from './goHighLevelAuthService';
import type { 
  GHLContact, 
  GHLCampaign, 
  GHLAccount,
  GHLFunnel,
  GHLFunnelPage,
  GHLOpportunity,
  GHLCalendarEvent
} from './goHighLevelTypes';

export class GoHighLevelApiService {
  private static readonly API_BASE_URL = 'https://services.leadconnectorhq.com';
  private static readonly API_VERSION = '2021-07-28';

  // Campaigns
  static async getCampaigns(locationId: string): Promise<GHLCampaign[]> {
    await GHLRateLimiter.enforceRateLimit();
    await GoHighLevelAuthService.ensureAgencyToken();
    
    if (!GoHighLevelAuthService.getAgencyToken()) {
      throw new Error('Private integration token not set');
    }

    const response = await this.makeApiRequest(`/campaigns/?locationId=${locationId}`) as { campaigns: GHLCampaign[] };
    return response.campaigns || [];
  }

  // Contacts
  static async getContacts(locationId: string, limit = 100, offset = 0): Promise<GHLContact[]> {
    await GHLRateLimiter.enforceRateLimit();
    await GoHighLevelAuthService.ensureAgencyToken();
    
    if (!GoHighLevelAuthService.getAgencyToken()) {
      throw new Error('Private integration token not set');
    }

    debugLogger.info('GoHighLevelApiService', 'Fetching contacts', { locationId, limit, offset });

    // Get valid location token (with auto-refresh)
    const locationToken = await this.getValidToken(locationId);
    if (!locationToken) {
      throw new Error(`No location token found for location ${locationId}. Please connect the location via OAuth flow.`);
    }

    // Fetch contacts using the location token
    const query = GHLQueryBuilder.buildPaginationQuery(limit, offset);
    const response = await fetch(`${this.API_BASE_URL}/contacts${query}`, {
      headers: {
        'Authorization': `Bearer ${locationToken}`,
        'Version': this.API_VERSION,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch contacts: ${response.statusText}`);
    }

    const data = await response.json();
    debugLogger.info('GoHighLevelApiService', `Retrieved ${data.contacts?.length || 0} contacts`);
    
    return data.contacts || [];
  }

  static async getContactCount(locationId: string, dateParams?: { startDate?: string; endDate?: string }): Promise<number> {
    try {
      await GHLRateLimiter.enforceRateLimit();
      await GoHighLevelAuthService.ensureAgencyToken();
      
      if (!GoHighLevelAuthService.getAgencyToken()) {
        throw new Error('Private integration token not set');
      }

      debugLogger.info('GoHighLevelApiService', 'Getting contact count', { locationId, dateParams });

      // Get valid location token
      const locationToken = await this.getValidToken(locationId);
      if (!locationToken) {
        throw new Error(`No location token found for location ${locationId}. Please configure location-level token.`);
      }
      
      // Use the recommended Search Contacts endpoint with date filtering
      const query = GHLQueryBuilder.buildContactQuery(dateParams);
      const response = await fetch(`${this.API_BASE_URL}/contacts/search${query}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${locationToken}`,
          'Version': this.API_VERSION,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          locationId,
          query: {},
          ...(dateParams?.startDate && { startDate: dateParams.startDate }),
          ...(dateParams?.endDate && { endDate: dateParams.endDate })
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        debugLogger.error('GoHighLevelApiService', `Failed to search contacts: ${response.statusText}`, errorText);
        throw new Error(`Failed to search contacts: ${response.statusText}`);
      }

      const data: any = await response.json();
      const count = data.contacts?.length || 0;
      
      debugLogger.info('GoHighLevelApiService', `Retrieved contact count: ${count}`);
      return count;

    } catch (error) {
      debugLogger.error('GoHighLevelApiService', 'Failed to get contact count', error);
      throw error;
    }
  }

  // Funnels
  static async getFunnels(locationId: string): Promise<GHLFunnel[]> {
    await GHLRateLimiter.enforceRateLimit();
    await GoHighLevelAuthService.ensureAgencyToken();
    
    if (!GoHighLevelAuthService.getAgencyToken()) {
      throw new Error('Private integration token not set');
    }

    const response = await this.makeApiRequest(`/funnels?locationId=${locationId}`) as GHLFunnel[];
    return Array.isArray(response) ? response : [];
  }

  static async getFunnelPages(funnelId: string, locationId: string): Promise<GHLFunnelPage[]> {
    await GHLRateLimiter.enforceRateLimit();
    await GoHighLevelAuthService.ensureAgencyToken();
    
    if (!GoHighLevelAuthService.getAgencyToken()) {
      throw new Error('Private integration token not set');
    }

    const response = await this.makeApiRequest(`/funnels/${funnelId}/pages?locationId=${locationId}`) as GHLFunnelPage[];
    return Array.isArray(response) ? response : [];
  }

  // Opportunities
  static async getOpportunities(locationId: string): Promise<GHLOpportunity[]> {
    await GHLRateLimiter.enforceRateLimit();
    await GoHighLevelAuthService.ensureAgencyToken();
    
    if (!GoHighLevelAuthService.getAgencyToken()) {
      throw new Error('Private integration token not set');
    }

    const response = await this.makeApiRequest(`/opportunities?locationId=${locationId}`) as GHLOpportunity[];
    return Array.isArray(response) ? response : [];
  }

  // Calendar Events
  static async getCalendarEvents(locationId: string): Promise<GHLCalendarEvent[]> {
    await GHLRateLimiter.enforceRateLimit();
    await GoHighLevelAuthService.ensureAgencyToken();
    
    if (!GoHighLevelAuthService.getAgencyToken()) {
      throw new Error('Private integration token not set');
    }

    const response = await this.makeApiRequest(`/calendars/events?locationId=${locationId}`) as GHLCalendarEvent[];
    return Array.isArray(response) ? response : [];
  }

  // Token Management
  static async generateLocationToken(locationId: string): Promise<string | null> {
    try {
      await GHLRateLimiter.enforceRateLimit();
      await GoHighLevelAuthService.ensureAgencyToken();
      
      if (!GoHighLevelAuthService.getAgencyToken()) {
        throw new Error('Private integration token not set. Please configure in admin settings.');
      }

      debugLogger.info('GoHighLevelApiService', 'Generating location token', { locationId });

      const response = await this.makeApiRequest('/oauth/locationToken', {
        method: 'POST',
        body: JSON.stringify({ locationId })
      }) as { accessToken: string };

      if (response.accessToken) {
        GoHighLevelAuthService.setCredentials(response.accessToken, locationId);
        debugLogger.info('GoHighLevelApiService', 'Location token generated successfully', { locationId });
        return response.accessToken;
      }

      return null;
    } catch (error) {
      debugLogger.error('GoHighLevelApiService', 'Failed to generate location token', error);
      return null;
    }
  }

  private static async loadLocationToken(locationId: string): Promise<string | null> {
    try {
      debugLogger.info('GoHighLevelApiService', 'Loading location token for:', locationId);
      
      // First, find the client that has this location ID
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id, name, accounts')
        .eq('accounts->goHighLevel->locationId', locationId)
        .single();

      if (clientError || !clientData) {
        debugLogger.warn('GoHighLevelApiService', 'Client not found for location:', locationId, clientError);
        return null;
      }

      // Then find the integration for this location
      const { data: integrationData, error: integrationError } = await supabase
        .from('integrations')
        .select('config')
        .eq('platform', 'goHighLevel')
        .eq('account_id', locationId)
        .single();

      if (integrationError || !integrationData) {
        debugLogger.warn('GoHighLevelApiService', 'Integration not found for location:', locationId, integrationError);
        return null;
      }

      const token = integrationData.config?.tokens?.accessToken;
      if (token) {
        GoHighLevelAuthService.setCredentials(token, locationId);
        debugLogger.info('GoHighLevelApiService', 'Location token loaded from database', { locationId });
        return token;
      }

      return null;
    } catch (error) {
      debugLogger.error('GoHighLevelApiService', 'Error loading location token', error);
      return null;
    }
  }

  static async saveLocationToken(locationId: string, token: string, scopes: string[]): Promise<boolean> {
    try {
      debugLogger.info('GoHighLevelApiService', 'Saving location token', { locationId, scopes });

      const { error } = await supabase
        .from('integrations')
        .upsert({
          platform: 'goHighLevel',
          account_id: locationId,
          connected: true,
          config: {
            tokens: {
              accessToken: token,
              tokenType: 'Bearer',
              scope: scopes.join(' ')
            },
            accountInfo: {
              id: locationId,
              name: 'GoHighLevel Location'
            },
            locationId,
            lastSync: new Date().toISOString(),
            syncStatus: 'idle',
            connectedAt: new Date().toISOString()
          },
          last_sync: new Date().toISOString()
        }, {
          onConflict: 'platform,account_id'
        });

      if (error) {
        debugLogger.error('GoHighLevelApiService', 'Error saving location token', error);
        return false;
      }

      debugLogger.info('GoHighLevelApiService', 'Location token saved successfully', { locationId });
      return true;
    } catch (error) {
      debugLogger.error('GoHighLevelApiService', 'Error saving location token', error);
      return false;
    }
  }

  static async getValidToken(locationId: string): Promise<string | null> {
    // Check if we already have a token in memory
    let token = GoHighLevelAuthService.getLocationToken(locationId);
    if (token) {
      return token;
    }

    // Try to load from database
    token = await this.loadLocationToken(locationId);
    if (token) {
      return token;
    }

    // Try to generate a new token
    token = await this.generateLocationToken(locationId);
    return token;
  }

  // Core API Request Method
  private static async makeApiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    await GHLRateLimiter.enforceRateLimit();
    
    const agencyToken = await GoHighLevelAuthService.getAgencyToken();
    if (!agencyToken) {
      throw new Error('Private integration token not set');
    }

    const url = `${this.API_BASE_URL}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${agencyToken}`,
      'Version': this.API_VERSION,
      'Content-Type': 'application/json',
      ...options.headers
    };

    debugLogger.debug('GoHighLevelApiService', 'Making API request', { url, method: options.method || 'GET' });

    const response = await fetch(url, {
      ...options,
      headers
    });

    // Handle rate limiting
    if (response.status === 429) {
      await GHLRateLimiter.handleRateLimitError(response);
      // Retry the request
      return this.makeApiRequest<T>(endpoint, options);
    }

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `API request failed: ${response.statusText}`;
      
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch {
        // Use default error message if JSON parsing fails
      }
      
      throw new Error(errorMessage);
    }

    return response.json();
  }
}
