import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type: string;
  scope?: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  verified_email: boolean;
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

    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const error = url.searchParams.get('error')

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `OAuth error: ${error}`,
          redirectUrl: `${Deno.env.get('FRONTEND_URL')}/integrations?error=${encodeURIComponent(error)}`
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!code || !state) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing authorization code or state parameter' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse and validate state
    let stateData: { platform: string; timestamp: number; nonce: string; integrationPlatform?: string }
    try {
      stateData = JSON.parse(atob(state))
      
      // Validate state timestamp (prevent replay attacks)
      const now = Date.now()
      const stateAge = now - stateData.timestamp
      if (stateAge > 10 * 60 * 1000) { // 10 minutes max
        throw new Error('OAuth state expired')
      }
    } catch (error) {
      console.error('Invalid OAuth state:', error)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid OAuth state - possible CSRF attack' 
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
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-ads-oauth`

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

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      })
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}))
      console.error('Token exchange failed:', errorData)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Token exchange failed: ${tokenResponse.status} ${JSON.stringify(errorData)}` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const tokens: OAuthTokens = await tokenResponse.json()

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Accept': 'application/json'
      }
    })

    if (!userInfoResponse.ok) {
      console.error('Failed to get user info:', userInfoResponse.status)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to get user information from Google' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const userInfo: GoogleUserInfo = await userInfoResponse.json()

    // Calculate token expiration
    const expiresAt = tokens.expires_in 
      ? new Date(Date.now() + (tokens.expires_in * 1000)).toISOString()
      : new Date(Date.now() + 3600000).toISOString() // Default 1 hour

    // Store tokens securely in database
    const { error: storeError } = await supabaseClient
      .from('integrations')
      .upsert({
        platform: 'googleAds',
        connected: true,
        account_name: userInfo.name,
        account_id: userInfo.id,
        config: {
          tokens: {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresAt: expiresAt,
            tokenType: tokens.token_type,
            scope: tokens.scope
          },
          account_info: {
            id: userInfo.id,
            name: userInfo.name,
            email: userInfo.email
          }
        },
        last_sync: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'platform' })

    if (storeError) {
      console.error('Failed to store tokens:', storeError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to store authentication tokens' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Redirect to frontend with success
    const redirectUrl = `${Deno.env.get('FRONTEND_URL')}/integrations?success=googleAds&user=${encodeURIComponent(userInfo.name)}`
    
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': redirectUrl
      }
    })

  } catch (error) {
    console.error('OAuth callback error:', error)
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