#!/usr/bin/env node

// Test script to check Google Ads OAuth tokens and API calls
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });
config({ path: '.env.development' });
config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const googleAdsDevToken = process.env.VITE_GOOGLE_ADS_DEVELOPER_TOKEN;

console.log('🔍 Google Ads OAuth Token Test');
console.log('==============================');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found');
  process.exit(1);
}

if (!googleAdsDevToken) {
  console.error('❌ Google Ads Developer Token not found');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testGoogleAdsTokens() {
  try {
    console.log('📋 Fetching Google Ads integration from database...');
    
    const { data: integrations, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('platform', 'googleAds')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('❌ Database error:', error);
      return;
    }

    if (!integrations || integrations.length === 0) {
      console.error('❌ No Google Ads integration found in database');
      return;
    }

    const integration = integrations[0];
    console.log('✅ Google Ads integration found');
    console.log('Manager Account ID:', integration.config?.manager_account_id);
    
    const tokens = integration.config?.tokens;
    if (!tokens) {
      console.error('❌ No OAuth tokens found in integration');
      return;
    }

    console.log('📋 OAuth Token Info:');
    console.log('- Access Token:', tokens.accessToken ? `${tokens.accessToken.substring(0, 20)}...` : 'NOT FOUND');
    console.log('- Refresh Token:', tokens.refreshToken ? `${tokens.refreshToken.substring(0, 20)}...` : 'NOT FOUND');
    console.log('- Expires At:', tokens.expiresAt);
    console.log('- Token Type:', tokens.tokenType);
    console.log('- Scope:', tokens.scope);

    // Check if token is expired
    const expiresAt = new Date(tokens.expiresAt);
    const now = new Date();
    const isExpired = now >= expiresAt;
    
    console.log('\n⏰ Token Status:');
    console.log('- Current Time:', now.toISOString());
    console.log('- Expires At:', expiresAt.toISOString());
    console.log('- Is Expired:', isExpired ? '❌ YES' : '✅ NO');

    if (isExpired) {
      console.log('\n🔄 Token is expired, attempting to refresh...');
      await refreshGoogleAdsToken(tokens.refreshToken);
    } else {
      console.log('\n✅ Token is valid, testing API call...');
      await testGoogleAdsAPI(tokens.accessToken, integration.config?.manager_account_id);
    }

  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

async function refreshGoogleAdsToken(refreshToken) {
  try {
    console.log('🔄 Refreshing Google Ads token...');
    
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.VITE_GOOGLE_CLIENT_ID,
        client_secret: process.env.VITE_GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Token refresh failed:', errorText);
      return;
    }

    const tokenData = await response.json();
    console.log('✅ Token refreshed successfully');
    console.log('- New Access Token:', tokenData.access_token ? `${tokenData.access_token.substring(0, 20)}...` : 'NOT FOUND');
    console.log('- Expires In:', tokenData.expires_in, 'seconds');

    // Update the database with new token
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));
    
    const { error: updateError } = await supabase
      .from('integrations')
      .update({
        config: {
          tokens: {
            ...tokens,
            accessToken: tokenData.access_token,
            expiresAt: expiresAt.toISOString(),
            expiresIn: tokenData.expires_in
          }
        }
      })
      .eq('platform', 'googleAds');

    if (updateError) {
      console.error('❌ Failed to update token in database:', updateError);
    } else {
      console.log('✅ Token updated in database');
      await testGoogleAdsAPI(tokenData.access_token, integration.config?.manager_account_id);
    }

  } catch (error) {
    console.error('❌ Token refresh error:', error);
  }
}

async function testGoogleAdsAPI(accessToken, managerAccountId) {
  try {
    console.log('\n🔍 Testing Google Ads API with valid token...');
    console.log('Manager Account ID:', managerAccountId);

    if (!managerAccountId) {
      console.error('❌ No manager account ID found');
      return;
    }

    // Test API call to get customer client accounts
    const query = `
      SELECT 
        customer_client.client_customer,
        customer_client.descriptive_name,
        customer_client.manager,
        customer_client.level
      FROM customer_client
    `;

    const response = await fetch(`https://googleads.googleapis.com/v21/customers/${managerAccountId}/googleAds:search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': googleAdsDevToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: query
      })
    });

    console.log('API Response Status:', response.status);
    console.log('API Response OK:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ API Error Response:', errorText);
    } else {
      const data = await response.json();
      console.log('✅ API Success Response:');
      console.log('- Results Count:', data.results?.length || 0);
      if (data.results && data.results.length > 0) {
        console.log('- First Result:', JSON.stringify(data.results[0], null, 2));
      }
    }

  } catch (error) {
    console.error('❌ API Test Error:', error);
  }
}

testGoogleAdsTokens();
