import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TokenRefreshRequest {
  platform: string;
  refreshToken: string;
}

interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type: string;
  scope?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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
    )

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { platform, refreshToken }: TokenRefreshRequest = await req.json()

    if (!platform || !refreshToken) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing platform or refresh token' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get OAuth configuration from environment (server-side only)
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')

    if (!clientId || !clientSecret) {
      console.error('Missing OAuth credentials')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'OAuth configuration missing' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Refresh access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}))
      console.error('Token refresh failed:', errorData)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Token refresh failed: ${tokenResponse.status} ${JSON.stringify(errorData)}` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const tokens: OAuthTokens = await tokenResponse.json()

    // Calculate new expiration time
    const expiresAt = tokens.expires_in 
      ? new Date(Date.now() + (tokens.expires_in * 1000)).toISOString()
      : new Date(Date.now() + 3600000).toISOString() // Default 1 hour

    // Update tokens in database
    const { data: existingData, error: fetchError } = await supabaseClient
      .from('integrations')
      .select('config')
      .eq('platform', platform)
      .eq('connected', true)
      .single()

    if (fetchError) {
      console.error('Failed to fetch existing config:', fetchError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to fetch existing configuration' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const existingConfig = existingData.config as any
    const updatedConfig = {
      ...existingConfig,
      tokens: {
        ...existingConfig.tokens,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || existingConfig.tokens.refreshToken, // Keep existing if not provided
        expiresAt: expiresAt,
        tokenType: tokens.token_type || existingConfig.tokens.tokenType,
        scope: tokens.scope || existingConfig.tokens.scope
      }
    }

    const { error: updateError } = await supabaseClient
      .from('integrations')
      .update({
        config: updatedConfig,
        updated_at: new Date().toISOString()
      })
      .eq('platform', platform)

    if (updateError) {
      console.error('Failed to update tokens:', updateError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to update tokens in database' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        tokens: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || existingConfig.tokens.refreshToken,
          expiresAt: expiresAt,
          tokenType: tokens.token_type,
          scope: tokens.scope
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Token refresh error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
