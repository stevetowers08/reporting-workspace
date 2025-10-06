import { createClient } from '@supabase/supabase-js';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3001;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Supabase client - using anon key for now
const supabase = createClient(
  'https://bdmcdyxjdkgitphieklb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbWNkeXhqZGtnaXRwaGlla2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0Mzk3MDYsImV4cCI6MjA3NTAxNTcwNn0.QwmjIXs7PbTi21GGDNd1Z0EQR2R6B_fwYWCXDFeOCPw'
);

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

    // Get Google Ads tokens from integrations table
    const { data: integrationData, error: integrationError } = await supabase
      .from('integrations')
      .select('config')
      .eq('platform', 'googleAds')
      .eq('connected', true)
      .single();

    if (integrationError || !integrationData?.config?.tokens?.access_token) {
      console.error('No Google tokens found:', integrationError);
      return res.status(401).json({ 
        success: false, 
        error: 'No Google authentication tokens found' 
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
            'client_id': '1040620993822-erpcbjttal5hhgb73gkafdv0dt3vip39.apps.googleusercontent.com',
            'client_secret': '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',
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
