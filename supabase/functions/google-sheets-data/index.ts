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

    // Get Google Ads tokens from integrations table
    const { data: integrationData, error: integrationError } = await supabaseClient
      .from('integrations')
      .select('config')
      .eq('platform', 'googleAds')
      .eq('connected', true)
      .single()

    if (integrationError || !integrationData?.config?.tokens?.access_token) {
      console.error('No Google tokens found:', integrationError)
      return new Response(
        JSON.stringify({ success: false, error: 'No Google authentication tokens found' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const accessToken = integrationData.config.tokens.access_token
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
