import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface IntegrationConfig {
  platform: string;
  connected: boolean;
  connectedAt?: string;
  lastSync?: string;
  syncStatus?: 'idle' | 'syncing' | 'error';
  accountInfo?: {
    id: string;
    name: string;
    email?: string;
    currency?: string;
    timezone?: string;
  };
  tokens?: {
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
    expiresAt?: string;
    tokenType?: string;
    scope?: string;
  };
  apiKey?: {
    apiKey: string;
    keyType?: string;
  };
  metadata?: Record<string, any>;
  settings?: Record<string, any>;
}

interface RequestBody {
  platform?: string;
  config?: IntegrationConfig;
  tokens?: any;
  apiKey?: any;
  accountInfo?: any;
  metadata?: any;
  settings?: any;
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
    
    // Extract platform from path: /integrations/{platform}
    const platform = pathSegments[2];

    switch (method) {
      case 'GET':
        return await handleGet(supabaseClient, platform);
      
      case 'POST':
        const body: RequestBody = await req.json();
        return await handlePost(supabaseClient, body);
      
      case 'PUT':
        const updateBody: RequestBody = await req.json();
        return await handlePut(supabaseClient, platform, updateBody);
      
      case 'DELETE':
        return await handleDelete(supabaseClient, platform);
      
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
    console.error('Edge Function Error:', error);
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

async function handleGet(supabaseClient: any, platform?: string) {
  try {
    if (platform) {
      // Get specific integration
      const { data, error } = await supabaseClient
        .from('integrations')
        .select('*')
        .eq('platform', platform)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return new Response(
            JSON.stringify({ error: 'Integration not found' }),
            { 
              status: 404, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        throw error;
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: {
            platform: data.platform,
            connected: data.connected,
            config: data.config,
            lastSync: data.last_sync,
            connectedAt: data.connected_at
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else {
      // Get all integrations
      const { data, error } = await supabaseClient
        .from('integrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: data.map(integration => ({
            platform: integration.platform,
            connected: integration.connected,
            config: integration.config,
            lastSync: integration.last_sync,
            connectedAt: integration.connected_at
          }))
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
  } catch (error) {
    console.error('GET Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch integrations' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

async function handlePost(supabaseClient: any, body: RequestBody) {
  try {
    const { platform, config, tokens, apiKey, accountInfo, metadata, settings } = body;

    if (!platform) {
      return new Response(
        JSON.stringify({ error: 'Platform is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Build the integration config
    const integrationConfig: IntegrationConfig = {
      platform,
      connected: true,
      connectedAt: new Date().toISOString(),
      lastSync: new Date().toISOString(),
      syncStatus: 'idle',
      accountInfo,
      tokens,
      apiKey,
      metadata,
      settings,
      ...config
    };

    const { data, error } = await supabaseClient
      .from('integrations')
      .upsert({
        platform,
        connected: integrationConfig.connected,
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
        data: {
          platform: data.platform,
          connected: data.connected,
          config: data.config,
          lastSync: data.last_sync,
          connectedAt: data.connected_at
        }
      }),
      { 
        status: 201, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('POST Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create/update integration' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

async function handlePut(supabaseClient: any, platform: string, body: RequestBody) {
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

    const { config, tokens, apiKey, accountInfo, metadata, settings } = body;

    // Get existing integration first
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

    const existingConfig = existingData.config as IntegrationConfig;
    
    // Merge with existing config
    const updatedConfig: IntegrationConfig = {
      ...existingConfig,
      ...config,
      lastSync: new Date().toISOString(),
      syncStatus: 'idle',
      accountInfo: accountInfo || existingConfig.accountInfo,
      tokens: tokens || existingConfig.tokens,
      apiKey: apiKey || existingConfig.apiKey,
      metadata: { ...existingConfig.metadata, ...metadata },
      settings: { ...existingConfig.settings, ...settings }
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
        data: {
          platform: data.platform,
          connected: data.connected,
          config: data.config,
          lastSync: data.last_sync,
          connectedAt: data.connected_at
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('PUT Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update integration' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

async function handleDelete(supabaseClient: any, platform: string) {
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

    // Get existing integration first
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

    const existingConfig = existingData.config as IntegrationConfig;
    
    // Mark as disconnected but keep the record
    const updatedConfig: IntegrationConfig = {
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
        message: `${platform} integration disconnected successfully` 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('DELETE Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to disconnect integration' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}
