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

  // Token data cache and deduplication
  private static tokenDataCache = new Map<string, { 
    data: { accessToken: string; refreshToken?: string; expiresAt?: string; oauthClientId?: string } | null; 
    timestamp: number;
  }>();
  private static readonly TOKEN_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes - aligned with TokenManager
  private static pendingTokenDataRequests = new Map<string, Promise<{ accessToken: string; refreshToken?: string; expiresAt?: string; oauthClientId?: string } | null>>();

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

  // Clear token data cache for a specific location (called after token refresh)
  static clearTokenDataCache(locationId: string): void {
    const cacheKey = `token-data-${locationId}`;
    this.tokenDataCache.delete(cacheKey);
    debugLogger.debug('GoHighLevelApiService', `Cleared token data cache for: ${locationId}`);
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
      debugLogger.warn('GoHighLevelApiService', 'No valid token for location - returning empty array', { locationId });
      return []; // Return empty array instead of throwing
    }

    try {
      // Use status parameter as-is (API accepts lowercase 'won')
      const statusParam = status === 'all' ? '' : `&status=${status}`;
      
      const url = `${this.API_BASE_URL}/opportunities/search?location_id=${locationId}${statusParam}&limit=100`;
      
      debugLogger.debug('GoHighLevelApiService', 'Fetching opportunities', { 
        locationId, 
        status, 
        statusParam,
        url: url.replace(token, '***')
      });
      
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
        
        const errorMessage = errorData.error || errorData.message || errorData.statusCode || 
          `API call failed: ${response.status} ${response.statusText}`;
        
        // Handle 401 specifically - token is invalid/expired
        if (response.status === 401) {
          debugLogger.error('GoHighLevelApiService', 'Token invalid or expired - refresh needed', {
            status: response.status,
            locationId,
            statusFilter: status,
            error: errorMessage
          });
          
          // Clear token cache to force refresh on next call
          this.clearTokenDataCache(locationId);
          
          // Return empty array instead of throwing - allows UI to show 0 gracefully
          return [];
        }
        
        debugLogger.error('GoHighLevelApiService', 'Opportunities API call failed', {
          status: response.status,
          locationId,
          statusFilter: status,
          error: errorMessage
        });
        
        // For other errors, return empty array to prevent UI errors
        return [];
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
      debugLogger.error('GoHighLevelApiService', 'Failed to get opportunities', { locationId, status, error });
      // Return empty array instead of throwing - allows UI to show 0 gracefully
      return [];
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

  /**
   * Decode JWT token to get expiration time
   */
  private static getTokenExpiration(token: string): number | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const payload = JSON.parse(jsonPayload);
      return payload.exp ? payload.exp * 1000 : null; // Convert to milliseconds
    } catch {
      return null;
    }
  }

  static async getValidToken(locationId: string): Promise<string | null> {
    try {
      const tokenData = await this.loadTokenDataFromDb(locationId);
      if (!tokenData || !tokenData.accessToken) {
        debugLogger.warn('GoHighLevelApiService', 'No token found for location', { locationId });
        return null;
      }

      // Check if token needs refresh (5 minute buffer)
      const buffer = 5 * 60 * 1000; // 5 minutes
      const now = Date.now();
      
      // Check expiration from database first, then decode JWT if needed
      let expiresAtTime = tokenData.expiresAt ? new Date(tokenData.expiresAt).getTime() : null;
      
      // If no expiresAt in database, decode JWT to get expiration
      if (!expiresAtTime) {
        expiresAtTime = this.getTokenExpiration(tokenData.accessToken);
        debugLogger.debug('GoHighLevelApiService', 'Decoded JWT expiration', { 
          locationId, 
          expiresAt: expiresAtTime ? new Date(expiresAtTime).toISOString() : 'unknown' 
        });
      }
      
      const needsRefresh = expiresAtTime && expiresAtTime <= (now + buffer);
      
      if (needsRefresh) {
        debugLogger.info('GoHighLevelApiService', 'Token expired or expiring soon, attempting refresh', { 
          locationId,
          expiresAt: tokenData.expiresAt,
          timeUntilExpiry: expiresAtTime ? expiresAtTime - now : 'unknown'
        });
        
        if (tokenData.refreshToken) {
          // Clear cache before refresh to ensure we get fresh token after refresh
          this.clearTokenDataCache(locationId);
          
          const refreshed = await this.refreshToken(locationId, tokenData.refreshToken, tokenData.oauthClientId);
          if (refreshed) {
            // Wait a brief moment for database to update
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Load fresh token data after refresh
            const newTokenData = await this.loadTokenDataFromDb(locationId);
            if (newTokenData?.accessToken) {
              // Check if the new token is also expired
              const newExpiresAtTime = newTokenData.expiresAt ? new Date(newTokenData.expiresAt).getTime() : null;
              if (newExpiresAtTime && newExpiresAtTime <= (now + buffer)) {
                debugLogger.warn('GoHighLevelApiService', 'Refreshed token is also expired', { 
                  locationId,
                  expiresAt: newTokenData.expiresAt 
                });
                return null;
              }
              
              GoHighLevelAuthService.setCredentials(newTokenData.accessToken, locationId);
              
              // Invalidate caches when token is refreshed so frontend fetches fresh data
              try {
                const { AnalyticsOrchestrator } = await import('../data/analyticsOrchestrator');
                AnalyticsOrchestrator.invalidateCache(undefined, `ghl-token-${locationId}`);
                debugLogger.debug('GoHighLevelApiService', 'Cache invalidated after token refresh', { locationId });
              } catch (error) {
                // Cache invalidation is optional, don't fail if it errors
                debugLogger.debug('GoHighLevelApiService', 'Cache invalidation failed (non-critical)', error);
              }
              
              debugLogger.info('GoHighLevelApiService', 'Token refreshed successfully', { locationId });
              return newTokenData.accessToken;
            } else {
              debugLogger.error('GoHighLevelApiService', 'Token refresh succeeded but no new token found', { locationId });
            }
          } else {
            debugLogger.error('GoHighLevelApiService', 'Token refresh failed', { locationId });
          }
        } else {
          debugLogger.warn('GoHighLevelApiService', 'No refresh token available', { locationId });
        }
        
        // If refresh failed, try to use existing token anyway (might still work)
        if (tokenData.accessToken) {
          debugLogger.warn('GoHighLevelApiService', 'Using potentially expired token due to refresh failure', { locationId });
          GoHighLevelAuthService.setCredentials(tokenData.accessToken, locationId);
          return tokenData.accessToken;
        }
        
        return null;
      }

      // Token is still valid - use it
      GoHighLevelAuthService.setCredentials(tokenData.accessToken, locationId);
      return tokenData.accessToken;
    } catch (error) {
      debugLogger.error('GoHighLevelApiService', 'Error getting valid token', { locationId, error });
      return null;
    }
  }

  // ✅ New method to load complete token data from database with caching and deduplication
  private static async loadTokenDataFromDb(locationId: string): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: string; oauthClientId?: string } | null> {
    const cacheKey = `token-data-${locationId}`;
    const now = Date.now();

    // Check cache first
    const cached = this.tokenDataCache.get(cacheKey);
    if (cached && (now - cached.timestamp) < this.TOKEN_CACHE_DURATION) {
      debugLogger.debug('GoHighLevelApiService', `Cache hit for token data: ${locationId}`);
      return cached.data;
    }

    // Check for pending request (deduplication)
    if (this.pendingTokenDataRequests.has(cacheKey)) {
      debugLogger.debug('GoHighLevelApiService', `Deduplicating token data request for: ${locationId}`);
      return await this.pendingTokenDataRequests.get(cacheKey)!;
    }

    // Create new request
    const requestPromise = (async () => {
      try {
        debugLogger.info('GoHighLevelApiService', `Fetching token data from database for: ${locationId}`);
        
        const { data, error } = await supabase
          .from('integrations')
          .select('config')
          .eq('platform', 'goHighLevel')
          .eq('account_id', locationId)
          .eq('connected', true)
          .single();
          
        if (error || !data?.config?.tokens?.accessToken) {
          debugLogger.warn('GoHighLevelApiService', 'No token found for location', { locationId });
          const result = null;
          // Cache null result to prevent repeated queries
          this.tokenDataCache.set(cacheKey, { data: result, timestamp: now });
          return result;
        }
        
        // Use stored oauthClientId if available, otherwise extract from token
        let oauthClientId = data.config.tokens.oauthClientId;
        let needsUpdate = false;
        
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
              // Use oauthMeta.client (base client_id) for refresh, not sourceId (which has suffix)
              // Refresh tokens work with the base client_id, not the full sourceId
              oauthClientId = payload.oauthMeta?.client || payload.sourceId?.split('-')[0] || payload.sourceId;
              
              // If we extracted it, mark for saving to database
              if (oauthClientId) {
                needsUpdate = true;
                debugLogger.info('GoHighLevelApiService', 'Extracted oauthClientId from token, will save to database', {
                  locationId,
                  oauthClientId: oauthClientId.substring(0, 20) + '...'
                });
              }
            }
          } catch (error) {
            debugLogger.debug('GoHighLevelApiService', 'Could not extract oauthClientId from token', { locationId, error });
          }
        }
        
        // If we extracted oauthClientId, save it back to the database for future use
        if (needsUpdate && oauthClientId) {
          try {
            const { error: updateError } = await supabase
              .from('integrations')
              .update({
                config: {
                  ...data.config,
                  tokens: {
                    ...data.config.tokens,
                    oauthClientId
                  }
                }
              })
              .eq('platform', 'goHighLevel')
              .eq('account_id', locationId);
              
            if (updateError) {
              debugLogger.warn('GoHighLevelApiService', 'Failed to save oauthClientId to database', { locationId, error: updateError });
            } else {
              debugLogger.info('GoHighLevelApiService', 'Saved oauthClientId to database for future token refresh', { locationId });
            }
          } catch (error) {
            debugLogger.warn('GoHighLevelApiService', 'Error saving oauthClientId to database', { locationId, error });
          }
        }
        
        // Return tokens directly (no encryption needed for internal dev app)
        const result = {
          accessToken: data.config.tokens.accessToken,
          refreshToken: data.config.tokens.refreshToken,
          expiresAt: data.config.tokens.expiresAt,
          oauthClientId
        };

        // Cache the result
        this.tokenDataCache.set(cacheKey, { data: result, timestamp: now });
        debugLogger.debug('GoHighLevelApiService', `Cached token data for: ${locationId}`);
        
        return result;
      } catch (error) {
        debugLogger.error('GoHighLevelApiService', 'Error loading token data', error);
        // Cache null result on error to prevent repeated failed queries
        this.tokenDataCache.set(cacheKey, { data: null, timestamp: now });
        return null;
      } finally {
        // Always remove from pending requests
        this.pendingTokenDataRequests.delete(cacheKey);
      }
    })();

    this.pendingTokenDataRequests.set(cacheKey, requestPromise);
    return await requestPromise;
  }

  // Refresh expired tokens using the app's client_id (all locations share the same app credentials)
  static async refreshToken(locationId: string, refreshToken: string, tokenOAuthClientId?: string): Promise<boolean> {
    try {
      debugLogger.info('GoHighLevelApiService', 'Refreshing token', { locationId, tokenOAuthClientId });

      // Get app's OAuth credentials (all locations use the same client_id/client_secret)
      const { GoHighLevelOAuthConfigService } = await import('./goHighLevelOAuthConfigService');
      const credentials = await GoHighLevelOAuthConfigService.getOAuthCredentials();
      
      // Priority 1: Use app's client_id from oauth_credentials (correct for all locations)
      let clientId: string | undefined = credentials?.clientId;
      let clientSecret: string | undefined = credentials?.clientSecret;
      
      // Priority 2: Fallback to environment variables
      if (!clientId) {
        clientId = import.meta.env.VITE_GHL_CLIENT_ID;
      }
      if (!clientSecret) {
        clientSecret = import.meta.env.VITE_GHL_CLIENT_SECRET;
      }
      
      if (!clientId || !clientSecret) {
        debugLogger.error('GoHighLevelApiService', 'Missing client_id or client_secret for refresh', {
          locationId,
          hasClientId: !!clientId,
          hasClientSecret: !!clientSecret
        });
        return false;
      }
      
      // Try both base and full client_id - some tokens may require full, some may require base
      const baseClientId = clientId.includes('-') ? clientId.split('-')[0] : clientId;
      
      // Extract client_id from refresh token's sourceId (token may have been issued with different client_id)
      let tokenClientId: string | undefined;
      try {
        const tokenParts = refreshToken.split('.');
        if (tokenParts.length === 3) {
          const base64Url = tokenParts[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(
            atob(base64)
              .split('')
              .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          );
          const payload = JSON.parse(jsonPayload);
          tokenClientId = payload.sourceId || payload.oauthMeta?.clientKey;
          if (tokenClientId) {
            debugLogger.debug('GoHighLevelApiService', 'Extracted client_id from refresh token', {
              locationId,
              tokenClientId: tokenClientId.substring(0, 30) + '...'
            });
          }
        }
      } catch (error) {
        debugLogger.debug('GoHighLevelApiService', 'Could not extract client_id from refresh token', { locationId });
      }
      
      // Try client_id from token FIRST (token may have been issued with different client_id)
      if (tokenClientId && tokenClientId !== clientId) {
        debugLogger.info('GoHighLevelApiService', 'Attempting refresh with client_id from token', {
          locationId,
          clientId: tokenClientId.substring(0, 30) + '...'
        });
        
        let success = await this.refreshTokenWithCredentials(locationId, refreshToken, tokenClientId, clientSecret);
        if (success) {
          return true;
        }
      }
      
      // Try full client_id from credentials
      if (clientId.includes('-') && clientId !== baseClientId) {
        debugLogger.info('GoHighLevelApiService', 'Attempting refresh with full client_id from credentials', {
          locationId,
          clientId: clientId.substring(0, 30) + '...'
        });
        
        let success = await this.refreshTokenWithCredentials(locationId, refreshToken, clientId, clientSecret);
        if (success) {
          return true;
        }
      }
      
      // Finally try base client_id
      debugLogger.info('GoHighLevelApiService', 'Attempting refresh with base client_id', {
        locationId,
        clientId: baseClientId.substring(0, 30) + '...'
      });
      
      return await this.refreshTokenWithCredentials(locationId, refreshToken, baseClientId, clientSecret);
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
        let errorData: any;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        
        debugLogger.error('GoHighLevelApiService', 'Token refresh failed', { 
          status: response.status, 
          statusText: response.statusText,
          error: errorText,
          locationId
        });
        
        // If refresh token is invalid, log it clearly but don't throw
        // The calling code should handle this by prompting user to reconnect
        if (errorData.error === 'invalid_grant' || errorData.error_description?.includes('refresh token is invalid')) {
          debugLogger.warn('GoHighLevelApiService', 'Refresh token is invalid - location needs to be reconnected', {
            locationId,
            error: errorData.error_description
          });
        }
        
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
