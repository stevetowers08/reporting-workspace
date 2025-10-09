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
  manager: boolean;
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
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    console.log('🔍 Google Ads OAuth callback received:', { 
      hasCode: !!code, 
      hasState: !!state, 
      hasError: !!error 
    });

    if (error) {
      console.error('❌ OAuth error:', error);
      return new Response(
        JSON.stringify({ error: `OAuth error: ${error}` }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!code) {
      console.error('❌ No authorization code received');
      return new Response(
        JSON.stringify({ error: 'No authorization code received' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Step 1: Exchange code for tokens
    console.log('🔍 Step 1: Exchanging code for tokens...');
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
        redirect_uri: `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-ads-oauth`,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('❌ Token exchange failed:', errorText);
      return new Response(
        JSON.stringify({ error: 'Token exchange failed', details: errorText }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokens;

    console.log('✅ Step 1: Tokens received successfully');

    // Step 2: Get accessible customers
    console.log('🔍 Step 2: Getting accessible customers...');
    const developerToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN');
    if (!developerToken) {
      console.error('❌ Missing Google Ads developer token');
      return new Response(
        JSON.stringify({ error: 'Missing Google Ads developer token' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const listResponse = await fetch('https://googleads.googleapis.com/v20/customers:listAccessibleCustomers', {
      headers: { 
        Authorization: `Bearer ${access_token}`,
        'developer-token': developerToken,
      },
    });

    if (!listResponse.ok) {
      const errorText = await listResponse.text();
      console.error('❌ Failed to get accessible customers:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to get accessible customers', details: errorText }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const listData = await listResponse.json();
    const resourceNames = listData.resourceNames || [];
    const customerIds = resourceNames.map((name: string) => name.replace('customers/', ''));

    console.log('✅ Step 2: Found accessible customers:', customerIds);

    // Step 3: Get details for each customer to find the manager account
    console.log('🔍 Step 3: Finding manager account...');
    const accounts: GoogleAdsAccount[] = [];
    
    for (const customerId of customerIds) {
      try {
        const customerResponse = await fetch(`https://googleads.googleapis.com/v20/customers/${customerId}`, {
          headers: { 
            Authorization: `Bearer ${access_token}`,
            'developer-token': developerToken,
          },
        });

        if (customerResponse.ok) {
          const customerData = await customerResponse.json();
          accounts.push({
            id: customerId,
            name: customerData.descriptiveName || `Account ${customerId}`,
            manager: customerData.manager || false
          });
        }
      } catch (error) {
        console.warn(`⚠️ Failed to get details for customer ${customerId}:`, error);
      }
    }

    // Find the manager account (MCC)
    const managerAccount = accounts.find(account => account.manager);
    
    if (!managerAccount) {
      console.error('❌ No manager account found');
      return new Response(
        JSON.stringify({ error: 'No manager account found. Please ensure you have access to a Google Ads Manager account.' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ Step 3: Found manager account:', managerAccount);

    // Step 4: Store tokens and account info in database
    console.log('🔍 Step 4: Storing tokens and account info...');
    
    const expiresAt = new Date(Date.now() + (expires_in * 1000)).toISOString();
    
    const integrationConfig = {
      platform: 'googleAds',
      connected: true,
      connectedAt: new Date().toISOString(),
      lastSync: new Date().toISOString(),
      syncStatus: 'idle',
      accountInfo: {
        id: managerAccount.id,
        name: managerAccount.name,
        email: '', // We don't get email from this API
      },
      tokens: {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresIn: expires_in,
        expiresAt: expiresAt,
        tokenType: 'Bearer',
        scope: 'https://www.googleapis.com/auth/adwords'
      },
      metadata: {
        accessibleAccounts: accounts,
        managerAccount: managerAccount
      }
    };

    const { data, error } = await supabaseClient
      .from('integrations')
      .upsert({
        platform: 'googleAds',
        connected: true,
        account_name: managerAccount.name,
        account_id: managerAccount.id, // Store the 10-digit manager account ID
        connected_at: integrationConfig.connectedAt,
        last_sync: integrationConfig.lastSync,
        sync_status: integrationConfig.syncStatus,
        config: integrationConfig
      }, { onConflict: 'platform' })
      .select('*')
      .single();

    if (error) {
      console.error('❌ Failed to store integration:', error);
      throw error;
    }

    console.log('✅ Step 4: Integration stored successfully');

    // Step 5: Redirect back to frontend
    const baseUrl = Deno.env.get('APP_URL') || 'http://localhost:3000';
    const redirectUrl = `${baseUrl}/admin?googleAds_connected=true&manager_id=${managerAccount.id}`;
    
    console.log('✅ Redirecting to:', redirectUrl);
    
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': redirectUrl
      }
    });

  } catch (error) {
    console.error('❌ Google Ads OAuth Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Google Ads OAuth callback failed', 
        message: error.message,
        details: error.toString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
