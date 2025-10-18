 
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
    const { spreadsheetId, range, values, operation = 'read' } = await req.json()

    // Allow listing spreadsheets without requiring spreadsheetId
    if (!spreadsheetId && operation !== 'list_sheets') {
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

    // Get Google OAuth credentials from database
    const { data: oauthCredentials, error: oauthError } = await supabaseClient
      .from('oauth_credentials')
      .select('client_id, client_secret')
      .eq('platform', 'googleSheets')
      .single()
    
    if (oauthError || !oauthCredentials) {
      console.error('Google OAuth credentials not found in database:', oauthError)
      return new Response(
        JSON.stringify({ success: false, error: 'Google OAuth credentials not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    const GOOGLE_CLIENT_ID = oauthCredentials.client_id
    const GOOGLE_CLIENT_SECRET = oauthCredentials.client_secret
    
    // CRITICAL: Check if token is expired and refresh if needed
    // Access tokens expire after ~1 hour, refresh tokens after 7 days (testing) or never (production)
    const tokenExpiryBuffer = 5 * 60 * 1000; // 5 minutes buffer
    const expiresAt = integrationData.config.tokens.expiresAt || integrationData.config.tokens.expires_at;
    const isTokenExpired = !accessToken || (expiresAt && (Date.now() >= (new Date(expiresAt).getTime() - tokenExpiryBuffer)))
    
    if (isTokenExpired && refreshToken) {
      console.log('Access token expired or expiring soon, attempting refresh...')
      
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
          
          // Calculate expiration time
          const newExpiresAt = new Date(Date.now() + (refreshData.expires_in * 1000)).toISOString()
          
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
                  expiresAt: newExpiresAt,
                  expires_at: newExpiresAt,
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
          const errorText = await refreshResponse.text()
          console.error('Failed to refresh token:', refreshResponse.status, errorText)
          
          // If refresh fails, the refresh token might be expired
          if (refreshResponse.status === 400) {
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: 'Google Sheets refresh token expired. Please re-authenticate.',
                requiresReauth: true
              }),
              { 
                status: 401, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            )
          }
          
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `Failed to refresh Google Sheets access token: ${refreshResponse.status}` 
            }),
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

    // Handle different operations
    if (operation === 'list_sheets') {
      // List available spreadsheets from Google Drive
      const driveResponse = await fetch(`https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.spreadsheet'&fields=files(id,name,modifiedTime,webViewLink)`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!driveResponse.ok) {
        console.error('Google Drive API error:', driveResponse.status, driveResponse.statusText)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Google Drive API error: ${driveResponse.status} ${driveResponse.statusText}` 
          }),
          { 
            status: driveResponse.status, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const driveData = await driveResponse.json()
      const spreadsheets = driveData.files || []

      console.log('Successfully fetched spreadsheets:', {
        count: spreadsheets.length
      })

      return new Response(
        JSON.stringify({
          success: true,
          data: { spreadsheets },
          metadata: {
            count: spreadsheets.length,
            timestamp: new Date().toISOString()
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    } else if (operation === 'write' && values) {
      // Write operation
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`
      
      console.log('Writing Google Sheets data:', { spreadsheetId, range, rowCount: values.length })

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values })
      })

      if (!response.ok) {
        console.error('Google Sheets write error:', response.status, response.statusText)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Google Sheets write error: ${response.status} ${response.statusText}` 
          }),
          { 
            status: response.status, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const data = await response.json()
      
      console.log('Successfully wrote Google Sheets data:', {
        spreadsheetId,
        range,
        rowCount: values.length
      })

      return new Response(
        JSON.stringify({
          success: true,
          data: data,
          metadata: {
            spreadsheetId,
            range,
            rowCount: values.length,
            timestamp: new Date().toISOString()
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    } else {
      // Read operation - Use batchGet endpoint which works reliably
      const ranges = range ? [range] : ['A1:Z1000'] // Default range if none specified
      const rangesParam = ranges.map(r => `ranges=${encodeURIComponent(r)}`).join('&')
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${rangesParam}`

      console.log('Fetching Google Sheets data:', { spreadsheetId, range, url })
      console.log('Using access token:', accessToken ? `${accessToken.substring(0, 20)}...` : 'NO TOKEN')

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
      
      // batchGet returns data in valueRanges array
      const values = data.valueRanges?.[0]?.values || []
      
      console.log('Successfully fetched Google Sheets data:', {
        spreadsheetId,
        range,
        rowCount: values.length
      })

      return new Response(
        JSON.stringify({
          success: true,
          data: { values }, // Convert batchGet format to standard format
          metadata: {
            spreadsheetId,
            range,
            rowCount: values.length,
            columnCount: values[0]?.length || 0,
            timestamp: new Date().toISOString()
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

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
