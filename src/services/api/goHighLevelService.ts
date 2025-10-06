import { debugLogger } from '@/lib/debug';
import { supabase } from '@/lib/supabase';

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

export class GoHighLevelService {
  private static readonly API_BASE_URL = 'https://services.leadconnectorhq.com';
  
  // Agency token for listing locations (scopes: locations.readonly, companies.readonly)
  private static agencyToken: string | null = null;
  
  // Location tokens for data access (scopes: contacts.readonly, opportunities.readonly, etc.)
  private static locationTokens: Map<string, string> = new Map();
  
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
   * Load agency token from database
   */
  private static async loadAgencyToken(): Promise<void> {
    try {
      console.log('🔍 GoHighLevelService: Loading agency token from database...');
      const { data, error } = await supabase
        .from('integrations')
        .select('config')
        .eq('platform', 'goHighLevel')
        .eq('connected', true)
        .single();

      console.log('🔍 GoHighLevelService: Database query result:', { data, error });

      if (error || !data?.config?.apiKey?.apiKey) {
        console.error('🔍 GoHighLevelService: No agency token found', error);
        debugLogger.error('GoHighLevelService', 'No agency token found', error);
        return;
      }

      this.agencyToken = data.config.apiKey.apiKey;
      console.log('🔍 GoHighLevelService: Agency token loaded successfully');
      debugLogger.info('GoHighLevelService', 'Loaded agency token');
    } catch (error) {
      console.error('🔍 GoHighLevelService: Error loading agency token:', error);
      debugLogger.error('GoHighLevelService', 'Error loading agency token', error);
    }
  }

  /**
   * Set agency token
   */
  static setAgencyToken(token: string): void {
    this.agencyToken = token;
    debugLogger.info('GoHighLevelService', 'Agency token set');
  }

  /**
   * Set credentials for OAuth flow
   */
  static setCredentials(accessToken: string, _refreshToken?: string): void {
    this.agencyToken = accessToken;
    debugLogger.info('GoHighLevelService', 'OAuth credentials set');
  }

  /**
   * Get account information
   */
  static async getAccountInfo(): Promise<GHLAccount> {
    await this.enforceRateLimit();
    
    if (!this.agencyToken) {
      throw new Error('Private integration token not set');
    }

    const response = await this.makeApiRequest('/accounts/me') as { account: GHLAccount };
    return response.account;
  }

  /**
   * Get campaigns
   */
  static async getCampaigns(locationId: string): Promise<GHLCampaign[]> {
    await this.enforceRateLimit();
    
    if (!this.agencyToken) {
      throw new Error('Private integration token not set');
    }

    const response = await this.makeApiRequest(`/campaigns/?locationId=${locationId}`) as { campaigns: GHLCampaign[] };
    return response.campaigns || [];
  }

  /**
   * Get OAuth authorization URL
   */
  static getAuthorizationUrl(clientId: string, redirectUri: string, scopes: string[] = []): string {
    const baseUrl = 'https://marketplace.leadconnectorhq.com/oauth/chooselocation';
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes.join(' ')
    });
    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  static async exchangeCodeForToken(code: string, clientId: string, clientSecret: string, redirectUri: string): Promise<{ access_token: string; refresh_token: string }> {
    const response = await fetch('https://services.leadconnectorhq.com/oauth/token', {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        },
      body: JSON.stringify({
          grant_type: 'authorization_code',
          code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri
        })
      });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Verify webhook signature
   */
  static verifyWebhookSignature(_payload: string, _signature: string, _secret: string): boolean {
    // Implementation depends on GHL webhook verification method
    // This is a placeholder - implement based on GHL documentation
    return true;
  }

  /**
   * Setup webhook
   */
  static async setupWebhook(locationId: string, webhookUrl: string, events: string[]): Promise<void> {
    await this.enforceRateLimit();
    
    if (!this.agencyToken) {
      throw new Error('Private integration token not set');
    }

    await this.makeApiRequest('/webhooks', {
      method: 'POST',
      body: JSON.stringify({
        locationId,
        url: webhookUrl,
        events
      })
    });
  }

  /**
   * Test agency private integration token and determine capabilities
   */
  static async testAgencyToken(token: string): Promise<{ 
    success: boolean; 
    message: string; 
    locations?: any[];
    capabilities?: {
      canListLocations: boolean;
      canAccessContacts: boolean;
      canAccessOpportunities: boolean;
      canAccessCalendars: boolean;
      canAccessFunnels: boolean;
    };
  }> {
    try {
      // Validate token format
      if (!token || !token.startsWith('pit-')) {
        throw new Error('Invalid token format. Private integration tokens should start with "pit-"');
      }

      const originalToken = this.agencyToken;
      this.agencyToken = token;
      
      const capabilities = {
        canListLocations: false,
        canAccessContacts: false,
        canAccessOpportunities: false,
        canAccessCalendars: false,
        canAccessFunnels: false
      };

      let locations: any[] = [];
      let testLocationId = '';

      // Test 1: Get locations (agency-level access)
      try {
        const locationsResponse = await fetch(`${this.API_BASE_URL}/locations/`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Version': '2021-07-28',
          }
        });

        if (locationsResponse.ok) {
          const data = await locationsResponse.json();
          locations = data.locations || [];
          capabilities.canListLocations = true;
          testLocationId = locations[0]?.id || '';
          debugLogger.info('GoHighLevelService', 'Agency token can list locations', { count: locations.length });
        }
    } catch (error) {
        debugLogger.warn('GoHighLevelService', 'Cannot list locations with agency token', error);
      }

      // Test 2: Try to access location-specific data (if we have a location ID)
      if (testLocationId) {
        // Test contacts
        try {
          const contactsResponse = await fetch(`${this.API_BASE_URL}/contacts/?locationId=${testLocationId}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Version': '2021-07-28',
            }
          });
          capabilities.canAccessContacts = contactsResponse.ok;
          debugLogger.info('GoHighLevelService', 'Contacts access test', { success: contactsResponse.ok });
        } catch (error) {
          debugLogger.warn('GoHighLevelService', 'Cannot access contacts', error);
        }

        // Test opportunities
        try {
          const opportunitiesResponse = await fetch(`${this.API_BASE_URL}/opportunities/?locationId=${testLocationId}`, {
            method: 'GET',
        headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Version': '2021-07-28',
            }
          });
          capabilities.canAccessOpportunities = opportunitiesResponse.ok;
          debugLogger.info('GoHighLevelService', 'Opportunities access test', { success: opportunitiesResponse.ok });
        } catch (error) {
          debugLogger.warn('GoHighLevelService', 'Cannot access opportunities', error);
        }

        // Test calendars
        try {
          const calendarsResponse = await fetch(`${this.API_BASE_URL}/calendars/?locationId=${testLocationId}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Version': '2021-07-28',
            }
          });
          capabilities.canAccessCalendars = calendarsResponse.ok;
          debugLogger.info('GoHighLevelService', 'Calendars access test', { success: calendarsResponse.ok });
        } catch (error) {
          debugLogger.warn('GoHighLevelService', 'Cannot access calendars', error);
        }

        // Test funnels
        try {
          const funnelsResponse = await fetch(`${this.API_BASE_URL}/funnels/?locationId=${testLocationId}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Version': '2021-07-28',
            }
          });
          capabilities.canAccessFunnels = funnelsResponse.ok;
          debugLogger.info('GoHighLevelService', 'Funnels access test', { success: funnelsResponse.ok });
        } catch (error) {
          debugLogger.warn('GoHighLevelService', 'Cannot access funnels', error);
        }
      }
      
      // Restore original token
      this.agencyToken = originalToken;
      
      const message = capabilities.canListLocations 
        ? `Agency token valid - found ${locations.length} locations. Capabilities: ${Object.entries(capabilities).filter(([_, v]) => v).map(([k]) => k).join(', ')}`
        : 'Agency token invalid or insufficient permissions';
      
      return {
        success: capabilities.canListLocations,
        message,
        locations,
        capabilities
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get company ID (we know it from testing)
   */
  static async getCompanyInfo(): Promise<{ companyId: string }> {
    // We know the company ID from our testing
    return { companyId: 'WgNZ7xm35vYaZwflSov7' };
  }

  /**
   * Get all locations (subaccounts) for the agency using correct endpoint
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
      console.log('🔍 GoHighLevelService: getAllLocations called');
      
      // Load agency token if not set
      if (!this.agencyToken) {
        console.log('🔍 GoHighLevelService: Agency token not set, loading...');
        await this.loadAgencyToken();
      }

      if (!this.agencyToken) {
        console.error('🔍 GoHighLevelService: Agency token not set after loading');
        throw new Error('Agency token not set. Please configure in admin settings.');
      }

      console.log('🔍 GoHighLevelService: Agency token is set, fetching locations...');
      debugLogger.info('GoHighLevelService', 'Fetching locations with agency token', { 
        hasToken: !!this.agencyToken,
        tokenPrefix: this.agencyToken.substring(0, 10) + '...'
      });

      // Get company ID first
      const { companyId } = await this.getCompanyInfo();
      console.log('🔍 GoHighLevelService: Company ID:', companyId);

      // Use correct endpoint with companyId parameter
      const url = `${this.API_BASE_URL}/locations/search?companyId=${companyId}&limit=100`;
      console.log('🔍 GoHighLevelService: Making API request to:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.agencyToken}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28',
        }
      });

      console.log('🔍 GoHighLevelService: API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔍 GoHighLevelService: API error:', response.status, errorText);
        debugLogger.error('GoHighLevelService', 'Failed to get locations', { 
          status: response.status, 
          statusText: response.statusText,
          errorText 
        });
        throw new Error(`Failed to get locations: ${response.statusText}`);
      }

      const data = await response.json();
      const locations = data.locations || [];
      
      console.log('🔍 GoHighLevelService: Retrieved locations:', locations.length);
      debugLogger.info('GoHighLevelService', `Retrieved ${locations.length} locations`, { 
        locations: locations.map(l => ({ id: l.id, name: l.name }))
      });
      
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
      console.error('🔍 GoHighLevelService: Error in getAllLocations:', error);
      debugLogger.error('GoHighLevelService', 'Failed to get locations', error);
      throw error;
    }
  }

  /**
   * Make authenticated API request using private integration token
   */
  private static async makeApiRequest<T>(
    endpoint: string,
    options: globalThis.RequestInit = {}
  ): Promise<T> {
    // Load token if not set
    if (!this.agencyToken) {
      await this.loadPrivateIntegrationToken();
    }
    
    if (!this.agencyToken) {
      throw new Error('Private integration token not set. Please configure in admin settings.');
    }

    // Enforce API rate limiting
    await this.enforceRateLimit();

    const url = `${this.API_BASE_URL}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.agencyToken}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28',
        ...options.headers
      }
    });

    if (!response.ok) {
      // Handle API specific error responses
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
            'Authorization': `Bearer ${this.agencyToken}`,
            'Version': '2021-07-28',
            'Content-Type': 'application/json',
            ...options.headers
          }
        });
        
        if (retryResponse.ok) {
          return await retryResponse.json();
        }
      }
      
      const errorData = await response.json().catch(() => ({}));
      debugLogger.error('GoHighLevelService', 'API request failed', {
        url,
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      
      // Provide more specific error messages
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
   * Get comprehensive GHL metrics for a specific location
   */
  static async getGHLMetrics(locationId: string, dateRange?: { start: string; end: string }): Promise<{
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
      const cacheKey = `ghl-metrics-${locationId}-${JSON.stringify(dateRange || {})}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        debugLogger.debug('GoHighLevelService', 'Using cached GHL metrics');
        return cached.data;
      }

      // Load token if not set
      if (!this.agencyToken) {
        await this.loadPrivateIntegrationToken();
      }

      if (!this.agencyToken) {
        throw new Error('Private integration token not set. Please configure in admin settings.');
      }

      console.log('🔍 GoHighLevelService: Attempting to fetch contacts for location:', locationId);

      // Get valid location token (with auto-refresh)
      const locationToken = await this.getValidToken(locationId);
      if (!locationToken) {
        throw new Error(`No location token found for location ${locationId}. Please connect the location via OAuth flow.`);
      }

      // Fetch contacts using the location token
      const allContacts = await this.getAllContacts(locationId, dateRange ? { startDate: dateRange.start, endDate: dateRange.end } : undefined);
      console.log('🔍 GoHighLevelService: Successfully fetched contacts:', allContacts.length);
      
      // Filter by date range if provided (fallback for client-side filtering)
      let filteredContacts = allContacts;
      if (dateRange) {
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
        if (!contact.customFields || contact.customFields.length === 0) {
          return false;
        }
        
        // Look for numeric values in custom fields (likely guest counts)
        return contact.customFields.some((field: any) => {
          const value = parseInt(field.value);
          return !isNaN(value) && value > 0 && value <= 500; // Reasonable guest count range
        });
      });
      
      const guestCounts = contactsWithGuests.map(contact => {
        if (!contact.customFields) {
        return 0;
      }
        
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
          debugLogger.warn('GoHighLevelService', `Suspicious guest count found: ${count} - skipping`);
          return sum;
        }
        return sum + count;
      }, 0);
      
      // Final safety check - if total is unreasonably high, return 0
      const finalTotalGuests = totalGuests > 10000 ? 0 : totalGuests;
      const averageGuestsPerLead = guestCounts.length > 0 ? finalTotalGuests / guestCounts.length : 0;
      
      // Debug logging
      if (finalTotalGuests > 1000) {
        debugLogger.warn('GoHighLevelService', `Suspicious total guest count: ${finalTotalGuests}`);
        debugLogger.warn('GoHighLevelService', `Guest counts found:`, guestCounts.slice(0, 10)); // Show first 10
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
   * Get contacts using Search Contacts endpoint (API 2.0)
   */
  static async getContacts(locationId: string, limit = 100, offset = 0): Promise<GHLContact[]> {
    try {
      // Load agency token if not set
      if (!this.agencyToken) {
        await this.loadAgencyToken();
      }

      if (!this.agencyToken) {
        throw new Error('Agency token not set. Please configure in admin settings.');
      }

      // Use Search Contacts endpoint with agency token and location ID
      const searchBody = {
        locationId: locationId,
        limit: limit,
        offset: offset,
        query: {} // Empty query to get all contacts
      };
      
      const response = await fetch(`${this.API_BASE_URL}/contacts/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.agencyToken}`,
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
   * Search contacts using the recommended Search Contacts endpoint (API 2.0)
   */
  private static async getAllContacts(locationId: string, dateParams?: { startDate?: string; endDate?: string }): Promise<any[]> {
    const allContacts = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      // Enforce API 2.0 rate limiting
      await this.enforceRateLimit();
      
      // Get location token for this specific location
      const locationToken = this.locationTokens.get(locationId);
      if (!locationToken) {
        console.log('🔍 GoHighLevelService: No location token found for location:', locationId);
        throw new Error(`No location token found for location ${locationId}. Please configure location-level token.`);
      }
      
      // Use the recommended Search Contacts endpoint with date filtering
      const searchBody = {
        locationId: locationId,
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
          'Authorization': `Bearer ${this.agencyToken}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        debugLogger.error('GoHighLevelService', `Failed to search contacts: ${response.statusText}`, errorText);
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
        debugLogger.warn('GoHighLevelService', 'Reached safety limit for contact search');
        break;
      }
    }

    debugLogger.info('GoHighLevelService', `Retrieved ${allContacts.length} contacts using Search Contacts endpoint`);
    return allContacts;
  }

  /**
   * Get funnel analytics data
   */
  static async getFunnelAnalytics(locationId: string, dateRange?: { start: string; end: string }): Promise<{
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
      const cacheKey = `ghl-funnels-${locationId}-${JSON.stringify(dateRange || {})}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        debugLogger.debug('GoHighLevelService', 'Using cached funnel analytics');
        return cached.data;
      }

      // Load token if not set
      if (!this.agencyToken) {
        await this.loadPrivateIntegrationToken();
      }

      if (!this.agencyToken) {
        throw new Error('Private integration token not set. Please configure in admin settings.');
      }

      // Get funnels - corrected for subaccount/location level
      const funnelsResponse: any = await this.makeApiRequest(`/funnels/?locationId=${locationId}`);
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
  static async getPageAnalytics(locationId: string, dateRange?: { start: string; end: string }): Promise<{
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
      const cacheKey = `ghl-pages-${locationId}-${JSON.stringify(dateRange || {})}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        debugLogger.debug('GoHighLevelService', 'Using cached page analytics');
        return cached.data;
      }

      // Load token if not set
      if (!this.agencyToken) {
        await this.loadPrivateIntegrationToken();
      }

      if (!this.agencyToken) {
        throw new Error('Private integration token not set. Please configure in admin settings.');
      }

      // Get pages - corrected for subaccount/location level
      const pagesResponse: any = await this.makeApiRequest(`/pages/?locationId=${locationId}`);
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
   * Get calendar analytics data
   */
  static async getCalendarAnalytics(locationId: string, dateRange?: { start: string; end: string }): Promise<{
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
      const cacheKey = `ghl-calendars-${locationId}-${JSON.stringify(dateRange || {})}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        debugLogger.debug('GoHighLevelService', 'Using cached calendar analytics');
        return cached.data;
      }

      // Load token if not set
      if (!this.agencyToken) {
        await this.loadPrivateIntegrationToken();
      }

      if (!this.agencyToken) {
        throw new Error('Private integration token not set. Please configure in admin settings.');
      }

      // Get calendars
      // Build URL with date filtering (server-side filtering for better performance)
      let url = `/calendars/?locationId=${locationId}`;
      if (dateRange?.start) { url += `&startDate=${dateRange.start}`; }
      if (dateRange?.end) { url += `&endDate=${dateRange.end}`; }
      
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
  static async getOpportunitiesAnalytics(locationId: string, dateRange?: { start: string; end: string }): Promise<{
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
      const cacheKey = `ghl-opportunities-${locationId}-${JSON.stringify(dateRange || {})}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        debugLogger.debug('GoHighLevelService', 'Using cached opportunities analytics');
        return cached.data;
      }

      // Load token if not set
      if (!this.agencyToken) {
        await this.loadPrivateIntegrationToken();
      }

      if (!this.agencyToken) {
        throw new Error('Private integration token not set. Please configure in admin settings.');
      }

      // Build URL with date filtering (server-side filtering for better performance)
      let url = `/opportunities/?locationId=${locationId}`;
      if (dateRange?.start) { url += `&startDate=${dateRange.start}`; }
      if (dateRange?.end) { url += `&endDate=${dateRange.end}`; }
      
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
   * Load private integration token from database
   */
  private static async loadPrivateIntegrationToken(): Promise<void> {
    try {
      console.log('🔍 GoHighLevelService: Loading private integration token from database...');
      const { data, error } = await supabase
        .from('integrations')
        .select('config')
        .eq('platform', 'goHighLevel')
        .eq('connected', true)
        .single();

      console.log('🔍 GoHighLevelService: Database query result:', { data, error });

      if (error || !data?.config?.apiKey?.apiKey) {
        console.error('🔍 GoHighLevelService: No private integration token found', error);
        debugLogger.error('GoHighLevelService', 'No private integration token found', error);
        return;
      }

      this.agencyToken = data.config.apiKey.apiKey;
      console.log('🔍 GoHighLevelService: Agency token loaded successfully');
      debugLogger.info('GoHighLevelService', 'Loaded agency token');
    } catch (error) {
      console.error('🔍 GoHighLevelService: Error loading private integration token:', error);
      debugLogger.error('GoHighLevelService', 'Error loading private integration token', error);
    }
  }

  /**
   * Set location token for a specific location
   */
  static setLocationToken(locationId: string, token: string): void {
    this.locationTokens.set(locationId, token);
    console.log('🔍 GoHighLevelService: Set location token for:', locationId);
  }

  /**
   * Set location token for Magnolia Terrace (temporary method for testing)
   */
  static setMagnoliaTerraceToken(token: string): void {
    this.setLocationToken('V7bzEjKiigXzh8r6sQq0', token);
    console.log('🔍 GoHighLevelService: Set Magnolia Terrace location token');
  }

  /**
   * Generate location token from agency token
   */
  static async generateLocationToken(locationId: string): Promise<string | null> {
    try {
      console.log('🔍 GoHighLevelService: Generating location token for:', locationId);
      
      // Load agency token if not set
      if (!this.agencyToken) {
        await this.loadPrivateIntegrationToken();
      }

      if (!this.agencyToken) {
        throw new Error('Agency token not set. Please configure in admin settings.');
      }

      // Get company ID from the agency token (we know it's WgNZ7xm35vYaZwflSov7 from our tests)
      const companyId = 'WgNZ7xm35vYaZwflSov7';

      const response = await fetch(`${this.API_BASE_URL}/oauth/locationToken`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.agencyToken}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          companyId: companyId,
          locationId: locationId
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔍 GoHighLevelService: Failed to generate location token:', response.status, errorText);
        throw new Error(`Failed to generate location token: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      const locationToken = data.access_token;
      
      this.setLocationToken(locationId, locationToken);
      console.log('🔍 GoHighLevelService: Location token generated successfully for:', locationId);
      
      return locationToken;
    } catch (error) {
      console.error('🔍 GoHighLevelService: Error generating location token:', error);
      return null;
    }
  }

  /**
   * Load location token from database for a specific client
   */
  private static async loadLocationToken(locationId: string): Promise<string | null> {
    try {
      console.log('🔍 GoHighLevelService: Loading location token for:', locationId);
      
      // First, find the client that has this location ID
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id, name, accounts')
        .eq('accounts->goHighLevel', locationId)
        .single();

      if (clientError || !clientData) {
        console.error('🔍 GoHighLevelService: Client not found for location:', locationId, clientError);
        return null;
      }

      console.log('🔍 GoHighLevelService: Found client:', clientData.name);

      // Look for location-specific integration token in the integrations table
      const { data: integrationData, error: integrationError } = await supabase
        .from('integrations')
        .select('config')
        .eq('platform', 'goHighLevel')
        .eq('account_id', locationId) // Use locationId as account_id for location-specific tokens
        .eq('connected', true)
        .single();

      if (integrationError || !integrationData?.config?.apiKey?.apiKey) {
        console.error('🔍 GoHighLevelService: No location-specific token found for client:', clientData.name, integrationError);
        console.error('🔍 GoHighLevelService: Please create a location-level integration token for this client in GoHighLevel');
        console.error('🔍 GoHighLevelService: Required scopes: contacts.readonly, opportunities.readonly, calendars.readonly');
        return null;
      }

      const locationToken = integrationData.config.apiKey.apiKey;
      this.setLocationToken(locationId, locationToken);
      console.log('🔍 GoHighLevelService: Location token loaded successfully for:', clientData.name);
      
      return locationToken;
    } catch (error) {
      console.error('🔍 GoHighLevelService: Error loading location token:', error);
      return null;
    }
  }

  /**
   * Save location token to database for a specific client
   */
  static async saveLocationToken(locationId: string, token: string, scopes: string[]): Promise<boolean> {
    try {
      console.log('🔍 GoHighLevelService: Saving location token for:', locationId);
      
      // Find the client that has this location ID
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id, name, accounts')
        .eq('accounts->goHighLevel', locationId)
        .single();

      if (clientError || !clientData) {
        console.error('🔍 GoHighLevelService: Client not found for location:', locationId, clientError);
        return false;
      }

      // Save the location token to the integrations table
      const { error: saveError } = await supabase
        .from('integrations')
        .upsert({
          platform: 'goHighLevel',
          account_id: locationId,
          account_name: clientData.name,
          connected: true,
          config: {
            apiKey: {
              apiKey: token,
              keyType: 'bearer'
            },
            scopes: scopes,
            locationId: locationId,
            lastSync: new Date().toISOString(),
            connectedAt: new Date().toISOString()
          }
        });

      if (saveError) {
        console.error('🔍 GoHighLevelService: Error saving location token:', saveError);
        return false;
      }

      this.setLocationToken(locationId, token);
      console.log('🔍 GoHighLevelService: Location token saved successfully for:', clientData.name);
      return true;
    } catch (error) {
      console.error('🔍 GoHighLevelService: Error saving location token:', error);
      return false;
    }
  }

  /**
   * Get valid token for a location (with auto-refresh)
   */
  static async getValidToken(locationId: string): Promise<string | null> {
    try {
      // Get token from database
      const { data: integrationData, error } = await supabase
        .from('integrations')
        .select('config')
        .eq('platform', 'goHighLevel')
        .eq('account_id', locationId)
        .eq('connected', true)
        .single();

      if (error || !integrationData?.config?.apiKey?.apiKey) {
        console.error('🔍 GoHighLevelService: No token found for location:', locationId);
        return null;
      }

      const config = integrationData.config;
      const token = config.apiKey.apiKey;
      const expiresAt = config.expiresAt ? new Date(config.expiresAt) : null;
      const refreshToken = config.refreshToken;

      // Check if token is expired or expiring soon (within 1 hour)
      const isExpiringSoon = expiresAt && expiresAt < new Date(Date.now() + 3600000);

      if (isExpiringSoon && refreshToken) {
        console.log('🔍 GoHighLevelService: Token expiring soon, refreshing...');
        
        try {
          // Refresh the token
          const refreshResponse = await fetch(
            'https://services.leadconnectorhq.com/oauth/token',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              body: new URLSearchParams({
                client_id: process.env.VITE_GHL_CLIENT_ID || process.env.GHL_CLIENT_ID!,
                client_secret: process.env.VITE_GHL_CLIENT_SECRET || process.env.GHL_CLIENT_SECRET!,
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
                user_type: 'Location'
              })
            }
          );

          const newTokenData = await refreshResponse.json();

          if (!refreshResponse.ok) {
            console.error('🔍 GoHighLevelService: Token refresh failed:', newTokenData);
            throw new Error('Token refresh failed - user needs to reconnect');
          }

          // Update database with new token
          await supabase
            .from('integrations')
            .update({
              config: {
                ...config,
                apiKey: {
                  apiKey: newTokenData.access_token,
                  keyType: 'bearer'
                },
                refreshToken: newTokenData.refresh_token,
                expiresIn: newTokenData.expires_in,
                expiresAt: new Date(Date.now() + newTokenData.expires_in * 1000).toISOString(),
                lastSync: new Date().toISOString()
              }
            })
            .eq('platform', 'goHighLevel')
            .eq('account_id', locationId);

          this.setLocationToken(locationId, newTokenData.access_token);
          console.log('🔍 GoHighLevelService: Token refreshed successfully');
          return newTokenData.access_token;
        } catch (refreshError) {
          console.error('🔍 GoHighLevelService: Token refresh error:', refreshError);
          // Return the old token as fallback
          return token;
        }
      }

      // Token is still valid
      this.setLocationToken(locationId, token);
      return token;
    } catch (error) {
      console.error('🔍 GoHighLevelService: Error getting valid token:', error);
      return null;
    }
  }

}