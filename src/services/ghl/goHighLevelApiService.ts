// GoHighLevel Core API Service

import { debugLogger } from '@/lib/debug';
import { supabase } from '@/lib/supabase';
import { GoHighLevelAuthService } from './goHighLevelAuthService';
import type {
    GHLCampaign,
    GHLContact,
    GHLFunnel,
    GHLFunnelPage,
    GHLOpportunity
} from './goHighLevelTypes';
import { GHLRateLimiter } from './goHighLevelUtils';

export class GoHighLevelApiService {
  private static readonly API_BASE_URL = 'https://services.leadconnectorhq.com';
  private static readonly API_VERSION = '2021-04-15'; // API 2.0 version header

  // Caching system
  private static cache = new Map<string, { data: any; expiry: number }>();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Cache helper methods
  private static getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && cached.expiry > Date.now()) {
      debugLogger.debug('GoHighLevelApiService', 'Cache hit', { key });
      return cached.data;
    }
    if (cached) {
      this.cache.delete(key);
    }
    return null;
  }

  private static setCachedData<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + this.CACHE_DURATION
    });
    debugLogger.debug('GoHighLevelApiService', 'Cache set', { key, expiry: this.CACHE_DURATION });
  }

  private static clearCache(): void {
    this.cache.clear();
    debugLogger.debug('GoHighLevelApiService', 'Cache cleared');
  }

  // Campaigns
  static async getCampaigns(locationId: string): Promise<GHLCampaign[]> {
    await GHLRateLimiter.enforceRateLimit();
    
    // Use client-specific OAuth token instead of agency token
    const token = await this.getValidToken(locationId);
    if (!token) {
      throw new Error(`No valid OAuth token found for location ${locationId}`);
    }

    // Campaigns endpoint doesn't exist in current API version
    debugLogger.info('GoHighLevelApiService', 'Campaigns endpoint not available in current API version - returning empty array');
    return []; // Return empty array since endpoint doesn't exist
  }

  // Contacts
  static async getContacts(locationId: string, limit = 100, offset = 0): Promise<GHLContact[]> {
    const cacheKey = `ghl_contacts_${locationId}_${limit}_${offset}`;
    
    // Check cache first
    const cachedData = this.getCachedData<GHLContact[]>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    await GHLRateLimiter.enforceRateLimit();
    
    // Use client-specific OAuth token instead of agency token
    const token = await this.getValidToken(locationId);
    if (!token) {
      throw new Error(`No valid OAuth token found for location ${locationId}`);
    }

    debugLogger.info('GoHighLevelApiService', 'Fetching contacts', { locationId, limit, offset });

    // ✅ Use POST /contacts/search endpoint (verified online)
    const response = await fetch(`${this.API_BASE_URL}/contacts/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Version': this.API_VERSION,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        locationId: locationId,
        pageLimit: limit, // ✅ Fixed: use 'pageLimit' instead of 'limit'
        skip: offset, // ✅ Fixed: use 'skip' instead of 'offset'
        query: {}
      })
    });

    if (!response.ok) {
      // ✅ Enhanced error handling with retry
      await GHLRateLimiter.handleRateLimitError(response);
      
      let errorData: any = {};
      try {
        errorData = await response.json();
      } catch {
        // Handle empty response bodies
      }
      
      const errorMessage = errorData.error || errorData.message || 
        `API call failed: ${response.status} ${response.statusText}`;
      
      debugLogger.error('GoHighLevelApiService', 'API call failed', {
        status: response.status,
        locationId,
        error: errorMessage
      });
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    debugLogger.info('GoHighLevelApiService', `Retrieved ${data.contacts?.length || 0} contacts`);
    
    const contacts = data.contacts || [];
    
    // Cache the results
    this.setCachedData(cacheKey, contacts);
    
    return contacts;
  }

  static async getContactCount(locationId: string, dateParams?: { startDate?: string; endDate?: string }): Promise<number> {
    try {
      await GHLRateLimiter.enforceRateLimit();
      
      const token = await this.getValidToken(locationId);
      if (!token) {
        throw new Error(`No valid OAuth token found for location ${locationId}`);
      }

      debugLogger.info('GoHighLevelApiService', 'Getting contact count', { locationId, dateParams });

      // ✅ FIX: Remove unsupported date_added filters
      // GoHighLevel doesn't support 'gte' operator for date_added field
      // Instead, fetch contacts and filter in memory if needed
      
      const requestBody: any = {
        locationId,
        pageLimit: 100 // ✅ FIX: Use 100 instead of 1000 (API limit is 500)
      };

      // Log the request body for debugging
      debugLogger.info('GoHighLevelApiService', 'Contacts search request body', requestBody);

      const response = await fetch(`${this.API_BASE_URL}/contacts/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Version': this.API_VERSION,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        debugLogger.error('GoHighLevelApiService', `Failed to search contacts: ${response.statusText}`, errorText);
        throw new Error(`Failed to search contacts: ${response.statusText}`);
      }

      const data: any = await response.json();
      let allContacts = data.contacts || [];
      
      // ✅ FIX: Implement pagination to get actual total count
      // Since API doesn't return meta.total, we need to fetch all pages
      let hasMorePages = allContacts.length === 100; // If we got exactly 100, there might be more
      let pageCount = 1;
      const maxPages = 20; // Safety limit to prevent infinite loops
      
      while (hasMorePages && pageCount < maxPages) {
        try {
          const nextPageResponse = await fetch(`${this.API_BASE_URL}/contacts/search`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Version': this.API_VERSION,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              locationId,
              pageLimit: 100,
              query: '',
              skip: pageCount * 100 // Skip already fetched contacts
            })
          });
          
          if (nextPageResponse.ok) {
            const nextPageData = await nextPageResponse.json();
            const nextPageContacts = nextPageData.contacts || [];
            
            if (nextPageContacts.length === 0) {
              hasMorePages = false;
            } else {
              allContacts = [...allContacts, ...nextPageContacts];
              hasMorePages = nextPageContacts.length === 100;
              pageCount++;
            }
          } else {
            hasMorePages = false;
          }
        } catch (error) {
          debugLogger.warn('GoHighLevelApiService', 'Error fetching next page of contacts', error);
          hasMorePages = false;
        }
      }
      
      // If no date filtering needed, return total count
      if (!dateParams?.startDate && !dateParams?.endDate) {
        const count = allContacts.length;
        debugLogger.info('GoHighLevelApiService', `Retrieved total contact count: ${count} (fetched ${pageCount} pages)`);
        return count;
      }
      
      // Filter contacts by date in memory (necessary due to API limitations)
      const startDate = dateParams.startDate ? new Date(dateParams.startDate) : null;
      const endDate = dateParams.endDate ? new Date(dateParams.endDate) : null;
      
      const filteredCount = allContacts.filter((contact: any) => {
        const contactDate = new Date(contact.dateAdded || contact.createdAt || 0);
        
        if (startDate && contactDate < startDate) {return false;}
        if (endDate && contactDate > endDate) {return false;}
        
        return true;
      }).length;
      
      debugLogger.info('GoHighLevelApiService', `Retrieved filtered contact count: ${filteredCount}`);
      return filteredCount;

    } catch (error) {
      debugLogger.error('GoHighLevelApiService', 'Failed to get contact count', error);
      throw error;
    }
  }

  // Funnels
  static async getFunnels(locationId: string): Promise<GHLFunnel[]> {
    await GHLRateLimiter.enforceRateLimit();
    
    // Use client-specific OAuth token instead of agency token
    const token = await this.getValidToken(locationId);
    if (!token) {
      throw new Error(`No valid OAuth token found for location ${locationId}`);
    }

    // Use the correct funnels endpoint path as per documentation
    const response = await this.makeApiRequest(`/funnels/funnel/list?locationId=${locationId}`, { 
      token,
      method: 'GET'
    }) as GHLFunnel[];
    return Array.isArray(response) ? response : [];
  }

  static async getFunnelPages(funnelId: string, locationId: string): Promise<GHLFunnelPage[]> {
    await GHLRateLimiter.enforceRateLimit();
    
    // Use client-specific OAuth token instead of agency token
    const token = await this.getValidToken(locationId);
    if (!token) {
      throw new Error(`No valid OAuth token found for location ${locationId}`);
    }

    // Use the correct funnel pages endpoint as per documentation
    const response = await this.makeApiRequest(`/funnels/page`, { 
      token,
      method: 'POST',
      body: JSON.stringify({ 
        funnelId,
        locationId 
      })
    }) as GHLFunnelPage[];
    return Array.isArray(response) ? response : [];
  }

  // Opportunities
  static async getOpportunities(locationId: string, _dateRange?: { startDate?: string; endDate?: string }): Promise<GHLOpportunity[]> {
    await GHLRateLimiter.enforceRateLimit();
    
    // Use client-specific OAuth token instead of agency token
    const token = await this.getValidToken(locationId);
    if (!token) {
      throw new Error(`No valid OAuth token found for location ${locationId}`);
    }

    debugLogger.info('GoHighLevelApiService', 'Fetching opportunities', { locationId });

    try {
      // ✅ FIXED: Use correct API 2.0 endpoint with proper status filter
      const response = await fetch(`${this.API_BASE_URL}/opportunities/search?location_id=${locationId}&status=won&limit=100`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Version': this.API_VERSION,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        await GHLRateLimiter.handleRateLimitError(response);
        
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch {
          // Handle empty response bodies
        }
        
        const errorMessage = errorData.error || errorData.message || 
          `API call failed: ${response.status} ${response.statusText}`;
        
        debugLogger.error('GoHighLevelApiService', 'Opportunities API call failed', {
          status: response.status,
          locationId,
          error: errorMessage
        });
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      debugLogger.info('GoHighLevelApiService', 'Opportunities fetched successfully', { 
        count: data.opportunities?.length || 0,
        locationId 
      });
      
      return Array.isArray(data.opportunities) ? data.opportunities : [];
    } catch (error) {
      debugLogger.error('GoHighLevelApiService', 'Failed to get opportunities', error);
      throw error;
    }
  }


  // Token Management
  static async generateLocationToken(_locationId: string): Promise<string | null> {
    // This method is deprecated - we now use OAuth tokens instead of generating location tokens
    debugLogger.warn('GoHighLevelApiService', 'generateLocationToken is deprecated - use OAuth tokens instead');
    return null;
    
    /* DEPRECATED CODE - keeping for reference
    try {
      await GHLRateLimiter.enforceRateLimit();
      await GoHighLevelAuthService.ensureAgencyToken();
      
      if (!GoHighLevelAuthService.getAgencyToken()) {
        throw new Error('Private integration token not set. Please configure in agency settings.');
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
    */
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
        debugLogger.warn('GoHighLevelApiService', 'Client not found for location:', { locationId, clientError });
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
        debugLogger.warn('GoHighLevelApiService', 'Integration not found for location:', { locationId, integrationError });
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

  static async saveLocationToken(locationId: string, token: string, refreshToken?: string, scopes?: string[], expiresIn?: number): Promise<boolean> {
    try {
      debugLogger.info('GoHighLevelApiService', 'Saving location token', { 
        locationId, 
        scopes,
        hasRefreshToken: !!refreshToken,
        expiresIn 
      });

      // ✅ Store complete token data with refresh capability
      const tokenData = {
        accessToken: token,
        refreshToken: refreshToken || null,
        expiresIn: expiresIn || 3600, // Default 1 hour
        expiresAt: new Date(Date.now() + (expiresIn || 3600) * 1000).toISOString(),
        tokenType: 'Bearer',
        scope: scopes?.join(' ') || ''
      };

      const { error } = await supabase
        .from('integrations')
        .upsert({
          platform: 'goHighLevel',
          account_id: locationId,
          connected: true,
          config: {
            tokens: tokenData,
            accountInfo: {
              id: locationId,
              name: 'GoHighLevel Location'
            },
            locationId,
            lastSync: new Date().toISOString(),
            syncStatus: 'idle',
            connectedAt: new Date().toISOString()
          },
          last_sync: new Date().toISOString(),
          updated_at: new Date().toISOString() // ✅ Manual timestamp update
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
    // ✅ FIX: Always check database first for accurate expiration data
    const tokenData = await this.loadTokenDataFromDb(locationId);
    if (!tokenData) {
      debugLogger.warn('GoHighLevelApiService', 'No token found for location', { locationId });
      return null;
    }

    // ✅ FIX: Check if token needs refresh (5 minute buffer)
    const buffer = 5 * 60 * 1000; // 5 minutes
    if (tokenData.expiresAt && new Date(tokenData.expiresAt) <= new Date(Date.now() + buffer)) {
      debugLogger.info('GoHighLevelApiService', 'Token expired, attempting refresh', { locationId });
      
      if (tokenData.refreshToken) {
        const refreshed = await this.refreshToken(locationId, tokenData.refreshToken);
        if (refreshed) {
          // Load the new token and check its expiration
          const newTokenData = await this.loadTokenDataFromDb(locationId);
          if (newTokenData?.accessToken) {
            // ✅ FIX: Check if the new token is also expired
            if (newTokenData.expiresAt && new Date(newTokenData.expiresAt) <= new Date(Date.now() + buffer)) {
              debugLogger.warn('GoHighLevelApiService', 'Refreshed token is also expired', { locationId });
              return null;
            }
            GoHighLevelAuthService.setCredentials(newTokenData.accessToken, locationId);
            return newTokenData.accessToken;
          }
        }
      }
      
      debugLogger.warn('GoHighLevelApiService', 'Token refresh failed', { locationId });
      return null;
    }

    // Token is still valid - decrypt and cache it
    GoHighLevelAuthService.setCredentials(tokenData.accessToken, locationId);
    return tokenData.accessToken;
  }

  // ✅ New method to load complete token data from database
  private static async loadTokenDataFromDb(locationId: string): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: string } | null> {
    try {
      const { data, error } = await supabase
        .from('integrations')
        .select('config')
        .eq('platform', 'goHighLevel')
        .eq('config->locationId', locationId)
        .eq('connected', true)
        .single();
        
      if (error || !data?.config?.tokens?.accessToken) {
        debugLogger.warn('GoHighLevelApiService', 'No token found for location', { locationId });
        return null;
      }
      
      // ✅ FIX: Return tokens directly (no encryption needed for internal dev app)
      return {
        accessToken: data.config.tokens.accessToken,
        refreshToken: data.config.tokens.refreshToken,
        expiresAt: data.config.tokens.expiresAt
      };
    } catch (error) {
      debugLogger.error('GoHighLevelApiService', 'Error loading token data', error);
      return null;
    }
  }

  // ✅ New method to refresh expired tokens
  static async refreshToken(locationId: string, refreshToken: string): Promise<boolean> {
    try {
      debugLogger.info('GoHighLevelApiService', 'Refreshing token', { locationId });

      const response = await fetch('https://services.leadconnectorhq.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: import.meta.env.VITE_GHL_CLIENT_ID,
          client_secret: import.meta.env.VITE_GHL_CLIENT_SECRET,
          user_type: 'Location'
        })
      });
      
      if (!response.ok) {
        debugLogger.error('GoHighLevelApiService', 'Token refresh failed', { 
          status: response.status, 
          statusText: response.statusText 
        });
        return false;
      }
      
      const newTokenData = await response.json();
      
      // Save the new tokens
      const success = await this.saveLocationToken(
        locationId, 
        newTokenData.access_token, 
        newTokenData.refresh_token,
        newTokenData.scope?.split(' '),
        newTokenData.expires_in
      );
      
      if (success) {
        debugLogger.info('GoHighLevelApiService', 'Token refreshed successfully', { locationId });
      }
      
      return success;
    } catch (error) {
      debugLogger.error('GoHighLevelApiService', 'Error refreshing token', error);
      return false;
    }
  }

  // Core API Request Method
  private static async makeApiRequest<T>(endpoint: string, options: RequestInit & { token?: string; queryParams?: Record<string, any> } = {}): Promise<T> {
    await GHLRateLimiter.enforceRateLimit();
    
    // Require a token to be provided - no more agency token fallback
    const token = options.token;
    if (!token) {
      throw new Error('No valid token provided for API request. Location-specific token required.');
    }

    // Build URL with query parameters
    let url = `${this.API_BASE_URL}${endpoint}`;
    if (options.queryParams) {
      const searchParams = new URLSearchParams();
      Object.entries(options.queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      if (searchParams.toString()) {
        url += `?${searchParams.toString()}`;
      }
    }

    const headers = {
      'Authorization': `Bearer ${token}`,
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
      let errorDetails: any = {};
      
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error) {
          errorMessage = errorData.error;
        }
        if (errorData.message) {
          errorMessage = errorData.message;
        }
        errorDetails = errorData;
      } catch {
        // Use default error message if JSON parsing fails
        errorDetails = { rawError: errorText };
      }
      
      debugLogger.error('GoHighLevelApiService', 'API request failed', {
        url,
        status: response.status,
        statusText: response.statusText,
        errorMessage,
        errorDetails
      });
      
      throw new Error(`${errorMessage} (Status: ${response.status})`);
    }

    return response.json();
  }
}
