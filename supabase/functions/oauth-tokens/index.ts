import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  expiresAt?: string;
  tokenType?: string;
  scope?: string;
}

interface ApiKeyConfig {
  apiKey: string;
  keyType?: string;
}

interface AccountInfo {
  id: string;
  name: string;
  email?: string;
  currency?: string;
  timezone?: string;
}

interface RequestBody {
  platform: string;
  tokens?: OAuthTokens;
  apiKey?: ApiKeyConfig;
  accountInfo?: AccountInfo;
  metadata?: Record<string, any>;
  settings?: Record<string, any>;
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
    
    // Extract platform from path: /oauth-tokens/{platform}
    const platform = pathSegments[2];

    switch (method) {
      case 'GET':
        return await handleGetTokens(supabaseClient, platform);
      
      case 'POST':
        const body: RequestBody = await req.json();
        return await handleStoreTokens(supabaseClient, body);
      
      case 'PUT':
        const updateBody: RequestBody = await req.json();
        return await handleRefreshTokens(supabaseClient, platform, updateBody);
      
      case 'DELETE':
        return await handleRevokeTokens(supabaseClient, platform);
      
      default:
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { 
            status: 405, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
    }
  } catch (error) {
    console.error('OAuth Tokens Edge Function Error:', error);
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

async function handleGetTokens(supabaseClient: any, platform: string) {
  try {
    if (!platform) {
      return new Response(
        JSON.stringify({ error: 'Platform is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { data, error } = await supabaseClient
      .from('integrations')
      .select('config')
      .eq('platform', platform)
      .eq('connected', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return new Response(
          JSON.stringify({ error: 'No tokens found for this platform' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      throw error;
    }

    const config = data.config;
    
    // Check if token is expired
    if (config.tokens?.expiresAt) {
      const expiresAt = new Date(config.tokens.expiresAt);
      if (expiresAt < new Date()) {
        return new Response(
          JSON.stringify({ 
            error: 'Token expired',
            expired: true,
            expiresAt: config.tokens.expiresAt
          }),
          { 
            status: 410, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: {
          tokens: config.tokens,
          apiKey: config.apiKey,
          accountInfo: config.accountInfo,
          expiresAt: config.tokens?.expiresAt,
          needsRefresh: config.tokens?.expiresAt ? 
            new Date(config.tokens.expiresAt).getTime() - Date.now() < 5 * 60 * 1000 : false
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('GET Tokens Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch tokens' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

async function handleStoreTokens(supabaseClient: any, body: RequestBody) {
  try {
    const { platform, tokens, apiKey, accountInfo, metadata, settings } = body;

    if (!platform) {
      return new Response(
        JSON.stringify({ error: 'Platform is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!tokens && !apiKey) {
      return new Response(
        JSON.stringify({ error: 'Either tokens or apiKey is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Calculate expiration time for OAuth tokens
    let expiresAt: string | undefined;
    if (tokens?.expiresIn) {
      expiresAt = new Date(Date.now() + (tokens.expiresIn * 1000)).toISOString();
    }

    const integrationConfig = {
      platform,
      connected: true,
      connectedAt: new Date().toISOString(),
      lastSync: new Date().toISOString(),
      syncStatus: 'idle',
      accountInfo,
      tokens: tokens ? { ...tokens, expiresAt } : undefined,
      apiKey,
      metadata,
      settings
    };

    const { data, error } = await supabaseClient
      .from('integrations')
      .upsert({
        platform,
        connected: true,
        account_name: accountInfo?.name || `${platform} Account`,
        account_id: accountInfo?.id || 'unknown',
        connected_at: integrationConfig.connectedAt,
        last_sync: integrationConfig.lastSync,
        sync_status: integrationConfig.syncStatus,
        config: integrationConfig
      }, { onConflict: 'platform' })
      .select('*')
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${platform} tokens stored successfully`,
        data: {
          platform: data.platform,
          connected: data.connected,
          expiresAt: integrationConfig.tokens?.expiresAt
        }
      }),
      { 
        status: 201, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Store Tokens Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to store tokens' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

async function handleRefreshTokens(supabaseClient: any, platform: string, body: RequestBody) {
  try {
    if (!platform) {
      return new Response(
        JSON.stringify({ error: 'Platform is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { tokens } = body;
    if (!tokens) {
      return new Response(
        JSON.stringify({ error: 'New tokens are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get existing integration
    const { data: existingData, error: fetchError } = await supabaseClient
      .from('integrations')
      .select('config')
      .eq('platform', platform)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return new Response(
          JSON.stringify({ error: 'Integration not found' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      throw fetchError;
    }

    const existingConfig = existingData.config;
    
    // Calculate new expiration time
    let expiresAt: string | undefined;
    if (tokens.expiresIn) {
      expiresAt = new Date(Date.now() + (tokens.expiresIn * 1000)).toISOString();
    }

    const updatedConfig = {
      ...existingConfig,
      tokens: { ...tokens, expiresAt },
      lastSync: new Date().toISOString(),
      syncStatus: 'idle'
    };

    const { data, error } = await supabaseClient
      .from('integrations')
      .update({
        config: updatedConfig,
        last_sync: updatedConfig.lastSync,
        sync_status: updatedConfig.syncStatus,
        updated_at: new Date().toISOString()
      })
      .eq('platform', platform)
      .select('*')
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${platform} tokens refreshed successfully`,
        data: {
          platform: data.platform,
          expiresAt: updatedConfig.tokens.expiresAt
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Refresh Tokens Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to refresh tokens' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

async function handleRevokeTokens(supabaseClient: any, platform: string) {
  try {
    if (!platform) {
      return new Response(
        JSON.stringify({ error: 'Platform is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get existing integration
    const { data: existingData, error: fetchError } = await supabaseClient
      .from('integrations')
      .select('config')
      .eq('platform', platform)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return new Response(
          JSON.stringify({ error: 'Integration not found' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      throw fetchError;
    }

    const existingConfig = existingData.config;
    
    // Clear tokens but keep the integration record
    const updatedConfig = {
      ...existingConfig,
      connected: false,
      tokens: undefined,
      apiKey: undefined,
      lastSync: new Date().toISOString(),
      syncStatus: 'idle'
    };

    const { error } = await supabaseClient
      .from('integrations')
      .update({
        connected: false,
        config: updatedConfig,
        last_sync: updatedConfig.lastSync,
        sync_status: updatedConfig.syncStatus,
        updated_at: new Date().toISOString()
      })
      .eq('platform', platform);

    if (error) throw error;

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${platform} tokens revoked successfully` 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Revoke Tokens Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to revoke tokens' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}
