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

      // GoHighLevel doesn't support date filtering in API, so we fetch all and filter in memory
      const requestBody: any = {
        locationId,
        pageLimit: 100 // API limit is 500, using 100 for pagination
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
      
      // Implement pagination to get actual total count
      // API doesn't return meta.total, so we fetch all pages
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
    return this.getOpportunitiesByStatus(locationId, 'all', _dateRange);
  }

  static async getWonOpportunities(locationId: string, _dateRange?: { startDate?: string; endDate?: string }): Promise<GHLOpportunity[]> {
    debugLogger.info('GoHighLevelApiService', 'Fetching won opportunities', { locationId, dateRange: _dateRange });
    return this.getOpportunitiesByStatus(locationId, 'won', _dateRange);
  }

  private static async getOpportunitiesByStatus(locationId: string, status: 'all' | 'won' | 'open' | 'lost' | 'abandoned', _dateRange?: { startDate?: string; endDate?: string }): Promise<GHLOpportunity[]> {
    await GHLRateLimiter.enforceRateLimit();
    
    const token = await this.getValidToken(locationId);
    if (!token) {
      throw new Error(`No valid OAuth token found for location ${locationId}`);
    }

    try {
      const statusParam = status === 'all' ? '' : `&status=${status}`;
      const url = `${this.API_BASE_URL}/opportunities/search?location_id=${locationId}${statusParam}&limit=100`;
      
      const response = await fetch(url, {
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
          statusFilter: status,
          error: errorMessage
        });
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const opportunities = Array.isArray(data.opportunities) ? data.opportunities : [];
      
      debugLogger.info('GoHighLevelApiService', 'Opportunities fetched successfully', { 
        locationId,
        status,
        count: opportunities.length,
        total: data.meta?.total || opportunities.length
      });
      
      return opportunities;
    } catch (error) {
      debugLogger.error('GoHighLevelApiService', 'Failed to get opportunities', error);
      throw error;
    }
  }


  // Token Management

  static async saveLocationToken(locationId: string, token: string, refreshToken?: string, scopes?: string[], expiresIn?: number): Promise<boolean> {
    try {
      debugLogger.info('GoHighLevelApiService', 'Saving location token', { 
        locationId, 
        scopes,
        hasRefreshToken: !!refreshToken,
        expiresIn 
      });

      // Store complete token data with refresh capability
      // Extract and store the sourceId (full client_id) from the token for refresh
      let oauthClientId: string | undefined;
      try {
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          // Browser-compatible base64 decoding
          const base64Url = tokenParts[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(
            atob(base64)
              .split('')
              .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          );
          const payload = JSON.parse(jsonPayload);
          // Use sourceId (full client_id) if available, otherwise fall back to oauthMeta.client (base)
          oauthClientId = payload.sourceId || payload.oauthMeta?.client;
        }
      } catch {
        // If we can't parse, continue without oauthClientId
      }
      
      const tokenData = {
        accessToken: token,
        refreshToken: refreshToken || null,
        expiresIn: expiresIn || 3600, // Default 1 hour
        expiresAt: new Date(Date.now() + (expiresIn || 3600) * 1000).toISOString(),
        tokenType: 'Bearer',
        scope: scopes?.join(' ') || '',
          oauthClientId // Store the sourceId (full client_id) that issued this token
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
    const tokenData = await this.loadTokenDataFromDb(locationId);
    if (!tokenData) {
      debugLogger.warn('GoHighLevelApiService', 'No token found for location', { locationId });
      return null;
    }

    // Check if token needs refresh (5 minute buffer)
    const buffer = 5 * 60 * 1000; // 5 minutes
    const now = Date.now();
    const expiresAtTime = tokenData.expiresAt ? new Date(tokenData.expiresAt).getTime() : null;
    const needsRefresh = expiresAtTime && expiresAtTime <= (now + buffer);
    
    if (needsRefresh) {
      debugLogger.info('GoHighLevelApiService', 'Token expired, attempting refresh', { 
        locationId,
        expiresAt: tokenData.expiresAt 
      });
      
      if (tokenData.refreshToken) {
        const refreshed = await this.refreshToken(locationId, tokenData.refreshToken, tokenData.oauthClientId);
        if (refreshed) {
          const newTokenData = await this.loadTokenDataFromDb(locationId);
          if (newTokenData?.accessToken) {
            // Check if the new token is also expired
            if (newTokenData.expiresAt && new Date(newTokenData.expiresAt) <= new Date(Date.now() + buffer)) {
              debugLogger.warn('GoHighLevelApiService', 'Refreshed token is also expired', { locationId });
              return null;
            }
            GoHighLevelAuthService.setCredentials(newTokenData.accessToken, locationId);
            
            // Invalidate cache when token is refreshed so frontend fetches fresh data
            try {
              const { AnalyticsOrchestrator } = await import('../data/analyticsOrchestrator');
              AnalyticsOrchestrator.invalidateCache(undefined, `ghl-token-${locationId}`);
              debugLogger.debug('GoHighLevelApiService', 'Cache invalidated after token refresh', { locationId });
            } catch (error) {
              // Cache invalidation is optional, don't fail if it errors
              debugLogger.debug('GoHighLevelApiService', 'Cache invalidation failed (non-critical)', error);
            }
            
            return newTokenData.accessToken;
          }
        } else {
          debugLogger.error('GoHighLevelApiService', 'Token refresh failed', { locationId });
        }
      } else {
        debugLogger.warn('GoHighLevelApiService', 'No refresh token available', { locationId });
      }
      
      return null;
    }

    // Token is still valid - decrypt and cache it
    GoHighLevelAuthService.setCredentials(tokenData.accessToken, locationId);
    return tokenData.accessToken;
  }

  // ✅ New method to load complete token data from database
  private static async loadTokenDataFromDb(locationId: string): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: string; oauthClientId?: string } | null> {
    try {
      const { data, error } = await supabase
        .from('integrations')
        .select('config')
        .eq('platform', 'goHighLevel')
        .eq('account_id', locationId)
        .eq('connected', true)
        .single();
        
      if (error || !data?.config?.tokens?.accessToken) {
        debugLogger.warn('GoHighLevelApiService', 'No token found for location', { locationId });
        return null;
      }
      
      // Use stored oauthClientId if available, otherwise extract from token
      let oauthClientId = data.config.tokens.oauthClientId;
      
      if (!oauthClientId) {
        // Fallback: Extract sourceId (full client_id) from token if not stored
        try {
          const accessToken = data.config.tokens.accessToken;
          const tokenParts = accessToken.split('.');
          if (tokenParts.length === 3) {
            // Browser-compatible base64 decoding
            const base64Url = tokenParts[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
              atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
            );
            const payload = JSON.parse(jsonPayload);
            // Use sourceId (full client_id) if available, otherwise fall back to base
            oauthClientId = payload.sourceId || payload.oauthMeta?.client;
          }
        } catch {
          // If we can't parse the token, continue without oauthClientId
        }
      }
      
      // Return tokens directly (no encryption needed for internal dev app)
      return {
        accessToken: data.config.tokens.accessToken,
        refreshToken: data.config.tokens.refreshToken,
        expiresAt: data.config.tokens.expiresAt,
        oauthClientId
      };
    } catch (error) {
      debugLogger.error('GoHighLevelApiService', 'Error loading token data', error);
      return null;
    }
  }

  // Refresh expired tokens using the sourceId (full client_id) from the token that issued it
  static async refreshToken(locationId: string, refreshToken: string, tokenOAuthClientId?: string): Promise<boolean> {
    try {
      debugLogger.info('GoHighLevelApiService', 'Refreshing token', { locationId, tokenOAuthClientId });

      // Use the sourceId (full client_id) from the token that issued it
      // The refresh token is tied to the specific client_id/client_secret pair that issued it
      if (!tokenOAuthClientId) {
        debugLogger.error('GoHighLevelApiService', 'No client_id found in token - cannot refresh');
        return false;
      }
      
      // Get client_secret from OAuth app credentials (all clients share the same app)
      const { GoHighLevelOAuthConfigService } = await import('./goHighLevelOAuthConfigService');
      const credentials = await GoHighLevelOAuthConfigService.getOAuthCredentials();
      
      let clientSecret: string;
      
      if (credentials) {
        clientSecret = credentials.clientSecret;
        debugLogger.info('GoHighLevelApiService', 'Using sourceId from token with secret from database', {
          locationId,
          sourceId: tokenOAuthClientId.substring(0, 20) + '...'
        });
      } else {
        // Fallback to environment variables
        clientSecret = import.meta.env.VITE_GHL_CLIENT_SECRET;
        
        if (!clientSecret) {
          debugLogger.error('GoHighLevelApiService', 'Missing client_secret (neither database nor env vars)');
          return false;
        }
        
        debugLogger.info('GoHighLevelApiService', 'Using sourceId from token with secret from env vars', {
          locationId,
          sourceId: tokenOAuthClientId.substring(0, 20) + '...'
        });
      }
      
      // Use the sourceId (full client_id) from the token with the shared client_secret
      return this.refreshTokenWithCredentials(locationId, refreshToken, tokenOAuthClientId, clientSecret);
    } catch (error) {
      debugLogger.error('GoHighLevelApiService', 'Error refreshing token', error);
      return false;
    }
  }

  private static async refreshTokenWithCredentials(
    locationId: string, 
    refreshToken: string, 
    clientId: string, 
    clientSecret: string
  ): Promise<boolean> {
    try {

      const response = await fetch('https://services.leadconnectorhq.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
          user_type: 'Location'
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        debugLogger.error('GoHighLevelApiService', 'Token refresh failed', { 
          status: response.status, 
          statusText: response.statusText,
          error: errorText
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
