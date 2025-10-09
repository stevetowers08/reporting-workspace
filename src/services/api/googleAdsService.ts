import { debugLogger } from '@/lib/debug';
import { TokenManager } from '@/services/auth/TokenManager';

export interface GoogleAdsAccount {
  id: string;
  name: string;
  status: string;
  currency: string;
  timezone: string;
}

export class GoogleAdsService {
  /**
   * Normalize customer ID by removing all non-digit characters
   */
  private static normalizeCid(id: string | number): string {
    return String(id).replace(/\D/g, '');
  }

  /**
   * Parse Google Ads searchStream response with tolerant parsing
   * Handles both single JSON arrays and NDJSON streams
   */
  private static parseSearchStreamText(text: string): unknown[] {
    const trimmed = (text ?? "").trim();
    if (!trimmed) return [];

    // 1) Try single JSON (array/object)
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      // fall through to NDJSON parsing
    }

    // 2) NDJSON tolerant: accumulate until JSON.parse succeeds
    const out: unknown[] = [];
    let buf = "";
    for (const rawLine of trimmed.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line) continue;
      buf += line;
      try {
        out.push(JSON.parse(buf));
        buf = "";
      } catch {
        // keep buffering until we have a complete JSON object
      }
    }

    if (buf.trim().length > 0) {
      // As a last resort, try treating each newline-separated chunk as a JSON element of an array
      try {
        const asArray = `[${trimmed.split(/\r?\n/).filter(Boolean).join(",")}]`;
        const parsed = JSON.parse(asArray);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch (e) {
        debugLogger.error('GoogleAdsService', `Unable to parse searchStream payload. First 200 chars: ${trimmed.slice(0, 200)}`);
        return [];
      }
    }

    return out;
  }

  /**
   * Preview payload for logging (avoids flooding and redacting tokens)
   */
  private static previewPayload(s: string, len = 512): string {
    const t = (s ?? "");
    if (t.length <= len * 2) return t;
    return `${t.slice(0, len)} ... [${t.length - len * 2} bytes omitted] ... ${t.slice(-len)}`;
  }

  /**
   * Generic Google Ads searchStream helper following the exact pattern
   */
  private static async adsSearchStream({
    accessToken,
    developerToken,
    customerId,
    managerId,
    gaql
  }: {
    accessToken: string;
    developerToken: string;
    customerId: string | number;
    managerId?: string | number;
    gaql: string;
  }): Promise<unknown[]> {
    const pathCid = this.normalizeCid(customerId);
    const loginCid = managerId ? this.normalizeCid(managerId) : undefined;

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,
      'developer-token': developerToken,
      'Content-Type': 'application/json'
    };
    if (loginCid) {
      headers['login-customer-id'] = loginCid;
    }

    const url = `https://googleads.googleapis.com/v21/customers/${pathCid}/googleAds:searchStream`;
    

    const resp = await globalThis.fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: gaql })
    });

    const text = await resp.text();
    if (!resp.ok) {
      throw new Error(`Google Ads API ${resp.status}: ${text}`);
    }
    
    debugLogger.debug('GoogleAdsService', `searchStream raw preview: ${this.previewPayload(text)}`);
    const blocks = this.parseSearchStreamText(text);
    debugLogger.debug('GoogleAdsService', `Parsed ${blocks.length} blocks from searchStream`);
    
    return blocks;
  }

  /**
   * Get Google Ads accounts - handles both single accounts and manager accounts with sub-accounts
   */
  static async getAdAccounts(): Promise<GoogleAdsAccount[]> {
    debugLogger.debug('GoogleAdsService', 'Getting Google Ads accounts');

    try {
      const accessToken = await this.ensureValidToken();
      const developerToken = this.getDeveloperToken();

      if (!accessToken || !developerToken) {
        debugLogger.warn('GoogleAdsService', 'No valid tokens available');
        return [];
      }

      const managerAccountId = await this.getManagerAccountId();
      if (!managerAccountId) {
        debugLogger.warn('GoogleAdsService', 'No manager account ID available');
        return [];
      }

      // Listing accounts under a manager - use manager in both path and login-customer-id
      const gaql = `
        SELECT 
          customer_client.id, 
          customer_client.descriptive_name, 
          customer_client.status, 
          customer_client.manager, 
          customer_client.level 
        FROM customer_client
      `;

      debugLogger.debug('GoogleAdsService', `Querying customer_client with searchStream: ${gaql}`);

      const blocks = await this.adsSearchStream({
        accessToken,
        developerToken,
        customerId: managerAccountId, // manager in path
        managerId: managerAccountId, // manager in login header
        gaql
      });

      const accounts: GoogleAdsAccount[] = [];
      const seenAccountIds = new Set<string>();

      // Parse results following the exact pattern
      for (const b of blocks) {
        const blockData = b as { results?: unknown[] };
        for (const r of blockData.results ?? []) {
          const result = r as { customerClient?: { id?: string; descriptiveName?: string; manager?: boolean; status?: string } };
          const cc = result.customerClient;
          if (!cc?.id) {
            continue;
          }
          
          const id = this.normalizeCid(cc.id);
          if (seenAccountIds.has(id)) {
            continue;
          }
          
          seenAccountIds.add(id);
          
          accounts.push({
            id,
            name: cc.descriptiveName ?? `Ad Account ${id}`,
            status: (cc.status ?? 'ENABLED').toLowerCase(),
            currency: 'USD', // TODO: Replace with real values from customer query
            timezone: 'UTC' // TODO: Replace with real values from customer query
          });

          debugLogger.debug('GoogleAdsService', `✅ Added account: ${cc.descriptiveName ?? `Ad Account ${id}`} (${id}) - Manager: ${!!cc.manager}`);
        }
      }

      debugLogger.debug('GoogleAdsService', `✅ Successfully found ${accounts.length} Google Ads accounts`);
      return accounts;

    } catch (error) {
      debugLogger.error('GoogleAdsService', 'Error getting Google Ads accounts', error);
      return [];
    }
  }

  /**
   * Ensure we have a valid access token
   */
  private static async ensureValidToken(): Promise<string | null> {
    try {
      const accessToken = await TokenManager.getAccessToken('googleAds');
      if (!accessToken) {
        debugLogger.warn('GoogleAdsService', 'No access token available');
        return null;
      }

      debugLogger.debug('GoogleAdsService', 'Valid access token obtained');
      return accessToken;

    } catch (error) {
      debugLogger.error('GoogleAdsService', 'Failed to ensure valid token', error);
      return null;
    }
  }

  /**
   * Get developer token from environment
   */
  private static getDeveloperToken(): string | null {
    const token = import.meta.env.VITE_GOOGLE_ADS_DEVELOPER_TOKEN;
    if (!token) {
      debugLogger.warn('GoogleAdsService', 'No developer token found in environment');
      return null;
    }
    debugLogger.debug('GoogleAdsService', 'Developer token retrieved', { hasToken: !!token, tokenLength: token.length });
    return token;
  }

  /**
   * Retrieves the manager account ID from Supabase.
   * This ID is used as the login-customer-id header for all Google Ads API requests.
   */
  private static async getManagerAccountId(): Promise<string | null> {
    try {
      const { supabase } = await import('@/lib/supabase');
      
      const { data: integration, error } = await supabase
        .from('integrations')
        .select('account_id')
        .eq('platform', 'googleAds')
        .eq('connected', true)
        .single();

      if (error || !integration?.account_id) {
        debugLogger.warn('GoogleAdsService', 'No manager account ID found in integration data');
        // Try to auto-discover and persist the correct manager account ID
        try {
          const { GoogleAdsAccountDiscovery } = await import('@/services/api/googleAdsAccountDiscovery');
          const discovered = await GoogleAdsAccountDiscovery.discoverAndStoreManagerAccount();
          if (discovered) {
            const normalized = this.normalizeCid(discovered);
            debugLogger.debug('GoogleAdsService', `Discovered manager ID: ${normalized}`);
            return normalized || null;
          }
        } catch (discoverErr) {
          debugLogger.error('GoogleAdsService', 'Auto-discovery failed while recovering missing manager ID', discoverErr);
        }
        return null;
      }

      // Clean up "Optional[...]" wrapper if present
      const longManagerId = String(integration.account_id)
        .replace(/^Optional\[/, '')
        .replace(/\]$/, '')
        .trim();

      // Normalize to digits and validate
      const normalizedId = this.normalizeCid(longManagerId);
      debugLogger.debug('GoogleAdsService', `Manager ID from database (cleaned): ${longManagerId}`);

      if (!normalizedId || normalizedId.length < 10) {
        debugLogger.warn('GoogleAdsService', `Invalid manager ID stored: "${longManagerId}" → normalized: "${normalizedId}". Attempting auto-discovery.`);
        try {
          const { GoogleAdsAccountDiscovery } = await import('@/services/api/googleAdsAccountDiscovery');
          const discovered = await GoogleAdsAccountDiscovery.discoverAndStoreManagerAccount();
          if (discovered) {
            const fixed = this.normalizeCid(discovered);
            if (fixed) {
              debugLogger.debug('GoogleAdsService', `Auto-fixed manager ID to: ${fixed}`);
              return fixed;
            }
          }
        } catch (discoverErr) {
          debugLogger.error('GoogleAdsService', 'Auto-discovery failed while fixing invalid manager ID', discoverErr);
        }
        return null;
      }

      return normalizedId;
    } catch (error) {
      debugLogger.error('GoogleAdsService', 'Failed to get manager account ID', error);
      return null;
    }
  }

  /**
   * Get account metrics for reporting
   */
  static async getAccountMetrics(customerId: string, dateRange: { start: string; end: string }): Promise<{
    impressions: number;
    clicks: number;
    cost: number;
    leads: number;
    ctr: number;
    averageCpc: number;
    conversions: number;
  }> {
    try {
      debugLogger.debug('GoogleAdsService', 'Getting account metrics', { customerId, dateRange });
      
      const accessToken = await this.ensureValidToken();
      const developerToken = this.getDeveloperToken();

      if (!accessToken || !developerToken) {
        debugLogger.warn('GoogleAdsService', 'No valid tokens available for metrics');
        return this.getEmptyMetrics();
      }

      const managerAccountId = await this.getManagerAccountId();
      if (!managerAccountId) {
        debugLogger.warn('GoogleAdsService', 'No manager account ID available for metrics');
        return this.getEmptyMetrics();
      }

      debugLogger.debug('GoogleAdsService', 'Account access details', {
        targetCustomerId: customerId,
        managerAccountId: managerAccountId,
        normalizedCustomerId: this.normalizeCid(customerId),
        normalizedManagerId: this.normalizeCid(managerAccountId)
      });

      // Reporting on a single customer (with MCC) - use customer ID in path, manager ID in login-customer-id
      const gaql = `
        SELECT 
          metrics.conversions,
          metrics.cost_micros,
          metrics.impressions,
          metrics.clicks
        FROM customer 
        WHERE segments.date BETWEEN '${dateRange.start}' AND '${dateRange.end}'
      `;

      debugLogger.debug('GoogleAdsService', 'Calling adsSearchStream with:', {
        customerId: customerId,
        managerId: managerAccountId,
        gaql: gaql.trim()
      });

      const blocks = await this.adsSearchStream({
        accessToken,
        developerToken,
        customerId: customerId, // advertiser id from DB
        managerId: managerAccountId, // manager id from DB
        gaql
      });

      // Aggregate following the exact pattern
      let impressions = 0, clicks = 0, costMicros = 0, conversions = 0;
      for (const b of blocks) {
        const blockData = b as { results?: unknown[] };
        for (const r of blockData.results ?? []) {
          const result = r as { metrics?: { impressions?: string | number; clicks?: string | number; costMicros?: string | number; conversions?: string | number } };
          const m = result.metrics ?? {};
          impressions += Number(m.impressions ?? 0);
          clicks += Number(m.clicks ?? 0);
          costMicros += Number(m.costMicros ?? 0);
          conversions += Number(m.conversions ?? 0);
        }
      }

      const cost = costMicros / 1e6;
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      const averageCpc = clicks > 0 ? (costMicros / clicks) / 1e6 : 0;

      const metrics = {
        impressions,
        clicks,
        cost,
        leads: conversions,
        ctr,
        averageCpc,
        conversions
      };

      debugLogger.debug('GoogleAdsService', 'Account metrics calculated', metrics);
      return metrics;

    } catch (error) {
      debugLogger.error('GoogleAdsService', 'Error getting account metrics', error);
      return this.getEmptyMetrics();
    }
  }

  /**
   * Get conversion actions for a customer
   */
  static async getConversionActions(customerId: string): Promise<Array<{
    id: string;
    name: string;
    status: string;
    type: string;
  }>> {
    try {
      debugLogger.debug('GoogleAdsService', 'Getting conversion actions', { customerId });
      
      const accessToken = await this.ensureValidToken();
      const developerToken = this.getDeveloperToken();

      if (!accessToken || !developerToken) {
        debugLogger.warn('GoogleAdsService', 'No valid tokens available for conversion actions');
        return [];
      }

      const managerAccountId = await this.getManagerAccountId();
      if (!managerAccountId) {
        debugLogger.warn('GoogleAdsService', 'No manager account ID available for conversion actions');
        return [];
      }

      // Getting conversion actions for a customer - scope is per customer, not manager
      const gaql = `
        SELECT 
          conversion_action.id,
          conversion_action.name,
          conversion_action.status,
          conversion_action.type
        FROM conversion_action
        WHERE conversion_action.status = ENABLED
      `;

      const blocks = await this.adsSearchStream({
        accessToken,
        developerToken,
        customerId: customerId, // customer account
        managerId: managerAccountId, // include if going via MCC
        gaql
      });

      const actions: Array<{
        id: string;
        name: string;
        status: string;
        type: string;
      }> = [];

      for (const b of blocks) {
        const blockData = b as { results?: unknown[] };
        for (const r of blockData.results ?? []) {
          const result = r as { conversionAction?: { id?: string | number; name?: string; status?: string; type?: string } };
          const ca = result.conversionAction;
          if (!ca) {
            continue;
          }
          
          actions.push({
            id: String(ca.id),
            name: ca.name ?? '',
            status: ca.status ?? '',
            type: ca.type ?? ''
          });
        }
      }

      debugLogger.debug('GoogleAdsService', `Found ${actions.length} conversion actions`);
      return actions;

    } catch (error) {
      debugLogger.error('GoogleAdsService', 'Error getting conversion actions', error);
      return [];
    }
  }

  /**
   * Test connection to Google Ads API
   */
  static async testConnection(): Promise<{ success: boolean; error?: string; accountInfo?: {
    managerAccountId: string;
    hasAccessToken: boolean;
    hasDeveloperToken: boolean;
  } }> {
    try {
      debugLogger.debug('GoogleAdsService', 'Testing connection');
      
    const accessToken = await this.ensureValidToken();
    const developerToken = this.getDeveloperToken();

      if (!accessToken || !developerToken) {
        return {
          success: false,
          error: 'Missing access token or developer token'
        };
      }

      const managerAccountId = await this.getManagerAccountId();
      if (!managerAccountId) {
        return {
          success: false,
          error: 'No manager account ID found'
        };
      }

      // Normalize customer IDs
      const pathCid = this.normalizeCid(managerAccountId);
      const loginCid = pathCid;

      // Test with a simple query
      const query = `
        SELECT customer.id, customer.descriptive_name
        FROM customer 
        LIMIT 1
      `;

      const response = await globalThis.fetch(`https://googleads.googleapis.com/v21/customers/${pathCid}/googleAds:searchStream`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': developerToken,
          'login-customer-id': loginCid,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `API request failed: ${response.status} - ${errorText}`
        };
      }

      debugLogger.debug('GoogleAdsService', 'Connection test successful');
      return {
        success: true,
        accountInfo: {
          managerAccountId,
          hasAccessToken: !!accessToken,
          hasDeveloperToken: !!developerToken
        }
      };

    } catch (error) {
      debugLogger.error('GoogleAdsService', 'Connection test failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Authenticate with Google Ads API
   */
  static async authenticate(accessToken?: string): Promise<boolean> {
    try {
      debugLogger.debug('GoogleAdsService', 'Authenticating');
      
      const token = accessToken || await TokenManager.getAccessToken('googleAds');
      if (!token) {
        debugLogger.warn('GoogleAdsService', 'No access token available for authentication');
        return false;
      }

    const developerToken = this.getDeveloperToken();
      if (!developerToken) {
        debugLogger.warn('GoogleAdsService', 'No developer token available for authentication');
        return false;
      }

      // Test authentication with a simple API call
      const testResult = await this.testConnection();
      
      if (testResult.success) {
        debugLogger.debug('GoogleAdsService', 'Authentication successful');
        return true;
      } else {
        debugLogger.warn('GoogleAdsService', 'Authentication failed', testResult.error);
        return false;
      }

    } catch (error) {
      debugLogger.error('GoogleAdsService', 'Authentication error', error);
      return false;
    }
  }

  /**
   * Get empty metrics structure
   */
  private static getEmptyMetrics() {
    return {
      impressions: 0,
      clicks: 0,
      cost: 0,
      leads: 0,
      ctr: 0,
      averageCpc: 0,
      conversions: 0
    };
  }
}