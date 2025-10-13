#!/usr/bin/env node

// Test script to check Google Ads environment variables and API
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });
config({ path: '.env.development' });
config({ path: '.env' });

console.log('🔍 Environment Variables Test');
console.log('============================');

// Check Google Ads environment variables
const googleAdsDevToken = process.env.VITE_GOOGLE_ADS_DEVELOPER_TOKEN;
const googleClientId = process.env.VITE_GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.VITE_GOOGLE_CLIENT_SECRET;

console.log('Google Ads Developer Token:', googleAdsDevToken ? `${googleAdsDevToken.substring(0, 10)}...` : 'NOT FOUND');
console.log('Google Client ID:', googleClientId ? `${googleClientId.substring(0, 20)}...` : 'NOT FOUND');
console.log('Google Client Secret:', googleClientSecret ? `${googleClientSecret.substring(0, 10)}...` : 'NOT FOUND');

// Check Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('\nSupabase Configuration:');
console.log('Supabase URL:', supabaseUrl ? 'FOUND' : 'NOT FOUND');
console.log('Supabase Key:', supabaseKey ? 'FOUND' : 'NOT FOUND');

// Test Google Ads API call
console.log('\n🔍 Testing Google Ads API...');

async function testGoogleAdsAPI() {
  try {
    if (!googleAdsDevToken) {
      throw new Error('Google Ads Developer Token not found');
    }

    // Test API call to list accessible customers
    const response = await fetch('https://googleads.googleapis.com/v21/customers:listAccessibleCustomers', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${googleAdsDevToken}`,
        'developer-token': googleAdsDevToken,
        'Content-Type': 'application/json'
      }
    });

    console.log('API Response Status:', response.status);
    console.log('API Response OK:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('API Error Response:', errorText);
    } else {
      const data = await response.json();
      console.log('API Success Response:', JSON.stringify(data, null, 2));
    }

  } catch (error) {
    console.error('API Test Error:', error.message);
  }
}

testGoogleAdsAPI();
