import { debugLogger } from '@/lib/debug';
import { supabase } from '@/lib/supabase';

// Browser API types
declare const fetch: typeof globalThis.fetch;
declare const crypto: globalThis.Crypto;
declare const TextEncoder: typeof globalThis.TextEncoder;
declare const URLSearchParams: typeof globalThis.URLSearchParams;

export interface GHLAccount {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
  website: string;
  timezone: string;
  currency: string;
  status: string;
}

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
}

export interface GHLCampaign {
  id: string;
  name: string;
  status: string;
  type: string;
  startDate: string;
  endDate?: string;
  budget?: number;
  metrics: {
    impressions: number;
    clicks: number;
    conversions: number;
    cost: number;
  };
}

export interface GHLAppCredentials {
  id: string;
  client_id: string;
  client_secret: string;
  shared_secret: string;
  redirect_uri: string;
  environment: string;
  is_active: boolean;
}

export class GoHighLevelService {
  private static readonly API_BASE_URL = 'https://services.leadconnectorhq.com';
  private static readonly OAUTH_BASE_URL = 'https://services.leadconnectorhq.com';
  
  private static accessToken: string | null = null;
  private static locationId: string | null = null;
  private static agencyToken: string | null = null; // For listing locations
  private static locationToken: string | null = null; // For location-specific data
  
  // Add caching to prevent excessive API calls
  private static cache = new Map<string, { data: any; timestamp: number }>();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private static lastRequestTime = 0;
  private static readonly MIN_REQUEST_INTERVAL = 100; // 100ms between requests (API 2.0 allows 100 req/10sec)
  private static requestCount = 0;
  private static readonly BURST_LIMIT = 100; // 100 requests per 10 seconds
  private static readonly BURST_WINDOW = 10 * 1000; // 10 seconds

  /**
   * Rate limiting helper for API 2.0 (100 requests per 10 seconds)
   */
  private static async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    
    // Reset counter if window has passed
    if (now - this.lastRequestTime > this.BURST_WINDOW) {
      this.requestCount = 0;
      this.lastRequestTime = now;
    }
    
    // Check if we're at the burst limit
    if (this.requestCount >= this.BURST_LIMIT) {
      const waitTime = this.BURST_WINDOW - (now - this.lastRequestTime);
      if (waitTime > 0) {
        debugLogger.warn('GoHighLevelService', `Rate limit reached, waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        this.requestCount = 0;
        this.lastRequestTime = Date.now();
      }
    }
    
    // Enforce minimum interval between requests
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      await new Promise(resolve => setTimeout(resolve, this.MIN_REQUEST_INTERVAL - timeSinceLastRequest));
    }
    
    this.requestCount++;
    this.lastRequestTime = Date.now();
  }

  /**
   * Get GHL app credentials from database
   */
  private static async getCredentials(): Promise<GHLAppCredentials | null> {
    try {
      const { data, error } = await supabase
        .from('ghl_app_credentials')
        .select('*')
        .eq('is_active', true)
        .eq('environment', import.meta.env.DEV ? 'development' : 'production')
        .single();

      if (error) {
        debugLogger.error('GoHighLevelService', 'Failed to get credentials', error);
        return null;
      }

      return data;
    } catch (error) {
      debugLogger.error('GoHighLevelService', 'Error getting credentials', error);
      return null;
    }
  }

  /**
   * Generate OAuth authorization URL
   */
  static async getAuthorizationUrl(): Promise<string> {
    try {
      const credentials = await this.getCredentials();
      if (!credentials) {
        throw new Error('GHL credentials not found');
      }

      const scopes = [
        'contacts.readonly',
        'locations.readonly',
        'opportunities.readonly'
      ].join(' ');

      // Generate state parameter for CSRF protection
      const state = crypto.randomUUID();
      
      const baseUrl = 'https://marketplace.leadconnectorhq.com/oauth/chooselocation';
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: credentials.client_id,
        redirect_uri: credentials.redirect_uri,
        scope: scopes,
        state: state,
        access_type: 'offline',
        prompt: 'consent'
      });

      const authUrl = `${baseUrl}?${params.toString()}`;

      debugLogger.info('GoHighLevelService', 'Generated authorization URL', {
        clientId: credentials.client_id,
        redirectUri: credentials.redirect_uri
      });

      return authUrl;
    } catch (error) {
      debugLogger.error('GoHighLevelService', 'Failed to generate authorization URL', error);
      throw error;
    }
  }

  /**
   * Exchange authorization code for access token
   */
  static async exchangeCodeForToken(code: string, locationId?: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
    locationId: string;
  }> {
    try {
      const credentials = await this.getCredentials();
      if (!credentials) {
        throw new Error('GHL credentials not found');
      }

      const tokenResponse = await fetch(`${this.OAUTH_BASE_URL}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: credentials.client_id,
          client_secret: credentials.client_secret,
          redirect_uri: credentials.redirect_uri,
          user_type: 'Location'
        })
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        let errorData = {};
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { rawError: errorText };
        }
        
        // Log detailed error information
        debugLogger.error('GoHighLevelService', 'GHL Token Exchange Error:', {
          status: tokenResponse.status,
          statusText: tokenResponse.statusText,
          errorData,
          requestBody: {
            grant_type: 'authorization_code',
            code: code ? code.substring(0, 10) + '...' : 'MISSING',
            client_id: credentials.client_id,
            client_secret: credentials.client_secret ? '***' : 'MISSING',
            redirect_uri: credentials.redirect_uri,
            user_type: 'Location'
          },
          url: `${this.OAUTH_BASE_URL}/oauth/token`
        });
        
        debugLogger.error('GoHighLevelService', 'Token exchange failed', {
          status: tokenResponse.status,
          statusText: tokenResponse.statusText,
          errorData,
          requestBody: {
            grant_type: 'authorization_code',
            code: code ? '***' : 'MISSING',
            client_id: credentials.client_id,
            client_secret: credentials.client_secret ? '***' : 'MISSING',
            redirect_uri: credentials.redirect_uri,
            user_type: 'Location'
          }
        });
        throw new Error(`Token exchange failed: ${(errorData as any).error || (errorData as any).message || (errorData as any).rawError || tokenResponse.statusText}`);
      }

      const tokenData = await tokenResponse.json();
      
      // Extract locationId from token response or use provided one
      const finalLocationId = tokenData.locationId || locationId;
      
      if (!finalLocationId) {
        throw new Error('Location ID not found in token response');
      }

      this.accessToken = tokenData.access_token;
      this.locationId = finalLocationId;

      debugLogger.info('GoHighLevelService', 'Successfully exchanged code for token', {
        hasAccessToken: !!tokenData.access_token,
        locationId: finalLocationId,
        expiresIn: tokenData.expires_in
      });

      return {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresIn: tokenData.expires_in,
        locationId: finalLocationId
      };
    } catch (error) {
      debugLogger.error('GoHighLevelService', 'Failed to exchange code for token', error);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
  }> {
    try {
      const credentials = await this.getCredentials();
      if (!credentials) {
        throw new Error('GHL credentials not found');
      }

      const tokenResponse = await fetch(`${this.OAUTH_BASE_URL}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: credentials.client_id,
          client_secret: credentials.client_secret,
          user_type: 'Location'
        })
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        debugLogger.error('GoHighLevelService', 'Token refresh failed', {
          status: tokenResponse.status,
          errorData
        });
        throw new Error(`Token refresh failed: ${errorData.error || tokenResponse.statusText}`);
      }

      const tokenData = await tokenResponse.json();
      
      this.accessToken = tokenData.access_token;
      if (tokenData.refresh_token) {
        // Update refresh token if provided
        await this.updateRefreshToken(tokenData.refresh_token);
      }

      debugLogger.info('GoHighLevelService', 'Token refreshed successfully');
      
      return {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresIn: tokenData.expires_in
      };
    } catch (error) {
      debugLogger.error('GoHighLevelService', 'Error refreshing token', error);
      throw error;
    }
  }

  /**
   * Update refresh token in database
   */
  private static async updateRefreshToken(refreshToken: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('integrations')
        .update({
          config: {
            refreshToken,
            updatedAt: new Date().toISOString()
          }
        })
        .eq('platform', 'goHighLevel');

      if (error) {
        debugLogger.error('GoHighLevelService', 'Failed to update refresh token', error);
      }
    } catch (error) {
      debugLogger.error('GoHighLevelService', 'Error updating refresh token', error);
    }
  }

  /**
   * Set access token and location ID for API calls
   */
  static setCredentials(accessToken: string, locationId?: string): void {
    this.accessToken = accessToken;
    this.locationId = locationId || null;
    debugLogger.info('GoHighLevelService', 'Credentials set', { 
      hasToken: !!accessToken, 
      locationId: this.locationId 
    });
  }

  static setAgencyToken(token: string): void {
    this.agencyToken = token;
    debugLogger.info('GoHighLevelService', 'Agency token set', { hasToken: !!token });
  }

  static setLocationToken(token: string, locationId: string): void {
    this.locationToken = token;
    this.locationId = locationId;
    debugLogger.info('GoHighLevelService', 'Location token set', { 
      hasToken: !!token, 
      locationId 
    });
  }

  /**
   * Set location ID for agency-level tokens
   */
  static setLocationId(locationId: string): void {
    this.locationId = locationId;
    debugLogger.info('GoHighLevelService', 'Location ID set', { locationId });
  }

  /**
   * Load saved credentials from database
   */
  private static async loadSavedCredentials(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('integrations')
        .select('config, account_id')
        .eq('platform', 'goHighLevel')
        .eq('connected', true)
        .single();

      if (error || !data?.config?.accessToken) {
        debugLogger.error('GoHighLevelService', 'No saved credentials found', error);
        return;
      }

      // Check for agency token first (private integration)
      if (data.config.apiKey?.agencyToken) {
        this.agencyToken = data.config.apiKey.agencyToken;
        this.locationId = null;
        debugLogger.info('GoHighLevelService', 'Loaded agency private integration token', { 
          hasToken: !!this.agencyToken, 
          tokenType: 'Agency Private Integration'
        });
      } else if (data.config.accessToken) {
        this.accessToken = data.config.accessToken;
        
        // Check if this is a private integration token
        if (this.accessToken && this.accessToken.startsWith('pit-')) {
          // Private integration token - treat as agency-level
          this.locationId = null;
          debugLogger.info('GoHighLevelService', 'Loaded private integration credentials', { 
            hasToken: !!this.accessToken, 
            tokenType: 'Private Integration'
          });
        } else {
        // Decode JWT token to determine type
        try {
          const tokenPayload = JSON.parse(atob(this.accessToken!.split('.')[1]));
          const authClass = tokenPayload.authClass;
          
          if (authClass === 'Company') {
            // Agency-level token - don't set locationId, will fetch all locations
            this.locationId = null;
            debugLogger.info('GoHighLevelService', 'Loaded agency-level credentials', { 
              hasToken: !!this.accessToken, 
              authClass: 'Company',
              accountId: data?.account_id 
            });
          } else if (authClass === 'Location') {
            // Location-level token - use account_id as locationId
            this.locationId = data.account_id;
            debugLogger.info('GoHighLevelService', 'Loaded location-level credentials', { 
              hasToken: !!this.accessToken, 
              authClass: 'Location',
              locationId: this.locationId 
            });
          } else {
            debugLogger.warn('GoHighLevelService', 'Unknown auth class', { authClass });
            this.locationId = data.account_id; // Fallback
          }
        } catch (tokenError) {
          debugLogger.error('GoHighLevelService', 'Failed to decode token', tokenError);
          this.locationId = data.account_id; // Fallback
        }
        }
      }
    } catch (error) {
      debugLogger.error('GoHighLevelService', 'Failed to load saved credentials', error);
    }
  }

  /**
   * Get comprehensive GHL metrics for dashboard
   */
  static async getGHLMetrics(dateRange?: { start: string; end: string }): Promise<{
    totalContacts: number;
    newContacts: number;
    totalGuests: number;
    averageGuestsPerLead: number;
    sourceBreakdown: Array<{ source: string; count: number; percentage: number }>;
    guestCountDistribution: Array<{ range: string; count: number; percentage: number }>;
    eventTypeBreakdown: Array<{ type: string; count: number; percentage: number }>;
    recentContacts: Array<{
      id: string;
      name: string;
      email: string;
      phone: string;
      source: string;
      dateAdded: string;
      guestCount?: number;
      eventDate?: string;
    }>;
    conversionRate: number;
    topPerformingSources: Array<{ source: string; leads: number; avgGuests: number }>;
    pageViewAnalytics: {
      totalPageViews: number;
      uniquePages: Array<{ page: string; views: number; percentage: number }>;
      topLandingPages: Array<{ url: string; views: number; conversions: number; conversionRate: number }>;
      utmCampaigns: Array<{ campaign: string; views: number; conversions: number; conversionRate: number }>;
      utmSources: Array<{ source: string; views: number; conversions: number; conversionRate: number }>;
      referrerBreakdown: Array<{ referrer: string; views: number; percentage: number }>;
    };
  }> {
    try {
      // Check cache first
      const cacheKey = `ghl-metrics-${JSON.stringify(dateRange || {})}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        debugLogger.debug('GoHighLevelService', 'Using cached GHL metrics');
        return cached.data;
      }

      // Load credentials if not set
      if (!this.accessToken) {
        await this.loadSavedCredentials();
      }

      // Use location token for data access
      if (!this.locationToken || !this.locationId) {
        throw new Error('Location token and location ID required for data access. Please set location token.');
      }

      // Build date range parameters for API calls
      const dateParams = dateRange ? {
        startDate: dateRange.start,
        endDate: dateRange.end
      } : {};

      // Fetch ALL data in parallel for maximum performance (your optimization!)
      const [allContacts, opportunities, calendars, funnels, pages] = await Promise.all([
        this.getAllContacts(dateParams),
        this.getOpportunitiesAnalytics(dateParams ? { start: dateParams.startDate, end: dateParams.endDate } : undefined),
        this.getCalendarAnalytics(dateParams ? { start: dateParams.startDate, end: dateParams.endDate } : undefined),
        this.getFunnelAnalytics(dateParams ? { start: dateParams.startDate, end: dateParams.endDate } : undefined),
        this.getPageAnalytics(dateParams ? { start: dateParams.startDate, end: dateParams.endDate } : undefined)
      ]);
      
      // Filter by date range if provided (fallback for client-side filtering)
      let filteredContacts = allContacts;
      if (dateRange && !dateParams.startDate) {
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);
        filteredContacts = allContacts.filter(contact => {
          const contactDate = new Date(contact.dateAdded);
          return contactDate >= startDate && contactDate <= endDate;
        });
      }

      // Calculate metrics
      const totalContacts = allContacts.length;
      const newContacts = filteredContacts.length;
      
      // Extract guest counts from custom fields with better validation
      const contactsWithGuests = filteredContacts.filter(contact => {
        if (!contact.customFields || contact.customFields.length === 0) {return false;}
        
        // Look for numeric values in custom fields (likely guest counts)
        return contact.customFields.some((field: any) => {
          const value = parseInt(field.value);
          return !isNaN(value) && value > 0 && value <= 500; // Reasonable guest count range
        });
      });
      
      const guestCounts = contactsWithGuests.map(contact => {
        if (!contact.customFields) {return 0;}
        
        // Find the first numeric field that looks like a guest count
        const guestField = contact.customFields.find((field: any) => {
          const value = parseInt(field.value);
          return !isNaN(value) && value > 0 && value <= 500;
        });
        
        return guestField ? parseInt(guestField.value) : 0;
      }).filter(count => count > 0);
      
      // Add safety check to prevent unrealistic numbers
      const totalGuests = guestCounts.reduce((sum, count) => {
        // Additional safety check - if any single count is > 1000, something is wrong
        if (count > 1000) {
          console.warn(`Suspicious guest count found: ${count} - skipping`);
          return sum;
        }
        return sum + count;
      }, 0);
      
      // Final safety check - if total is unreasonably high, return 0
      const finalTotalGuests = totalGuests > 10000 ? 0 : totalGuests;
      const averageGuestsPerLead = guestCounts.length > 0 ? finalTotalGuests / guestCounts.length : 0;
      
      // Debug logging
      if (finalTotalGuests > 1000) {
        console.warn(`GHL Service: Suspicious total guest count: ${finalTotalGuests}`);
        console.warn(`Guest counts found:`, guestCounts.slice(0, 10)); // Show first 10
      }

      // Source breakdown
      const sourceCounts = filteredContacts.reduce((acc, contact) => {
        const source = contact.source || 'Unknown';
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const sourceBreakdown = Object.entries(sourceCounts).map(([source, count]) => ({
        source,
        count: count as number,
        percentage: newContacts > 0 ? ((count as number) / newContacts) * 100 : 0
      })).sort((a, b) => (b.count as number) - (a.count as number));

      // Guest count distribution
      const guestRanges = [
        { range: '1-25', min: 1, max: 25 },
        { range: '26-50', min: 26, max: 50 },
        { range: '51-100', min: 51, max: 100 },
        { range: '101-200', min: 101, max: 200 },
        { range: '200+', min: 201, max: Infinity }
      ];

      const guestCountDistribution = guestRanges.map(range => {
        const count = guestCounts.filter(guestCount => guestCount >= range.min && guestCount <= range.max).length;
        return {
          range: range.range,
          count: count as number,
          percentage: guestCounts.length > 0 ? (count / guestCounts.length) * 100 : 0
        };
      });

      // Event type breakdown (from custom field)
      const eventTypeCounts = filteredContacts.reduce((acc, contact) => {
        const eventTypeField = contact.customFields?.find((field: any) => field.id === '3ruMixADlpJsZqI67sBU');
        const eventType = eventTypeField?.value === 'YES' ? 'Wedding' : 'Other';
        acc[eventType] = (acc[eventType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const eventTypeBreakdown = Object.entries(eventTypeCounts).map(([type, count]) => ({
        type,
        count: count as number,
        percentage: newContacts > 0 ? ((count as number) / newContacts) * 100 : 0
      }));

      // Recent contacts (last 10)
      const recentContacts = filteredContacts
        .sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime())
        .slice(0, 10)
        .map(contact => {
          const guestField = contact.customFields?.find((field: any) => {
            const value = parseInt(field.value);
            return !isNaN(value) && value > 0 && value <= 500;
          });
          const dateField = contact.customFields?.find((field: any) => field.id === 'Y0VtlMHIFGgRtqQimAdg');
          
          return {
            id: contact.id,
            name: contact.contactName || `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
            email: contact.email || '',
            phone: contact.phone || '',
            source: contact.source || 'Unknown',
            dateAdded: contact.dateAdded,
            guestCount: guestField ? parseInt(guestField.value) : undefined,
            eventDate: dateField ? new Date(parseInt(dateField.value)).toISOString().split('T')[0] : undefined
          };
        });

      // Conversion rate (contacts with guest count / total contacts)
      const conversionRate = newContacts > 0 ? (contactsWithGuests.length / newContacts) * 100 : 0;

      // Top performing sources
      const topPerformingSources = sourceBreakdown.slice(0, 3).map(source => {
        const sourceContacts = filteredContacts.filter(contact => contact.source === source.source);
        const sourceGuestCounts = sourceContacts.map(contact => {
          const guestField = contact.customFields?.find((field: any) => {
            const value = parseInt(field.value);
            return !isNaN(value) && value > 0 && value <= 500;
          });
          return guestField ? parseInt(guestField.value) : 0;
        }).filter(count => count > 0);
        
        const avgGuests = sourceGuestCounts.length > 0 
          ? sourceGuestCounts.reduce((sum, count) => sum + count, 0) / sourceGuestCounts.length 
          : 0;

        return {
          source: source.source,
          leads: source.count as number,
          avgGuests: Math.round(avgGuests)
        };
      });

      const result = {
        totalContacts,
        newContacts,
        totalGuests: finalTotalGuests,
        averageGuestsPerLead: Math.round(averageGuestsPerLead),
        sourceBreakdown,
        guestCountDistribution,
        eventTypeBreakdown,
        recentContacts,
        conversionRate: Math.round(conversionRate * 10) / 10,
        topPerformingSources,
        pageViewAnalytics: {
          totalPageViews: totalContacts,
          uniquePages: [],
          topLandingPages: [],
          utmCampaigns: [],
          utmSources: [],
          referrerBreakdown: []
        }
      };

      // Cache the result
      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      
      return result;

    } catch (error) {
      debugLogger.error('GoHighLevelService', 'Failed to get GHL metrics', error);
      throw error;
    }
  }

  /**
   * Search contacts using the recommended Search Contacts endpoint (API 2.0)
   */
  private static async getAllContacts(dateParams?: { startDate?: string; endDate?: string }): Promise<any[]> {
    const allContacts = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      // Enforce API 2.0 rate limiting
      await this.enforceRateLimit();
      
      // Use the recommended Search Contacts endpoint with date filtering
      const searchBody = {
        locationId: this.locationId,
        limit: limit,
        offset: offset,
        // Add date filtering if provided
        ...(dateParams?.startDate && { startDate: dateParams.startDate }),
        ...(dateParams?.endDate && { endDate: dateParams.endDate }),
        query: {
          // Empty query to get all contacts for this location
        }
      };
      
      const response = await fetch(`${this.API_BASE_URL}/contacts/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to search contacts: ${response.statusText}`, errorText);
        throw new Error(`Failed to search contacts: ${response.statusText}`);
      }

      const data: any = await response.json();
      
      // Handle different response structures
      const contacts = data.contacts || data.data?.contacts || [];
      allContacts.push(...contacts);
      
      // Check if there are more contacts
      hasMore = contacts.length === limit;
      offset += limit;
      
      // Safety limit to prevent infinite loops
      if (offset > 10000) {
        console.warn('Reached safety limit for contact search');
        break;
      }
    }

    debugLogger.info('GoHighLevelService', `Retrieved ${allContacts.length} contacts using Search Contacts endpoint`);
    return allContacts;
  }

  /**
   * Make authenticated API request (API 2.0 with rate limiting)
   */
  private static async makeApiRequest<T>(
    endpoint: string,
    options: globalThis.RequestInit = {},
    token?: string
  ): Promise<T> {
    // Use provided token or load credentials
    const useToken = token || this.accessToken;
    
    if (!useToken) {
      throw new Error('GHL token not provided. Please authenticate first.');
    }

    // Enforce API 2.0 rate limiting
    await this.enforceRateLimit();

    const url = `${this.API_BASE_URL}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
        headers: {
        'Authorization': `Bearer ${useToken}`,
        'Content-Type': 'application/json',
          'Version': '2021-07-28',
        ...options.headers
        }
      });

      if (!response.ok) {
      // Handle API 2.0 specific error responses
      if (response.status === 429) {
        // Rate limit exceeded - wait and retry
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 10000; // Default 10 seconds
        
        debugLogger.warn('GoHighLevelService', `Rate limit exceeded, waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        // Retry the request
        const retryResponse = await fetch(url, {
          ...options,
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Version': '2021-07-28',
            'Content-Type': 'application/json',
            ...options.headers
          }
        });
        
        if (retryResponse.ok) {
          return await retryResponse.json();
        }
      }
      
      // Check if token expired and try to refresh
      if (response.status === 401) {
        debugLogger.info('GoHighLevelService', 'Token expired, attempting refresh');
        try {
          const connection = await this.getGHLConnection();
          if (connection?.config?.refreshToken) {
            const newTokens = await this.refreshAccessToken(connection.config.refreshToken);
            this.setCredentials(newTokens.accessToken, this.locationId || '');
            
            // Retry the request with new token
            const retryResponse = await fetch(url, {
              ...options,
              headers: {
                'Authorization': `Bearer ${newTokens.accessToken}`,
                'Version': '2021-07-28',
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...options.headers
              }
            });
            
            if (retryResponse.ok) {
              return await retryResponse.json();
            }
          }
        } catch (refreshError) {
          debugLogger.error('GoHighLevelService', 'Token refresh failed', refreshError);
        }
      }
      
      const errorData = await response.json().catch(() => ({}));
      debugLogger.error('GoHighLevelService', 'API 2.0 request failed', {
        url,
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      // Provide more specific error messages for API 2.0
      let errorMessage = `API request failed: ${response.statusText}`;
      if (errorData.message) {
        errorMessage = errorData.message;
      } else if (errorData.error) {
        errorMessage = errorData.error;
      }
      
      throw new Error(errorMessage);
    }

    return response.json();
  }

  /**
   * Get account information
   */
  static async getAccountInfo(): Promise<GHLAccount> {
    try {
      const account = await this.makeApiRequest<GHLAccount>(`/locations/${this.locationId}`);
      debugLogger.info('GoHighLevelService', 'Retrieved account info', { 
        accountId: account.id, 
        accountName: account.name 
      });
      return account;
    } catch (error) {
      debugLogger.error('GoHighLevelService', 'Failed to get account info', error);
      throw error;
    }
  }

  /**
   * Get contacts using Search Contacts endpoint (API 2.0)
   */
  static async getContacts(limit = 100, offset = 0): Promise<GHLContact[]> {
    try {
      // Load credentials if not set
      if (!this.accessToken || !this.locationId) {
        await this.loadSavedCredentials();
      }

      if (!this.accessToken || !this.locationId) {
        throw new Error('GHL credentials not set');
      }

      // Use Search Contacts endpoint
      const searchBody = {
        locationId: this.locationId,
        limit: limit,
        offset: offset,
        query: {} // Empty query to get all contacts
      };
      
      const response = await fetch(`${this.API_BASE_URL}/contacts/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchBody)
      });

      if (!response.ok) {
        throw new Error(`Failed to search contacts: ${response.statusText}`);
      }

      const data: any = await response.json();
      const contacts = data.contacts || data.data?.contacts || [];
      
      debugLogger.info('GoHighLevelService', 'Retrieved contacts using Search Contacts endpoint', { 
        count: contacts.length 
      });
      
      return contacts;
    } catch (error) {
      debugLogger.error('GoHighLevelService', 'Failed to get contacts', error);
      throw error;
    }
  }

  /**
   * Get campaigns (API 2.0)
   */
  static async getCampaigns(): Promise<GHLCampaign[]> {
    try {
      const response = await this.makeApiRequest<{ campaigns: GHLCampaign[] }>(
        `/campaigns/location/${this.locationId}`
      );
      
      debugLogger.info('GoHighLevelService', 'Retrieved campaigns', { 
        count: response.campaigns?.length || 0 
      });
      
      return response.campaigns || [];
    } catch (error) {
      debugLogger.error('GoHighLevelService', 'Failed to get campaigns', error);
      throw error;
    }
  }

  /**
   * Get analytics data (API 2.0)
   */
  static async getAnalytics(startDate: string, endDate: string): Promise<Record<string, unknown>> {
    try {
      const response = await this.makeApiRequest(
        `/analytics/location/${this.locationId}?startDate=${startDate}&endDate=${endDate}`
      );
      
      debugLogger.info('GoHighLevelService', 'Retrieved analytics', { 
        startDate, 
        endDate 
      });
      
      return response as Record<string, unknown>;
    } catch (error) {
      debugLogger.error('GoHighLevelService', 'Failed to get analytics', error);
      throw error;
    }
  }

  /**
   * Setup webhook (API 2.0)
   */
  static async setupWebhook(webhookUrl: string, events: string[]): Promise<Record<string, unknown>> {
    try {
      const response = await this.makeApiRequest(`/webhooks/location/${this.locationId}`, {
        method: 'POST',
        body: JSON.stringify({
          url: webhookUrl,
          events
        })
      });

      debugLogger.info('GoHighLevelService', 'Webhook setup', { 
        webhookUrl, 
        events 
      });
      
      return response as Record<string, unknown>;
    } catch (error) {
      debugLogger.error('GoHighLevelService', 'Failed to setup webhook', error);
      throw error;
    }
  }

  /**
   * Verify webhook signature
   */
  static async verifyWebhookSignature(payload: string, signature: string): Promise<boolean> {
    try {
      const credentials = await this.getCredentials();
      if (!credentials) {
        return false;
      }

      // Create HMAC-SHA256 hash
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(credentials.shared_secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );

      const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
      const expectedSignature = 'sha256=' + Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      return signature === expectedSignature;
    } catch (error) {
      debugLogger.error('GoHighLevelService', 'Failed to verify webhook signature', error);
      return false;
    }
  }

  /**
   * Get GHL connection from database
   */
  private static async getGHLConnection(): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('integrations')
        .select('config, account_id')
        .eq('platform', 'goHighLevel')
        .eq('connected', true)
        .single();

      if (error || !data?.config) {
        debugLogger.error('GoHighLevelService', 'No GHL connection found', error);
        return null;
      }

      return {
        config: data.config,
        account_id: data.account_id
      };
    } catch (error) {
      debugLogger.error('GoHighLevelService', 'Failed to get GHL connection', error);
      return null;
    }
  }

  /**
   * Get funnel analytics data
   */
  static async getFunnelAnalytics(dateRange?: { start: string; end: string }): Promise<{
    funnels: Array<{
      id: string;
      name: string;
      status: string;
      createdAt: string;
      pages: Array<{
        id: string;
        name: string;
        url: string;
        views: number;
        conversions: number;
        conversionRate: number;
      }>;
      redirects: Array<{
        id: string;
        name: string;
        url: string;
        clicks: number;
        conversions: number;
        conversionRate: number;
      }>;
    }>;
    totalFunnels: number;
    totalPageViews: number;
    totalConversions: number;
    averageConversionRate: number;
  }> {
    try {
      // Check cache first
      const cacheKey = `ghl-funnels-${JSON.stringify(dateRange || {})}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        debugLogger.debug('GoHighLevelService', 'Using cached funnel analytics');
        return cached.data;
      }

      // Load credentials if not set
      if (!this.accessToken || !this.locationId) {
        await this.loadSavedCredentials();
      }

      if (!this.accessToken || !this.locationId) {
        throw new Error('GHL credentials not set');
      }

      // Get funnels - corrected for subaccount/location level
      const funnelsResponse: any = await this.makeApiRequest(`/funnels/?locationId=${this.locationId}`);
      const funnels = funnelsResponse.funnels || [];

      // Get funnel pages and redirects for each funnel
      const funnelAnalytics = await Promise.all(
        funnels.map(async (funnel: any) => {
          try {
            // Get funnel pages
            const pagesResponse: any = await this.makeApiRequest(`/funnels/${funnel.id}/pages`);
            const pages = pagesResponse.pages || [];

            // Get funnel redirects
            const redirectsResponse: any = await this.makeApiRequest(`/funnels/${funnel.id}/redirects`);
            const redirects = redirectsResponse.redirects || [];

            return {
              id: funnel.id,
              name: funnel.name,
              status: funnel.status,
              createdAt: funnel.createdAt,
              pages: pages.map((page: any) => ({
                id: page.id,
                name: page.name,
                url: page.url,
                views: page.views || 0,
                conversions: page.conversions || 0,
                conversionRate: page.views > 0 ? (page.conversions / page.views) * 100 : 0
              })),
              redirects: redirects.map((redirect: any) => ({
                id: redirect.id,
                name: redirect.name,
                url: redirect.url,
                clicks: redirect.clicks || 0,
                conversions: redirect.conversions || 0,
                conversionRate: redirect.clicks > 0 ? (redirect.conversions / redirect.clicks) * 100 : 0
              }))
            };
          } catch (error) {
            debugLogger.warn('GoHighLevelService', `Failed to get analytics for funnel ${funnel.id}`, error);
            return {
              id: funnel.id,
              name: funnel.name,
              status: funnel.status,
              createdAt: funnel.createdAt,
              pages: [],
              redirects: []
            };
          }
        })
      );

      // Calculate totals
      const totalFunnels = funnelAnalytics.length;
      const totalPageViews = funnelAnalytics.reduce((sum: number, funnel: any) => 
        sum + funnel.pages.reduce((pageSum: number, page: any) => pageSum + page.views, 0), 0
      );
      const totalConversions = funnelAnalytics.reduce((sum: number, funnel: any) => 
        sum + funnel.pages.reduce((pageSum: number, page: any) => pageSum + page.conversions, 0), 0
      );
      const averageConversionRate = totalPageViews > 0 ? (totalConversions / totalPageViews) * 100 : 0;

      const result = {
        funnels: funnelAnalytics,
        totalFunnels,
        totalPageViews,
        totalConversions,
        averageConversionRate: Math.round(averageConversionRate * 10) / 10
      };

      // Cache the result
      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      
      return result;

    } catch (error) {
      debugLogger.error('GoHighLevelService', 'Failed to get funnel analytics', error);
      // Return empty result instead of throwing
      return {
        funnels: [],
        totalFunnels: 0,
        totalPageViews: 0,
        totalConversions: 0,
        averageConversionRate: 0
      };
    }
  }

  /**
   * Get page analytics data
   */
  static async getPageAnalytics(dateRange?: { start: string; end: string }): Promise<{
    pages: Array<{
      id: string;
      name: string;
      url: string;
      views: number;
      conversions: number;
      conversionRate: number;
      lastUpdated: string;
    }>;
    totalPages: number;
    totalViews: number;
    totalConversions: number;
    averageConversionRate: number;
  }> {
    try {
      // Check cache first
      const cacheKey = `ghl-pages-${JSON.stringify(dateRange || {})}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        debugLogger.debug('GoHighLevelService', 'Using cached page analytics');
        return cached.data;
      }

      // Load credentials if not set
      if (!this.accessToken || !this.locationId) {
        await this.loadSavedCredentials();
      }

      if (!this.accessToken || !this.locationId) {
        throw new Error('GHL credentials not set');
      }

      // Get pages - corrected for subaccount/location level
      const pagesResponse: any = await this.makeApiRequest(`/pages/?locationId=${this.locationId}`);
      const pages = pagesResponse.pages || [];

      // Process page data
      const pageAnalytics = pages.map((page: any) => ({
        id: page.id,
        name: page.name,
        url: page.url,
        views: page.views || 0,
        conversions: page.conversions || 0,
        conversionRate: page.views > 0 ? (page.conversions / page.views) * 100 : 0,
        lastUpdated: page.updatedAt || page.createdAt
      }));

      // Calculate totals
      const totalPages = pageAnalytics.length;
      const totalViews = pageAnalytics.reduce((sum: number, page: any) => sum + page.views, 0);
      const totalConversions = pageAnalytics.reduce((sum: number, page: any) => sum + page.conversions, 0);
      const averageConversionRate = totalViews > 0 ? (totalConversions / totalViews) * 100 : 0;

      const result = {
        pages: pageAnalytics,
        totalPages,
        totalViews,
        totalConversions,
        averageConversionRate: Math.round(averageConversionRate * 10) / 10
      };

      // Cache the result
      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      
      return result;

    } catch (error) {
      debugLogger.error('GoHighLevelService', 'Failed to get page analytics', error);
      // Return empty result instead of throwing
      return {
        pages: [],
        totalPages: 0,
        totalViews: 0,
        totalConversions: 0,
        averageConversionRate: 0
      };
    }
  }

  /**
   * Debug method to check guest count data
   */
  static async debugGuestCounts(): Promise<void> {
    try {
      console.log('🔍 Debugging GHL Guest Counts...\n');
      
      // Load credentials if not set
      if (!this.accessToken || !this.locationId) {
        await this.loadSavedCredentials();
      }

      if (!this.accessToken || !this.locationId) {
        throw new Error('GHL credentials not set');
      }

      const allContacts = await this.getAllContacts();
      console.log(`Total contacts fetched: ${allContacts.length}\n`);
      
      // Sample first 5 contacts and their custom fields
      console.log('📋 Sample Contact Custom Fields:');
      allContacts.slice(0, 5).forEach((contact: any, index: number) => {
        console.log(`\nContact ${index + 1}:`);
        console.log(`  ID: ${contact.id}`);
        console.log(`  Name: ${contact.firstName} ${contact.lastName}`);
        console.log(`  Email: ${contact.email}`);
        console.log(`  Source: ${contact.source}`);
        console.log(`  Custom Fields: ${contact.customFields ? contact.customFields.length : 0} fields`);
        
        if (contact.customFields && contact.customFields.length > 0) {
          contact.customFields.forEach((field: any, fieldIndex: number) => {
            console.log(`    Field ${fieldIndex + 1}:`);
            console.log(`      Key: ${field.key || 'undefined'}`);
            console.log(`      Value: ${field.value || 'undefined'}`);
            console.log(`      Type: ${typeof field.value}`);
            
            // Check if this looks like a guest count
            const numericValue = parseInt(field.value);
            if (!isNaN(numericValue)) {
              console.log(`      Numeric Value: ${numericValue}`);
              if (numericValue > 0 && numericValue <= 500) {
                console.log(`      ✅ Looks like guest count!`);
              } else {
                console.log(`      ❌ Outside guest count range (1-500)`);
              }
            }
          });
        }
      });
      
      // Check for any suspiciously large numbers
      console.log('\n🚨 Checking for large numbers in custom fields...');
      let largeNumbersFound = 0;
      allContacts.forEach((contact: any) => {
        if (contact.customFields) {
          contact.customFields.forEach((field: any) => {
            const numericValue = parseInt(field.value);
            if (!isNaN(numericValue) && numericValue > 1000) {
              largeNumbersFound++;
              console.log(`Large number found: ${numericValue} in field ${field.key || 'unknown'}`);
            }
          });
        }
      });
      
      console.log(`\nFound ${largeNumbersFound} custom fields with numbers > 1000`);
      
    } catch (error) {
      console.error('❌ Error debugging guest counts:', error);
    }
  }

  /**
   * Get calendar analytics data
   */
  static async getCalendarAnalytics(dateRange?: { start: string; end: string }): Promise<{
    calendars: Array<{
      id: string;
      name: string;
      description: string;
      timezone: string;
      events: Array<{
        id: string;
        title: string;
        startTime: string;
        endTime: string;
        status: string;
        attendees: number;
        location: string;
        description: string;
      }>;
    }>;
    totalCalendars: number;
    totalEvents: number;
    upcomingEvents: number;
    completedEvents: number;
    averageAttendees: number;
  }> {
    try {
      // Check cache first
      const cacheKey = `ghl-calendars-${JSON.stringify(dateRange || {})}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        debugLogger.debug('GoHighLevelService', 'Using cached calendar analytics');
        return cached.data;
      }

      // Load credentials if not set
      if (!this.accessToken || !this.locationId) {
        await this.loadSavedCredentials();
      }

      if (!this.accessToken || !this.locationId) {
        throw new Error('GHL credentials not set');
      }

      // Get calendars
      // Build URL with date filtering (server-side filtering for better performance)
      let url = `/calendars/?locationId=${this.locationId}`;
      if (dateRange?.start) url += `&startDate=${dateRange.start}`;
      if (dateRange?.end) url += `&endDate=${dateRange.end}`;
      
      const calendarsResponse: any = await this.makeApiRequest(url);
      const calendars = calendarsResponse.calendars || [];

      // Get events for each calendar
      const calendarAnalytics = await Promise.all(
        calendars.map(async (calendar: any) => {
          try {
            // Get calendar events
            const eventsResponse: any = await this.makeApiRequest(`/calendars/${calendar.id}/events`);
            const events = eventsResponse.events || [];

            // Filter events by date range if provided
            let filteredEvents = events;
            if (dateRange) {
              const startDate = new Date(dateRange.start);
              const endDate = new Date(dateRange.end);
              filteredEvents = events.filter((event: any) => {
                const eventDate = new Date(event.startTime);
                return eventDate >= startDate && eventDate <= endDate;
              });
            }

            return {
              id: calendar.id,
              name: calendar.name,
              description: calendar.description,
              timezone: calendar.timezone,
              events: filteredEvents.map((event: any) => ({
                id: event.id,
                title: event.title,
                startTime: event.startTime,
                endTime: event.endTime,
                status: event.status,
                attendees: event.attendees?.length || 0,
                location: event.location,
                description: event.description
              }))
            };
          } catch (error) {
            debugLogger.warn('GoHighLevelService', `Failed to get events for calendar ${calendar.id}`, error);
            return {
              id: calendar.id,
              name: calendar.name,
              description: calendar.description,
              timezone: calendar.timezone,
              events: []
            };
          }
        })
      );

      // Calculate totals
      const totalCalendars = calendarAnalytics.length;
      const totalEvents = calendarAnalytics.reduce((sum, calendar) => sum + calendar.events.length, 0);
      const upcomingEvents = calendarAnalytics.reduce((sum: number, calendar: any) => 
        sum + calendar.events.filter((event: any) => new Date(event.startTime) > new Date()).length, 0
      );
      const completedEvents = calendarAnalytics.reduce((sum: number, calendar: any) => 
        sum + calendar.events.filter((event: any) => new Date(event.endTime) < new Date()).length, 0
      );
      const totalAttendees = calendarAnalytics.reduce((sum: number, calendar: any) => 
        sum + calendar.events.reduce((eventSum: number, event: any) => eventSum + event.attendees, 0), 0
      );
      const averageAttendees = totalEvents > 0 ? totalAttendees / totalEvents : 0;

      const result = {
        calendars: calendarAnalytics,
        totalCalendars,
        totalEvents,
        upcomingEvents,
        completedEvents,
        averageAttendees: Math.round(averageAttendees * 10) / 10
      };

      // Cache the result
      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      
      return result;

    } catch (error) {
      debugLogger.error('GoHighLevelService', 'Failed to get calendar analytics', error);
      // Return empty result instead of throwing
      return {
        calendars: [],
        totalCalendars: 0,
        totalEvents: 0,
        upcomingEvents: 0,
        completedEvents: 0,
        averageAttendees: 0
      };
    }
  }

  /**
   * Get opportunities analytics data
   */
  static async getOpportunitiesAnalytics(dateRange?: { start: string; end: string }): Promise<{
    opportunities: Array<{
      id: string;
      title: string;
      value: number;
      status: string;
      stageId: string;
      stageName: string;
      contactId: string;
      contactName: string;
      createdAt: string;
      updatedAt: string;
      assignedTo: string;
      source: string;
      tags: string[];
    }>;
    totalOpportunities: number;
    totalValue: number;
    averageValue: number;
    statusBreakdown: Array<{ status: string; count: number; value: number }>;
    stageBreakdown: Array<{ stage: string; count: number; value: number }>;
  }> {
    try {
      // Check cache first
      const cacheKey = `ghl-opportunities-${JSON.stringify(dateRange || {})}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        debugLogger.debug('GoHighLevelService', 'Using cached opportunities analytics');
        return cached.data;
      }

      // Load credentials if not set
      if (!this.accessToken || !this.locationId) {
        await this.loadSavedCredentials();
      }

      if (!this.accessToken || !this.locationId) {
        throw new Error('GHL credentials not set');
      }

      // Build URL with date filtering (server-side filtering for better performance)
      let url = `/opportunities/?locationId=${this.locationId}`;
      if (dateRange?.start) url += `&startDate=${dateRange.start}`;
      if (dateRange?.end) url += `&endDate=${dateRange.end}`;
      
      const opportunitiesResponse: any = await this.makeApiRequest(url);
      const opportunities = opportunitiesResponse.opportunities || [];
      
      // Use all opportunities (already filtered by server)
      const filteredOpportunities = opportunities;

      // Process opportunities data
      const opportunitiesData = filteredOpportunities.map((opp: any) => ({
        id: opp.id,
        title: opp.title,
        value: opp.value || 0,
        status: opp.status,
        stageId: opp.stageId,
        stageName: opp.stageName,
        contactId: opp.contactId,
        contactName: opp.contactName,
        createdAt: opp.createdAt,
        updatedAt: opp.updatedAt,
        assignedTo: opp.assignedTo,
        source: opp.source,
        tags: opp.tags || []
      }));

      // Calculate totals
      const totalOpportunities = opportunitiesData.length;
      const totalValue = opportunitiesData.reduce((sum: number, opp: any) => sum + opp.value, 0);
      const averageValue = totalOpportunities > 0 ? totalValue / totalOpportunities : 0;

      // Status breakdown
      const statusCounts = opportunitiesData.reduce((acc: Record<string, { count: number; value: number }>, opp: any) => {
        acc[opp.status] = (acc[opp.status] || { count: 0, value: 0 });
        acc[opp.status].count++;
        acc[opp.status].value += opp.value;
        return acc;
      }, {} as Record<string, { count: number; value: number }>);

      const statusBreakdown = Object.entries(statusCounts).map(([status, data]) => ({
        status,
        count: (data as { count: number; value: number }).count,
        value: (data as { count: number; value: number }).value
      }));

      // Stage breakdown
      const stageCounts = opportunitiesData.reduce((acc: Record<string, { count: number; value: number }>, opp: any) => {
        acc[opp.stageName] = (acc[opp.stageName] || { count: 0, value: 0 });
        acc[opp.stageName].count++;
        acc[opp.stageName].value += opp.value;
        return acc;
      }, {} as Record<string, { count: number; value: number }>);

      const stageBreakdown = Object.entries(stageCounts).map(([stage, data]) => ({
        stage,
        count: (data as { count: number; value: number }).count,
        value: (data as { count: number; value: number }).value
      }));

      const result = {
        opportunities: opportunitiesData,
        totalOpportunities,
        totalValue,
        averageValue: Math.round(averageValue * 100) / 100,
        statusBreakdown,
        stageBreakdown
      };

      // Cache the result
      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      
      return result;

    } catch (error) {
      debugLogger.error('GoHighLevelService', 'Failed to get opportunities analytics', error);
      // Return empty result instead of throwing
      return {
        opportunities: [],
        totalOpportunities: 0,
        totalValue: 0,
        averageValue: 0,
        statusBreakdown: [],
        stageBreakdown: []
      };
    }
  }

  /**
   * Get all locations (subaccounts) for the agency
   */
  static async getAllLocations(): Promise<Array<{
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    phone: string;
    website: string;
    timezone: string;
    currency: string;
    status: string;
  }>> {
    try {
      // Use agency token for listing locations
      if (!this.agencyToken) {
        throw new Error('Agency token not set. Please set agency token for listing locations.');
      }

      // Agency-level token - use search endpoint with company ID
      const companyId = "WgNZ7xm35vYaZwflSov7"; // Your company ID
      const response: any = await this.makeApiRequest(`/locations/search?companyId=${companyId}`, {}, this.agencyToken);
      const locations = response.locations || [];
      
      debugLogger.info('GoHighLevelService', `Retrieved ${locations.length} locations with agency token`);
      
      return locations.map((location: any) => ({
        id: location.id,
        name: location.name,
        address: location.address,
        city: location.city,
        state: location.state,
        zipCode: location.postalCode || location.zipCode,
        country: location.country,
        phone: location.phone,
        website: location.website,
        timezone: location.timezone,
        currency: location.currency,
        status: location.status || 'active'
      }));

    } catch (error) {
      debugLogger.error('GoHighLevelService', 'Failed to get locations', error);
      throw error;
    }
  }

  /**
   * Check if service is connected
   */
  static isConnected(): boolean {
    return !!(this.accessToken && this.locationId);
  }
}