import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

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

// Rate limiting configuration
const RATE_LIMITS = {
  accounts: { requests: 100, window: 60 * 1000 }, // 100 requests per minute
  campaigns: { requests: 50, window: 60 * 1000 }, // 50 requests per minute
};

// Simple in-memory rate limiter (in production, use Redis or database)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(action: string, identifier: string): boolean {
  const key = `${action}:${identifier}`;
  const now = Date.now();
  const limit = RATE_LIMITS[action as keyof typeof RATE_LIMITS];
  
  if (!limit) return true;
  
  const current = rateLimitStore.get(key);
  
  if (!current || now > current.resetTime) {
    // Reset or create new entry
    rateLimitStore.set(key, { count: 1, resetTime: now + limit.window });
    return true;
  }
  
  if (current.count >= limit.requests) {
    return false; // Rate limit exceeded
  }
  
  current.count++;
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
        const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
        if (!checkRateLimit('accounts', clientIp)) {
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
        if (!checkRateLimit('campaigns', clientIp)) {
          return new Response(
            JSON.stringify({ error: 'Rate limit exceeded for campaigns endpoint' }),
            { 
              status: 429, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        return await handleGetCampaigns(supabaseClient, customerId);
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action. Supported actions: accounts, campaigns' }),
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

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: accounts
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

    // Get campaigns for the customer
    const query = `
      SELECT 
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.leads,
        metrics.ctr,
        metrics.average_cpc,
        metrics.conversions_from_interactions_rate,
        metrics.cost_per_conversion,
        metrics.search_impression_share,
        metrics.quality_score
      FROM campaign 
      WHERE segments.date DURING LAST_30_DAYS
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
    const campaigns = (data.results || []).map((result: any) => ({
      id: result.campaign.id,
      name: result.campaign.name,
      status: result.campaign.status.toLowerCase(),
      type: result.campaign.advertisingChannelType,
      metrics: {
        impressions: parseInt(result.metrics?.impressions || '0'),
        clicks: parseInt(result.metrics?.clicks || '0'),
        cost: parseFloat(result.metrics?.costMicros || '0') / 1000000,
        leads: parseInt(result.metrics?.leads || '0'),
        ctr: parseFloat(result.metrics?.ctr || '0'),
        averageCpc: parseFloat(result.metrics?.averageCpc || '0') / 1000000,
        conversionRate: parseFloat(result.metrics?.conversionsFromInteractionsRate || '0'),
        costPerConversion: parseFloat(result.metrics?.costPerConversion || '0') / 1000000,
        impressionShare: parseFloat(result.metrics?.searchImpressionShare || '0'),
        qualityScore: parseFloat(result.metrics?.qualityScore || '0')
      }
    }));

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: campaigns
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

