#!/usr/bin/env node

/**
 * Google Ads API Test Script
 * Tests demographics and campaign breakdown queries
 * 
 * Usage:
 *   node scripts/test-google-ads-api.mjs [customerId]
 * 
 * Example:
 *   node scripts/test-google-ads-api.mjs 5894368498
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env.local');
config({ path: envPath });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const API_VERSION = 'v21';
const DEVELOPER_TOKEN = process.env.VITE_GOOGLE_ADS_DEVELOPER_TOKEN;

if (!DEVELOPER_TOKEN) {
  console.error('❌ Missing VITE_GOOGLE_ADS_DEVELOPER_TOKEN');
  process.exit(1);
}

async function getAccessToken() {
  try {
    const { data: auth } = await supabase
      .from('user_google_ads_auth')
      .select('*')
      .limit(1)
      .single();

    if (!auth || !auth.access_token) {
      throw new Error('No Google Ads auth found');
    }

    return auth.access_token;
  } catch (error) {
    console.error('❌ Failed to get access token:', error.message);
    throw error;
  }
}

async function getManagerAccountId() {
  try {
    const { data: config } = await supabase
      .from('google_ads_configs')
      .select('*')
      .eq('is_active', true)
      .single();

    if (!config) {
      throw new Error('No active Google Ads config found');
    }

    return String(config.manager_account_id || config.managerAccountId || '3791504588').replace(/\D/g, '');
  } catch (error) {
    console.error('❌ Failed to get manager account ID:', error.message);
    throw error;
  }
}

async function testApiCall(customerId, managerId, accessToken, query, testName) {
  const url = `https://googleads.googleapis.com/${API_VERSION}/customers/${customerId}/googleAds:searchStream`;
  
  console.log(`\n${testName}`);
  console.log(`Query: ${query}`);
  console.log('');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': DEVELOPER_TOKEN,
        'login-customer-id': managerId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    });

    const text = await response.text();
    
    if (!response.ok) {
      console.error(`❌ Error (${response.status}):`);
      try {
        const error = JSON.parse(text);
        console.error(JSON.stringify(error, null, 2));
      } catch {
        console.error(text);
      }
      return null;
    }

    console.log('✅ Success');
    try {
      const data = JSON.parse(text);
      const results = Array.isArray(data) ? data : [data];
      const totalResults = results.reduce((sum, block) => sum + (block.results?.length || 0), 0);
      console.log(`   Total results: ${totalResults}`);
      
      if (totalResults > 0) {
        console.log('\n   Sample data (first result):');
        const firstResult = results[0]?.results?.[0];
        if (firstResult) {
          console.log(JSON.stringify(firstResult, null, 2).substring(0, 500));
        }
      }
      
      return data;
    } catch {
      console.log('   Response:', text.substring(0, 200));
      return text;
    }
  } catch (error) {
    console.error(`❌ Request failed: ${error.message}`);
    return null;
  }
}

async function main() {
  const customerId = process.argv[2];
  
  if (!customerId) {
    console.error('❌ Missing customer ID');
    console.error('Usage: node scripts/test-google-ads-api.mjs <customerId>');
    console.error('Example: node scripts/test-google-ads-api.mjs 5894368498');
    process.exit(1);
  }

  console.log('🧪 Google Ads API Test Script\n');
  console.log(`Customer ID: ${customerId}`);

  // Get credentials
  console.log('\n📋 Fetching credentials...');
  let accessToken, managerId;
  
  try {
    [accessToken, managerId] = await Promise.all([
      getAccessToken(),
      getManagerAccountId()
    ]);
    console.log(`✅ Access token: ${accessToken.substring(0, 20)}...`);
    console.log(`✅ Manager ID: ${managerId}`);
  } catch (error) {
    console.error('❌ Failed to get credentials:', error.message);
    process.exit(1);
  }

  // Normalize customer ID
  const normalizedCustomerId = String(customerId).replace(/\D/g, '');
  
  // Use recent date range (last 30 days)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 30);
  const dateStart = startDate.toISOString().split('T')[0];
  const dateEnd = endDate.toISOString().split('T')[0];

  console.log(`Date Range: ${dateStart} to ${dateEnd}\n`);

  // Test 1: Gender Demographics using gender_view (same as code)
  const genderQuery = `SELECT ad_group_criterion.gender.type, metrics.conversions, metrics.cost_micros, metrics.impressions, metrics.clicks FROM gender_view WHERE segments.date BETWEEN '${dateStart}' AND '${dateEnd}' AND ad_group_criterion.status = 'ENABLED'`;
  await testApiCall(normalizedCustomerId, managerId, accessToken, genderQuery, '1️⃣ Testing Gender Demographics (gender_view)');

  // Test 2: Age Demographics using age_range_view (same as code)
  const ageQuery = `SELECT ad_group_criterion.age_range.type, metrics.conversions, metrics.cost_micros, metrics.impressions, metrics.clicks FROM age_range_view WHERE segments.date BETWEEN '${dateStart}' AND '${dateEnd}' AND ad_group_criterion.status = 'ENABLED'`;
  await testApiCall(normalizedCustomerId, managerId, accessToken, ageQuery, '2️⃣ Testing Age Demographics (age_range_view)');

  // Test 3: Campaign Breakdown
  const campaignQuery = `SELECT campaign.advertising_channel_type, campaign.name, metrics.conversions, metrics.cost_micros FROM campaign WHERE segments.date BETWEEN '${dateStart}' AND '${dateEnd}' AND campaign.status = 'ENABLED'`;
  await testApiCall(normalizedCustomerId, managerId, accessToken, campaignQuery, '3️⃣ Testing Campaign Breakdown');

  console.log('\n🏁 Test Complete!');
}

main().catch(console.error);
