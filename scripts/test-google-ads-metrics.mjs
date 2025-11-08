#!/usr/bin/env node
/**
 * Test Google Ads Metrics API for Camarillo Ranch
 * Account ID: 3815117380
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try multiple env file locations
dotenv.config({ path: join(__dirname, '..', '.env.local') });
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Looking for: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY');
  console.error('   Or: SUPABASE_URL, SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Camarillo Ranch account
const CAMARILLO_ACCOUNT = '3815117380';
const CLIENT_ID = 'fd5632bd-ca1e-4dac-8eee-0385b4e487ea';

function normalizeCid(id) {
  return String(id).replace(/\D/g, '');
}

async function getCredentials() {
  // Match the service's approach:
  // 1. Get access token from user_google_ads_auth
  // 2. Get developer token from environment variable
  // 3. Get manager account ID from integrations table

  // Get access token
  const { data: auth, error: authError } = await supabase
    .from('user_google_ads_auth')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (authError) {
    throw new Error(`Error fetching Google Ads auth: ${authError.message}`);
  }

  if (!auth || !auth.access_token) {
    throw new Error('No Google Ads auth token found in database');
  }

  // Get developer token from environment
  const developerToken = process.env.VITE_GOOGLE_ADS_DEVELOPER_TOKEN || process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (!developerToken) {
    throw new Error('Google Ads developer token not found in environment variables (VITE_GOOGLE_ADS_DEVELOPER_TOKEN)');
  }

  // Get manager account ID from integrations table
  const { data: integration, error: integrationError } = await supabase
    .from('integrations')
    .select('account_id')
    .eq('platform', 'googleAds')
    .maybeSingle();

  let managerAccountId = '3791504588'; // Default fallback
  if (integration && integration.account_id) {
    managerAccountId = integration.account_id;
  } else if (integrationError) {
    console.log('⚠️  Could not fetch manager account from integrations, using default:', managerAccountId);
  }

  return {
    accessToken: auth.access_token,
    developerToken,
    managerAccountId
  };
}

async function testMetricsAPI(customerId, dateRange, credentials) {
  const { accessToken, developerToken, managerAccountId } = credentials;
  const pathCid = normalizeCid(customerId);
  const loginCid = normalizeCid(managerAccountId);

  console.log('\n📊 Testing Metrics API...');
  console.log('   Customer ID:', pathCid);
  console.log('   Manager ID:', loginCid);
  console.log('   Date Range:', dateRange);

  // Test the optimized query using customer resource
  const gaql = `SELECT metrics.conversions, metrics.cost_micros, metrics.impressions, metrics.clicks FROM customer WHERE segments.date BETWEEN '${dateRange.start}' AND '${dateRange.end}'`;
  
  console.log('\n📝 GAQL Query:');
  console.log(gaql);

  const url = `https://googleads.googleapis.com/v22/customers/${pathCid}/googleAds:searchStream`;
  
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'developer-token': developerToken,
    'login-customer-id': loginCid,
    'Content-Type': 'application/json'
  };

  console.log('\n🔗 Making API request...');
  console.log('   URL:', url);
  console.log('   Headers:', {
    'Authorization': 'Bearer ***',
    'developer-token': developerToken ? '***' : 'Missing',
    'login-customer-id': loginCid,
    'Content-Type': 'application/json'
  });

  const startTime = Date.now();
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: gaql })
    });

    const elapsed = Date.now() - startTime;
    console.log(`\n⏱️  Response time: ${elapsed}ms`);
    console.log('   Status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('\n❌ API Error:');
      console.error('   Status:', response.status);
      console.error('   Response:', errorText.substring(0, 500));
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    const text = await response.text();
    console.log('\n✅ Response received');
    console.log('   Response length:', text.length, 'bytes');

    // Parse the response
    const blocks = JSON.parse(text);
    console.log('   Blocks:', Array.isArray(blocks) ? blocks.length : 'Not an array');

    let impressions = 0, clicks = 0, costMicros = 0, conversions = 0;
    let resultCount = 0;

    for (const block of blocks) {
      const results = block.results || [];
      resultCount += results.length;
      
      for (const result of results) {
        const m = result.metrics || {};
        const costMicrosValue = m.cost_micros || m.costMicros || 0;
        
        impressions += Number(m.impressions || 0);
        clicks += Number(m.clicks || 0);
        costMicros += Number(costMicrosValue);
        conversions += Number(m.conversions || 0);
      }
    }

    console.log('\n📈 Results:');
    console.log('   Result rows:', resultCount);
    console.log('   Impressions:', impressions.toLocaleString());
    console.log('   Clicks:', clicks.toLocaleString());
    console.log('   Cost (micros):', costMicros.toLocaleString());
    console.log('   Cost (dollars):', (costMicros / 1e6).toFixed(2));
    console.log('   Conversions:', conversions.toLocaleString());
    console.log('   CTR:', impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) + '%' : '0%');
    console.log('   CPC:', clicks > 0 ? ((costMicros / 1e6) / clicks).toFixed(2) : '$0.00');
    console.log('   Conversion Rate:', clicks > 0 ? ((conversions / clicks) * 100).toFixed(2) + '%' : '0%');
    console.log('   Cost Per Lead:', conversions > 0 ? ((costMicros / 1e6) / conversions).toFixed(2) : '$0.00');

    if (resultCount === 0) {
      console.log('\n⚠️  WARNING: No results returned from API');
      console.log('   This could mean:');
      console.log('   - No data for the date range');
      console.log('   - Account has no active campaigns');
      console.log('   - Query syntax issue');
    }

    return {
      impressions,
      clicks,
      cost: costMicros / 1e6,
      conversions,
      resultCount
    };
  } catch (error) {
    console.error('\n❌ Error testing metrics API:', error.message);
    throw error;
  }
}

async function main() {
  console.log('🧪 Testing Google Ads Metrics API for Camarillo Ranch\n');
  console.log('Account ID:', CAMARILLO_ACCOUNT);
  console.log('Client ID:', CLIENT_ID);

  // Get date range (last 30 days)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 30);
  const dateRange = {
    start: startDate.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0]
  };

  console.log('Date Range:', dateRange);

  try {
    const credentials = await getCredentials();
    console.log('\n✅ Credentials obtained');
    console.log('   Developer Token:', credentials.developerToken ? '***' : 'Missing');
    console.log('   Manager Account ID:', credentials.managerAccountId);
    console.log('   Access Token:', credentials.accessToken.substring(0, 20) + '...');

    const result = await testMetricsAPI(CAMARILLO_ACCOUNT, dateRange, credentials);

    console.log('\n✅ Test completed successfully');
    console.log('\n📊 Final Metrics:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main().catch(console.error);

