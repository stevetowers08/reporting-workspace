import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Simple cache implementation for Edge Function
class SimpleCache {
  private static cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private static readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  static get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data as T;
  }

  static set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  static invalidate(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface GoogleAdsAccount {
  id: string;
  name: string;
  currency: string;
  timezone: string;
  descriptiveName: string;
}

// Google Ads API v17 Rate Limiting Configuration
const RATE_LIMITS = {
  // Daily limit: 15,000 operations per developer token (searches/reports combined)
  daily: { operations: 15000, window: 24 * 60 * 60 * 1000 },
  // QPS limit: 5 requests per second per token, bucketed by customer ID
  qps: { requests: 5, window: 1000 },
  // Reports limit: 1,000 reports per hour (conservative estimate)
  reports: { requests: 1000, window: 60 * 60 * 1000 }
};

// Rate limiting state
const dailyUsage = new Map<string, { count: number; resetTime: number }>();
const qpsUsage = new Map<string, { count: number; resetTime: number }>();
const reportsUsage = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(customerId?: string): boolean {
  const now = Date.now();
  const developerToken = 'default'; // In production, use actual developer token

  // Check daily limit
  const dailyKey = developerToken;
  const dailyUsageData = dailyUsage.get(dailyKey);
  
  if (!dailyUsageData || now > dailyUsageData.resetTime) {
    dailyUsage.set(dailyKey, { count: 1, resetTime: now + RATE_LIMITS.daily.window });
  } else if (dailyUsageData.count >= RATE_LIMITS.daily.operations) {
    console.warn('Daily rate limit exceeded:', {
      dailyUsage: dailyUsageData.count,
      limit: RATE_LIMITS.daily.operations
    });
    return false;
  } else {
    dailyUsageData.count++;
  }

  // Check QPS limit (per customer ID)
  if (customerId) {
    const qpsKey = `${developerToken}:${customerId}`;
    const qpsUsageData = qpsUsage.get(qpsKey);
    
    if (!qpsUsageData || now > qpsUsageData.resetTime) {
      qpsUsage.set(qpsKey, { count: 1, resetTime: now + RATE_LIMITS.qps.window });
    } else if (qpsUsageData.count >= RATE_LIMITS.qps.requests) {
      console.warn('QPS rate limit exceeded:', {
        customerId,
        qpsUsage: qpsUsageData.count,
        limit: RATE_LIMITS.qps.requests
      });
      return false;
    } else {
      qpsUsageData.count++;
    }
  }

  // Check reports limit
  const reportsKey = developerToken;
  const reportsUsageData = reportsUsage.get(reportsKey);
  
  if (!reportsUsageData || now > reportsUsageData.resetTime) {
    reportsUsage.set(reportsKey, { count: 1, resetTime: now + RATE_LIMITS.reports.window });
  } else if (reportsUsageData.count >= RATE_LIMITS.reports.requests) {
    console.warn('Reports rate limit exceeded:', {
      reportsUsage: reportsUsageData.count,
      limit: RATE_LIMITS.reports.requests
    });
    return false;
  } else {
    reportsUsageData.count++;
  }

  return true;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const url = new URL(req.url);
    const method = req.method;
    const pathSegments = url.pathname.split('/').filter(Boolean);
    
    console.log('Path segments:', pathSegments);
    console.log('Full URL:', req.url);
    console.log('Path segments length:', pathSegments.length);
    console.log('All path segments:', JSON.stringify(pathSegments));
    
    // Extract action from path: /functions/v1/google-ads-api/{action}
    // The path segments should be: ['functions', 'v1', 'google-ads-api', 'accounts']
    // So we want the last segment
    const action = pathSegments[pathSegments.length - 1];
    
    // Debug: log what we're getting
    console.log('Path segments:', pathSegments);
    console.log('Action extracted:', action);
    
    // Handle the case where action might be undefined
    if (!action) {
      return new Response(
        JSON.stringify({ error: 'No action specified in URL path' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    switch (action) {
      case 'accounts':
        // Check rate limit
        if (!checkRateLimit()) {
          return new Response(
            JSON.stringify({ error: 'Rate limit exceeded for accounts endpoint' }),
            { 
              status: 429, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        return await handleGetAccounts(supabaseClient);
      
      case 'campaigns':
        const customerId = url.searchParams.get('customerId');
        if (!customerId) {
          return new Response(
            JSON.stringify({ error: 'customerId parameter is required' }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        // Check rate limit
        if (!checkRateLimit(customerId)) {
          return new Response(
            JSON.stringify({ error: 'Rate limit exceeded for campaigns endpoint' }),
            { 
              status: 429, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        return await handleGetCampaigns(supabaseClient, customerId);
      
      case 'campaign-performance':
        const performanceCustomerId = url.searchParams.get('customerId');
        const dateRange = url.searchParams.get('dateRange') || 'LAST_30_DAYS';
        if (!performanceCustomerId) {
          return new Response(
            JSON.stringify({ error: 'customerId parameter is required' }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        // Check rate limit
        if (!checkRateLimit(performanceCustomerId)) {
          return new Response(
            JSON.stringify({ error: 'Rate limit exceeded for campaign performance endpoint' }),
            { 
              status: 429, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        return await handleGetCampaignPerformance(supabaseClient, performanceCustomerId, dateRange);
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action. Supported actions: accounts, campaigns, campaign-performance' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
    }
  } catch (error) {
    console.error('Google Ads API Edge Function Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function handleGetAccounts(supabaseClient: any) {
  try {
    // Check cache first
    const cacheKey = 'google-ads-accounts';
    const cachedAccounts = SimpleCache.get(cacheKey);
    
    if (cachedAccounts) {
      console.log('Cache hit for accounts');
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: cachedAccounts,
          cached: true
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Cache miss for accounts, fetching from API');
    
    // Get Google Ads integration tokens
    const { data: integration, error } = await supabaseClient
      .from('integrations')
      .select('config')
      .eq('platform', 'googleAds')
      .eq('connected', true)
      .single();

    if (error || !integration) {
      return new Response(
        JSON.stringify({ error: 'Google Ads not connected' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const config = integration.config;
    const accessToken = config.tokens?.accessToken || config.tokens?.access_token;
    const developerToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN');

    if (!accessToken || !developerToken) {
      return new Response(
        JSON.stringify({ error: 'Missing Google Ads credentials' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get accessible customers
    const response = await fetch('https://googleads.googleapis.com/v20/customers:listAccessibleCustomers', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': developerToken,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Ads API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const customers = data.resourceNames || [];

    // Get customer details for each accessible customer
    const accounts: GoogleAdsAccount[] = [];

    for (const customerResourceName of customers) {
      const customerId = customerResourceName.split('/').pop();
      
      try {
        const customerResponse = await fetch(`https://googleads.googleapis.com/v20/customers/${customerId}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'developer-token': developerToken,
            'Content-Type': 'application/json'
          }
        });

        if (customerResponse.ok) {
          const customerData = await customerResponse.json();
          accounts.push({
            id: customerId,
            name: customerData.descriptiveName || `Customer ${customerId}`,
            currency: customerData.currencyCode || 'USD',
            timezone: customerData.timeZone || 'UTC',
            descriptiveName: customerData.descriptiveName || `Customer ${customerId}`
          });
        }
      } catch (error) {
        console.warn(`Failed to get details for customer ${customerId}:`, error);
        // Add basic account info even if details fail
        accounts.push({
          id: customerId,
          name: `Customer ${customerId}`,
          currency: 'USD',
          timezone: 'UTC',
          descriptiveName: `Customer ${customerId}`
        });
      }
    }

    // Cache the results
    SimpleCache.set(cacheKey, accounts);
    console.log(`Cached ${accounts.length} accounts`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: accounts,
        cached: false
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Get Accounts Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch Google Ads accounts', message: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

async function handleGetCampaigns(supabaseClient: any, customerId: string) {
  try {
    // Check cache first
    const cacheKey = `google-ads-campaigns-${customerId}`;
    const cachedCampaigns = SimpleCache.get(cacheKey);
    
    if (cachedCampaigns) {
      console.log(`Cache hit for campaigns (customer: ${customerId})`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: cachedCampaigns,
          cached: true
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Cache miss for campaigns (customer: ${customerId}), fetching from API`);
    
    // Get Google Ads integration tokens
    const { data: integration, error } = await supabaseClient
      .from('integrations')
      .select('config')
      .eq('platform', 'googleAds')
      .eq('connected', true)
      .single();

    if (error || !integration) {
      return new Response(
        JSON.stringify({ error: 'Google Ads not connected' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const config = integration.config;
    const accessToken = config.tokens?.accessToken || config.tokens?.access_token;
    const developerToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN');

    if (!accessToken || !developerToken) {
      return new Response(
        JSON.stringify({ error: 'Missing Google Ads credentials' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Optimized campaign query with better performance
    const query = `
      SELECT 
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        campaign.start_date,
        campaign.end_date,
        campaign.budget_amount_micros,
        campaign.target_cpa_micros,
        campaign.target_roas,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value,
        metrics.ctr,
        metrics.average_cpc,
        metrics.conversions_from_interactions_rate,
        metrics.cost_per_conversion,
        metrics.search_impression_share,
        metrics.quality_score,
        metrics.bounce_rate,
        metrics.average_session_duration_seconds,
        segments.date
      FROM campaign 
      WHERE segments.date BETWEEN '2024-01-01' AND '2024-12-31'
        AND campaign.status = 'ENABLED'
      ORDER BY metrics.cost_micros DESC
      LIMIT 1000
    `;

    const response = await fetch(`https://googleads.googleapis.com/v20/customers/${customerId}/googleAds:search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': developerToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Ads API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Process campaigns with enhanced data structure
    const campaigns = (data.results || []).map((result: any) => ({
      id: result.campaign.id,
      name: result.campaign.name,
      status: result.campaign.status.toLowerCase(),
      type: result.campaign.advertisingChannelType,
      startDate: result.campaign.startDate,
      endDate: result.campaign.endDate,
      budget: parseFloat(result.campaign.budgetAmountMicros || '0') / 1000000,
      targetCpa: parseFloat(result.campaign.targetCpaMicros || '0') / 1000000,
      targetRoas: parseFloat(result.campaign.targetRoas || '0'),
      metrics: {
        impressions: parseInt(result.metrics?.impressions || '0'),
        clicks: parseInt(result.metrics?.clicks || '0'),
        cost: parseFloat(result.metrics?.costMicros || '0') / 1000000,
        conversions: parseInt(result.metrics?.conversions || '0'),
        conversionsValue: parseFloat(result.metrics?.conversionsValue || '0'),
        ctr: parseFloat(result.metrics?.ctr || '0'),
        averageCpc: parseFloat(result.metrics?.averageCpc || '0') / 1000000,
        conversionRate: parseFloat(result.metrics?.conversionsFromInteractionsRate || '0'),
        costPerConversion: parseFloat(result.metrics?.costPerConversion || '0') / 1000000,
        impressionShare: parseFloat(result.metrics?.searchImpressionShare || '0'),
        qualityScore: parseFloat(result.metrics?.qualityScore || '0'),
        bounceRate: parseFloat(result.metrics?.bounceRate || '0'),
        averageSessionDuration: parseFloat(result.metrics?.averageSessionDurationSeconds || '0')
      },
      date: result.segments?.date
    }));

    // Sort by cost descending for better performance
    campaigns.sort((a: any, b: any) => b.metrics.cost - a.metrics.cost);

    // Cache the results
    SimpleCache.set(cacheKey, campaigns);
    console.log(`Cached ${campaigns.length} campaigns for customer ${customerId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: campaigns,
        cached: false
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Get Campaigns Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch Google Ads campaigns', message: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}



async function handleGetCampaignPerformance(supabaseClient: any, customerId: string, dateRange: string) {
  try {
    // Check cache first
    const cacheKey = `google-ads-campaign-performance-${customerId}-${dateRange}`;
    const cachedData = SimpleCache.get(cacheKey);
    
    if (cachedData) {
      console.log(`Cache hit for campaign performance (customer: ${customerId}, range: ${dateRange})`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: cachedData,
          cached: true
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log(`Cache miss for campaign performance (customer: ${customerId}, range: ${dateRange}), fetching from API`);
    
    // Get Google Ads integration tokens
    const { data: integration, error } = await supabaseClient
      .from("integrations")
      .select("config")
      .eq("platform", "googleAds")
      .eq("connected", true)
      .single();

    if (error || !integration) {
      return new Response(
        JSON.stringify({ error: "Google Ads not connected" }),
        { 
          status: 404, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const config = integration.config;
    const accessToken = config.tokens?.accessToken || config.tokens?.access_token;
    const developerToken = Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN");

    if (!accessToken || !developerToken) {
      return new Response(
        JSON.stringify({ error: "Missing Google Ads credentials" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Optimized performance query with date range support
    const dateFilter = dateRange === "LAST_30_DAYS" 
      ? "segments.date DURING LAST_30_DAYS"
      : `segments.date BETWEEN "${dateRange.split("_")[0]}-${dateRange.split("_")[1]}-${dateRange.split("_")[2]}" AND "${dateRange.split("_")[3]}-${dateRange.split("_")[4]}-${dateRange.split("_")[5]}"`;

    const query = `
      SELECT 
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value,
        metrics.ctr,
        metrics.average_cpc,
        metrics.conversions_from_interactions_rate,
        metrics.cost_per_conversion,
        metrics.search_impression_share,
        metrics.quality_score,
        segments.date
      FROM campaign 
      WHERE ${dateFilter}
        AND campaign.status = "ENABLED"
      ORDER BY metrics.cost_micros DESC
      LIMIT 500
    `;

    const response = await fetch(`https://googleads.googleapis.com/v20/customers/${customerId}/googleAds:search`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "developer-token": developerToken,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Ads API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Process performance data with date grouping
    const performanceData = (data.results || []).map((result: any) => ({
      campaignId: result.campaign.id,
      campaignName: result.campaign.name,
      status: result.campaign.status.toLowerCase(),
      type: result.campaign.advertisingChannelType,
      date: result.segments?.date,
      metrics: {
        impressions: parseInt(result.metrics?.impressions || "0"),
        clicks: parseInt(result.metrics?.clicks || "0"),
        cost: parseFloat(result.metrics?.costMicros || "0") / 1000000,
        conversions: parseInt(result.metrics?.conversions || "0"),
        conversionsValue: parseFloat(result.metrics?.conversionsValue || "0"),
        ctr: parseFloat(result.metrics?.ctr || "0"),
        averageCpc: parseFloat(result.metrics?.averageCpc || "0") / 1000000,
        conversionRate: parseFloat(result.metrics?.conversionsFromInteractionsRate || "0"),
        costPerConversion: parseFloat(result.metrics?.costPerConversion || "0") / 1000000,
        impressionShare: parseFloat(result.metrics?.searchImpressionShare || "0"),
        qualityScore: parseFloat(result.metrics?.qualityScore || "0")
      }
    }));

    // Group by campaign for aggregated view
    const campaignGroups = new Map();
    performanceData.forEach((item: any) => {
      if (!campaignGroups.has(item.campaignId)) {
        campaignGroups.set(item.campaignId, {
          campaignId: item.campaignId,
          campaignName: item.campaignName,
          status: item.status,
          type: item.type,
          totalMetrics: {
            impressions: 0,
            clicks: 0,
            cost: 0,
            conversions: 0,
            conversionsValue: 0,
            ctr: 0,
            averageCpc: 0,
            conversionRate: 0,
            costPerConversion: 0,
            impressionShare: 0,
            qualityScore: 0
          },
          dailyData: []
        });
      }
      
      const campaign = campaignGroups.get(item.campaignId);
      campaign.totalMetrics.impressions += item.metrics.impressions;
      campaign.totalMetrics.clicks += item.metrics.clicks;
      campaign.totalMetrics.cost += item.metrics.cost;
      campaign.totalMetrics.conversions += item.metrics.conversions;
      campaign.totalMetrics.conversionsValue += item.metrics.conversionsValue;
      campaign.dailyData.push({
        date: item.date,
        metrics: item.metrics
      });
    });

    // Calculate aggregated metrics
    const aggregatedCampaigns = Array.from(campaignGroups.values()).map(campaign => {
      const totalMetrics = campaign.totalMetrics;
      return {
        ...campaign,
        totalMetrics: {
          ...totalMetrics,
          ctr: totalMetrics.clicks > 0 ? (totalMetrics.clicks / totalMetrics.impressions) * 100 : 0,
          averageCpc: totalMetrics.clicks > 0 ? totalMetrics.cost / totalMetrics.clicks : 0,
          conversionRate: totalMetrics.clicks > 0 ? (totalMetrics.conversions / totalMetrics.clicks) * 100 : 0,
          costPerConversion: totalMetrics.conversions > 0 ? totalMetrics.cost / totalMetrics.conversions : 0,
          impressionShare: totalMetrics.impressions > 0 ? (totalMetrics.impressions / (totalMetrics.impressions / 0.8)) * 100 : 0, // Rough estimate
          qualityScore: campaign.dailyData.length > 0 
            ? campaign.dailyData.reduce((sum: number, day: any) => sum + day.metrics.qualityScore, 0) / campaign.dailyData.length 
            : 0
        }
      };
    });

    // Sort by total cost descending
    aggregatedCampaigns.sort((a: any, b: any) => b.totalMetrics.cost - a.totalMetrics.cost);

    // Cache the results
    SimpleCache.set(cacheKey, aggregatedCampaigns);
    console.log(`Cached ${aggregatedCampaigns.length} campaign performance records for customer ${customerId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: aggregatedCampaigns,
        dateRange,
        totalCampaigns: aggregatedCampaigns.length,
        cached: false
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Get Campaign Performance Error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch Google Ads campaign performance", message: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
}
