import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔄 Refreshing Google Sheets token...')

    // Get Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Get current Google Sheets integration
    const { data: integrationData, error: integrationError } = await supabaseClient
      .from('integrations')
      .select('config')
      .eq('platform', 'googleSheets')
      .eq('connected', true)
      .single()

    if (integrationError || !integrationData?.config?.tokens?.refreshToken) {
      console.error('No Google Sheets refresh token found:', integrationError)
      return new Response(
        JSON.stringify({ success: false, error: 'No Google Sheets refresh token found' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const refreshToken = integrationData.config.tokens.refreshToken
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')

    if (!clientId || !clientSecret) {
      console.error('Missing Google OAuth credentials')
      return new Response(
        JSON.stringify({ success: false, error: 'Missing Google OAuth credentials' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('📡 Making token refresh request to Google...')

    // Refresh the token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('❌ Token refresh failed:', tokenResponse.status, errorText)
      return new Response(
        JSON.stringify({ success: false, error: `Token refresh failed: ${tokenResponse.status} ${errorText}` }),
        { 
          status: tokenResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const tokens = await tokenResponse.json()
    console.log('✅ Token refresh successful!')

    // Calculate new expiration time
    const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000)).toISOString()

    // Update the database with new token
    const { error: updateError } = await supabaseClient
      .from('integrations')
      .update({
        config: {
          ...integrationData.config,
          tokens: {
            ...integrationData.config.tokens,
            accessToken: tokens.access_token,
            expiresAt: expiresAt
          }
        },
        updated_at: new Date().toISOString()
      })
      .eq('platform', 'googleSheets')

    if (updateError) {
      console.error('❌ Failed to update database:', updateError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update database' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('💾 Database updated successfully!')
    console.log('🎉 Google Sheets authentication is now fixed!')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Token refreshed successfully',
        expires_at: expiresAt,
        expires_in: tokens.expires_in
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('💥 Error refreshing token:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
