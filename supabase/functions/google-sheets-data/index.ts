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
    const { spreadsheetId, range } = await req.json()

    if (!spreadsheetId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required parameter: spreadsheetId' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    // Get Google Sheets tokens from integrations table
    const { data: integrationData, error: integrationError } = await supabaseClient
      .from('integrations')
      .select('config')
      .eq('platform', 'googleSheets')
      .eq('connected', true)
      .single()

    if (integrationError || !integrationData?.config?.tokens) {
      console.error('No Google Sheets tokens found:', integrationError)
      return new Response(
        JSON.stringify({ success: false, error: 'No Google Sheets authentication tokens found' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    let accessToken = integrationData.config.tokens.accessToken || integrationData.config.tokens.access_token
    const refreshToken = integrationData.config.tokens.refreshToken || integrationData.config.tokens.refresh_token

    // Use hardcoded credentials for token refresh (temporary solution)
    const GOOGLE_CLIENT_ID = '1040620993822-erpcbjttal5hhgb73gkafdv0dt3vip39.apps.googleusercontent.com'
    const GOOGLE_CLIENT_SECRET = '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'
    
    // If access token is null or expired, try to refresh it
    if (!accessToken && refreshToken) {
      console.log('Access token is null, attempting to refresh...')
      
      try {
        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
          }),
        })

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json()
          accessToken = refreshData.access_token
          
          // Update the tokens in the database
          const { error: updateError } = await supabaseClient
            .from('integrations')
            .update({
              config: {
                ...integrationData.config,
                tokens: {
                  ...integrationData.config.tokens,
                  accessToken: accessToken,
                  access_token: accessToken,
                  expiresIn: Date.now() + (refreshData.expires_in * 1000),
                  expires_in: Date.now() + (refreshData.expires_in * 1000),
                }
              }
            })
            .eq('platform', 'googleSheets')

          if (updateError) {
            console.error('Failed to update tokens:', updateError)
          } else {
            console.log('Successfully refreshed and updated access token')
          }
        } else {
          console.error('Failed to refresh token:', refreshResponse.status, refreshResponse.statusText)
          return new Response(
            JSON.stringify({ success: false, error: 'Failed to refresh Google Sheets access token' }),
            { 
              status: 401, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
      } catch (refreshError) {
        console.error('Token refresh error:', refreshError)
        return new Response(
          JSON.stringify({ success: false, error: 'Token refresh failed' }),
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    if (!accessToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'No valid Google Sheets access token available' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    const rangeParam = range ? `?range=${encodeURIComponent(range)}` : ''
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values${rangeParam}`

    console.log('Fetching Google Sheets data:', { spreadsheetId, range, url })

    // Fetch data from Google Sheets API
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      console.error('Google Sheets API error:', response.status, response.statusText)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Google Sheets API error: ${response.status} ${response.statusText}` 
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const data = await response.json()
    
    console.log('Successfully fetched Google Sheets data:', {
      spreadsheetId,
      range,
      rowCount: data.values?.length || 0
    })

    return new Response(
      JSON.stringify({
        success: true,
        data: data,
        metadata: {
          spreadsheetId,
          range,
          rowCount: data.values?.length || 0,
          columnCount: data.values?.[0]?.length || 0,
          timestamp: new Date().toISOString()
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    
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
