#!/usr/bin/env node

/**
 * Test Google Ads API Authentication and Campaign Breakdown Queries
 * Tests the EXACT queries used in the service
 * 
 * Usage:
 *   node scripts/test-authentication-and-queries.mjs [customerId]
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

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://bdmcdyxjdkgitphieklb.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbWNkeXhqZGtnaXRwaGlla2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0Mzk3MDYsImV4cCI6MjA3NTAxNTcwNn0.QwmjIXs7PbTi21GGDNd1Z0EQR2R6B_fwYWCXDFeOCPw';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const API_VERSION = 'v22';
const DEVELOPER_TOKEN = process.env.VITE_GOOGLE_ADS_DEVELOPER_TOKEN || process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '5D7nPWHfNnpiMgxGOgNLlA';

if (!DEVELOPER_TOKEN) {
  console.error('❌ Missing VITE_GOOGLE_ADS_DEVELOPER_TOKEN');
  process.exit(1);
}

function normalizeCid(cid) {
  return String(cid).replace(/\D/g, '');
}

async function getAccessToken() {
  try {
    // Try integrations table first (new structure)
    const { data: integration } = await supabase
      .from('integrations')
      .select('config')
      .eq('platform', 'googleAds')
      .eq('connected', true)
      .single();

    if (integration?.config?.tokens?.accessToken) {
      return integration.config.tokens.accessToken;
    }

    // Fallback to user_google_ads_auth table (old structure)
    const { data: auth } = await supabase
      .from('user_google_ads_auth')
      .select('*')
      .limit(1)
      .single();

    if (auth && auth.access_token) {
      return auth.access_token;
    }

    throw new Error('No Google Ads auth found');
  } catch (error) {
    console.error('❌ Failed to get access token:', error.message);
    throw error;
  }
}

async function getManagerAccountId() {
  try {
    // Try integrations table first
    const { data: integration } = await supabase
      .from('integrations')
      .select('account_id, config')
      .eq('platform', 'googleAds')
      .eq('connected', true)
      .single();

    if (integration) {
      const managerId = integration.config?.manager_account_id || integration.account_id;
      if (managerId) {
        return String(managerId).replace(/\D/g, '');
      }
    }

    // Fallback to google_ads_configs table
    const { data: config } = await supabase
      .from('google_ads_configs')
      .select('*')
      .eq('is_active', true)
      .single();

    if (config) {
      return String(config.manager_account_id || config.managerAccountId || '3791504588').replace(/\D/g, '');
    }

    return '3791504588';
  } catch (error) {
    console.warn('⚠️  Could not get manager account ID, using default:', error.message);
    return '3791504588';
  }
}

async function testApiCall(customerId, managerId, accessToken, query, testName) {
  const normalizedCustomerId = normalizeCid(customerId);
  const normalizedManagerId = normalizeCid(managerId);
  const url = `https://googleads.googleapis.com/${API_VERSION}/customers/${normalizedCustomerId}/googleAds:searchStream`;
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`${testName}`);
  console.log(`${'='.repeat(80)}`);
  console.log(`\n📝 Query:`);
  console.log(query);
  console.log(`\n🔗 URL: ${url}`);
  console.log(`\n🔑 Headers:`);
  console.log(`   Authorization: Bearer ${accessToken.substring(0, 20)}...`);
  console.log(`   developer-token: ${DEVELOPER_TOKEN.substring(0, 10)}...`);
  console.log(`   login-customer-id: ${normalizedManagerId}`);
  console.log(`\n⏳ Making API request...\n`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': DEVELOPER_TOKEN,
        'login-customer-id': normalizedManagerId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    });

    const text = await response.text();
    
    if (!response.ok) {
      console.error(`❌ Error (${response.status} ${response.statusText}):`);
      try {
        const error = JSON.parse(text);
        console.error(JSON.stringify(error, null, 2));
        
        // Detailed error analysis
        if (response.status === 401) {
          console.error('\n🔍 401 Authentication Error Analysis:');
          if (error.error?.message) {
            console.error(`   Error Message: ${error.error.message}`);
          }
          if (error.error?.code) {
            console.error(`   Error Code: ${error.error.code}`);
          }
          console.error('\n💡 Possible causes:');
          console.error('   1. Access token expired or invalid');
          console.error('   2. Developer token incorrect');
          console.error('   3. Manager account ID (login-customer-id) incorrect');
          console.error('   4. Token refresh failed');
        }
      } catch {
        console.error(text);
      }
      return { success: false, status: response.status, error: text };
    }

    console.log('✅ Success');
    try {
      const data = JSON.parse(text);
      const results = Array.isArray(data) ? data : [data];
      const totalResults = results.reduce((sum, block) => sum + (block.results?.length || 0), 0);
      console.log(`\n📊 Total results: ${totalResults}`);
      
      if (totalResults > 0) {
        console.log('\n📋 Sample data (first result):');
        const firstResult = results[0]?.results?.[0];
        if (firstResult) {
          console.log(JSON.stringify(firstResult, null, 2));
        }
      } else {
        console.log('\n⚠️  No results returned');
      }
      
      return { success: true, data, totalResults };
    } catch {
      console.log('   Response:', text.substring(0, 500));
      return { success: true, data: text };
    }
  } catch (error) {
    console.error(`❌ Request failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  let customerId = process.argv[2];
  
  if (!customerId) {
    console.error('❌ Missing customer ID');
    console.error('Usage: node scripts/test-authentication-and-queries.mjs <customerId>');
    console.error('Example: node scripts/test-authentication-and-queries.mjs 3892760613');
    process.exit(1);
  }

  console.log('🧪 Google Ads API Authentication & Query Test\n');
  console.log(`Customer ID: ${customerId}`);

  // Get credentials
  console.log('\n📋 Fetching credentials...');
  let accessToken, managerId;
  
  try {
    [accessToken, managerId] = await Promise.all([
      getAccessToken(),
      getManagerAccountId()
    ]);
    console.log(`✅ Access token: ${accessToken.substring(0, 20)}... (length: ${accessToken.length})`);
    console.log(`✅ Manager ID: ${managerId}`);
    console.log(`✅ Developer Token: ${DEVELOPER_TOKEN.substring(0, 10)}... (length: ${DEVELOPER_TOKEN.length})`);
  } catch (error) {
    console.error('❌ Failed to get credentials:', error.message);
    process.exit(1);
  }

  // Normalize customer ID
  const normalizedCustomerId = normalizeCid(customerId);
  
  // Use recent date range (last 30 days)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 30);
  const dateStart = startDate.toISOString().split('T')[0];
  const dateEnd = endDate.toISOString().split('T')[0];

  console.log(`\n📅 Date Range: ${dateStart} to ${dateEnd}\n`);

  // Test 1: Campaign Types Query (EXACT from service)
  const campaignTypesQuery = `
    SELECT
      segments.date,
      campaign.advertising_channel_type,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions,
      metrics.cost_micros
    FROM campaign
    WHERE segments.date BETWEEN '${dateStart}' AND '${dateEnd}'
      AND campaign.status != 'REMOVED'
    ORDER BY metrics.conversions DESC
  `.trim();
  
  const result1 = await testApiCall(normalizedCustomerId, managerId, accessToken, campaignTypesQuery, 
    '1️⃣ Campaign Types Query (FROM campaign)');

  // Test 2: Search Ad Formats Query (EXACT from service)
  const searchAdFormatsQuery = `
    SELECT
      segments.date,
      ad_group_ad.ad.type,
      campaign.advertising_channel_type,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions,
      metrics.cost_micros
    FROM ad_group_ad
    WHERE segments.date BETWEEN '${dateStart}' AND '${dateEnd}'
      AND campaign.advertising_channel_type = 'SEARCH'
      AND campaign.status != 'REMOVED'
    ORDER BY metrics.conversions DESC
  `.trim();
  
  const result2 = await testApiCall(normalizedCustomerId, managerId, accessToken, searchAdFormatsQuery, 
    '2️⃣ Search Ad Formats Query (FROM ad_group_ad)');

  // Test 3: Performance Max Asset Query (EXACT from service)
  const performanceMaxAdFormatsQuery = `
    SELECT
      segments.date,
      segments.ad_network_type,
      campaign.id,
      asset_group.id,
      asset.id,
      asset.type,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions,
      metrics.cost_micros
    FROM asset_group_asset
    WHERE segments.date BETWEEN '${dateStart}' AND '${dateEnd}'
      AND campaign.advertising_channel_type = 'PERFORMANCE_MAX'
      AND campaign.status != 'REMOVED'
    ORDER BY metrics.conversions DESC
  `.trim();
  
  const result3 = await testApiCall(normalizedCustomerId, managerId, accessToken, performanceMaxAdFormatsQuery, 
    '3️⃣ Performance Max Asset Query (FROM asset_group_asset)');

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 Test Summary');
  console.log('='.repeat(80));
  console.log(`\n1. Campaign Types: ${result1.success ? '✅ SUCCESS' : '❌ FAILED'} ${result1.totalResults ? `(${result1.totalResults} results)` : ''}`);
  console.log(`2. Search Ad Formats: ${result2.success ? '✅ SUCCESS' : '❌ FAILED'} ${result2.totalResults ? `(${result2.totalResults} results)` : ''}`);
  console.log(`3. Performance Max Assets: ${result3.success ? '✅ SUCCESS' : '❌ FAILED'} ${result3.totalResults ? `(${result3.totalResults} results)` : ''}`);
  
  if (!result1.success || !result2.success || !result3.success) {
    console.log('\n❌ Some queries failed. Check error messages above.');
    process.exit(1);
  } else {
    console.log('\n✅ All queries succeeded!');
  }
}

main().catch(console.error);

