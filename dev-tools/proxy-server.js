import { createClient } from '@supabase/supabase-js';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3001;

// Enable CORS for all routes with configurable origins
app.use(cors({
  origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(','),
  methods: ['POST', 'OPTIONS'],
}));
app.use(express.json());

// Supabase client - use server-side service role key
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

app.post('/google-sheets-data', async (req, res) => {
  try {
    console.log('Received request:', req.body);
    const { spreadsheetId, range } = req.body;

    if (!spreadsheetId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameter: spreadsheetId' 
      });
    }

    // Get Google Sheets tokens from integrations table
    const { data: integrationData, error: integrationError } = await supabase
      .from('integrations')
      .select('config')
      .eq('platform', 'googleSheets')
      .eq('connected', true)
      .single();

    if (integrationError || !integrationData?.config?.tokens?.access_token) {
      console.error('No Google Sheets tokens found:', integrationError);
      return res.status(401).json({ 
        success: false, 
        error: 'No Google Sheets authentication tokens found' 
      });
    }

    let accessToken = integrationData.config.tokens.access_token;
    
    // Always try to refresh the token since expires_at is null
    const refreshToken = integrationData.config.tokens.refresh_token;
    if (refreshToken) {
      console.log('Attempting token refresh...');
      try {
        // Refresh the token
        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            'client_id': process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '',
            'client_secret': process.env.GOOGLE_CLIENT_SECRET || process.env.VITE_GOOGLE_CLIENT_SECRET || '',
            'refresh_token': refreshToken,
            'grant_type': 'refresh_token'
          })
        });
        
        if (refreshResponse.ok) {
          const newTokens = await refreshResponse.json();
          accessToken = newTokens.access_token; // Update the accessToken variable
          console.log('Token refreshed successfully');
          
          // Update the database with new tokens
          const newExpiresAt = new Date(Date.now() + (newTokens.expires_in || 3600) * 1000).toISOString();
          await supabase
            .from('integrations')
            .update({
              config: {
                ...integrationData.config,
                tokens: {
                  ...integrationData.config.tokens,
                  access_token: newTokens.access_token,
                  expires_at: newExpiresAt
                }
              }
            })
            .eq('platform', 'googleAds');
        } else {
          console.error('Token refresh failed:', refreshResponse.status, refreshResponse.statusText);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
      }
    }
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;

    console.log('Fetching Google Sheets data:', { spreadsheetId, range, url });

    // Fetch data from Google Sheets API
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('Google Sheets API error:', response.status, response.statusText);
      return res.status(response.status).json({ 
        success: false, 
        error: `Google Sheets API error: ${response.status} ${response.statusText}` 
      });
    }

    const data = await response.json();
    
    console.log('Successfully fetched Google Sheets data:', {
      spreadsheetId,
      range,
      rowCount: data.values?.length || 0
    });

    res.json({
      success: true,
      data: data,
      metadata: {
        spreadsheetId,
        range,
        rowCount: data.values?.length || 0,
        columnCount: data.values?.[0]?.length || 0,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Proxy server error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
