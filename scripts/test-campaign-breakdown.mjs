#!/usr/bin/env node

/**
 * Google Ads Campaign Breakdown Test Script
 * Tests the exact queries used for Ad Formats and Campaign Types
 * 
 * Usage:
 *   node scripts/test-campaign-breakdown.mjs [customerId]
 * 
 * Example:
 *   node scripts/test-campaign-breakdown.mjs 5894368498
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
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const API_VERSION = 'v22';
const DEVELOPER_TOKEN = process.env.VITE_GOOGLE_ADS_DEVELOPER_TOKEN || process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '5D7nPWHfNnpiMgxGOgNLlA';

if (!DEVELOPER_TOKEN) {
  console.error('❌ Missing VITE_GOOGLE_ADS_DEVELOPER_TOKEN');
  process.exit(1);
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

    // Default fallback
    return '3791504588';
  } catch (error) {
    console.warn('⚠️  Could not get manager account ID from database, using default:', error.message);
    return '3791504588';
  }
}

async function findSavannaRooftopCustomerId() {
  try {
    const { data: clients } = await supabase
      .from('clients')
      .select('id, name, accounts')
      .ilike('name', '%savanna%');

    if (clients && clients.length > 0) {
      const client = clients[0];
      const googleAdsAccount = client.accounts?.googleAds;
      if (googleAdsAccount && googleAdsAccount !== 'none') {
        return {
          clientId: client.id,
          clientName: client.name,
          customerId: String(googleAdsAccount).replace(/\D/g, '')
        };
      }
    }
    return null;
  } catch (error) {
    console.error('❌ Failed to find Savanna Rooftop:', error.message);
    return null;
  }
}

function normalizeCid(cid) {
  return String(cid).replace(/\D/g, '');
}

async function testApiCall(customerId, managerId, accessToken, query, testName) {
  const normalizedCustomerId = normalizeCid(customerId);
  const url = `https://googleads.googleapis.com/${API_VERSION}/customers/${normalizedCustomerId}/googleAds:searchStream`;
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`${testName}`);
  console.log(`${'='.repeat(80)}`);
  console.log(`\n📝 Query:`);
  console.log(query);
  console.log(`\n🔗 URL: ${url}`);
  console.log(`\n⏳ Making API request...\n`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': DEVELOPER_TOKEN,
        'login-customer-id': normalizeCid(managerId),
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
        
        // Check for specific field errors
        if (error.error?.message) {
          const message = error.error.message;
          if (message.includes('Unrecognized field') || message.includes('invalid field')) {
            console.error('\n⚠️  FIELD PATH ERROR - This query uses an invalid field path!');
          }
        }
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
      console.log(`\n📊 Total results: ${totalResults}`);
      
      if (totalResults > 0) {
        console.log('\n📋 Sample data (first result):');
        const firstResult = results[0]?.results?.[0];
        if (firstResult) {
          console.log(JSON.stringify(firstResult, null, 2));
          
          // Show structure analysis
          console.log('\n🔍 Structure Analysis:');
          console.log('  - Has campaign:', !!firstResult.campaign);
          console.log('  - Has adGroupAd:', !!(firstResult.adGroupAd || firstResult.ad_group_ad));
          console.log('  - Has adGroup:', !!(firstResult.adGroupAd?.adGroup || firstResult.ad_group_ad?.ad_group));
          console.log('  - Has metrics:', !!firstResult.metrics);
          
          if (firstResult.campaign) {
            console.log('  - Campaign keys:', Object.keys(firstResult.campaign));
            console.log('  - advertising_channel_type:', firstResult.campaign.advertising_channel_type || firstResult.campaign.advertisingChannelType);
          }
          
          if (firstResult.adGroupAd || firstResult.ad_group_ad) {
            const adGroupAd = firstResult.adGroupAd || firstResult.ad_group_ad;
            console.log('  - adGroupAd keys:', Object.keys(adGroupAd));
            if (adGroupAd.ad) {
              console.log('  - ad.type:', adGroupAd.ad.type || adGroupAd.ad.type_);
            }
            if (adGroupAd.adGroup || adGroupAd.ad_group) {
              const adGroup = adGroupAd.adGroup || adGroupAd.ad_group;
              console.log('  - adGroup keys:', Object.keys(adGroup));
              if (adGroup.campaign) {
                console.log('  - adGroup.campaign keys:', Object.keys(adGroup.campaign));
                console.log('  - adGroup.campaign.advertising_channel_type:', 
                  adGroup.campaign.advertising_channel_type || adGroup.campaign.advertisingChannelType);
              }
            }
          }
        }
      } else {
        console.log('\n⚠️  No results returned - this could mean:');
        console.log('   - No data for the date range');
        console.log('   - No active campaigns');
        console.log('   - Query structure issue');
      }
      
      return data;
    } catch {
      console.log('   Response:', text.substring(0, 500));
      return text;
    }
  } catch (error) {
    console.error(`❌ Request failed: ${error.message}`);
    return null;
  }
}

async function main() {
  let customerId = process.argv[2];
  
  // If no customer ID provided, try to find Savanna Rooftop
  if (!customerId) {
    console.log('🔍 No customer ID provided, searching for Savanna Rooftop...\n');
    const savanna = await findSavannaRooftopCustomerId();
    if (savanna) {
      console.log(`✅ Found: ${savanna.clientName} (Customer ID: ${savanna.customerId})\n`);
      customerId = savanna.customerId;
    } else {
      console.error('❌ Missing customer ID and could not find Savanna Rooftop');
      console.error('Usage: node scripts/test-campaign-breakdown.mjs <customerId>');
      console.error('Example: node scripts/test-campaign-breakdown.mjs 5894368498');
      process.exit(1);
    }
  }

  console.log('🧪 Google Ads Campaign Breakdown Test Script\n');
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
  const normalizedCustomerId = normalizeCid(customerId);
  
  // Use recent date range (last 30 days)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 30);
  const dateStart = startDate.toISOString().split('T')[0];
  const dateEnd = endDate.toISOString().split('T')[0];

  console.log(`\n📅 Date Range: ${dateStart} to ${dateEnd}\n`);

  // Test 1: Combined query with nested path (current approach)
  const combinedQuery = `
    SELECT
      segments.date,
      ad_group_ad.ad_group.campaign.advertising_channel_type,
      ad_group_ad.ad.type,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions,
      metrics.cost_micros
    FROM ad_group_ad
    WHERE segments.date BETWEEN '${dateStart}' AND '${dateEnd}'
    ORDER BY metrics.conversions DESC
  `.trim();
  
  await testApiCall(normalizedCustomerId, managerId, accessToken, combinedQuery, 
    '1️⃣ Testing Combined Query (ad_group_ad with nested campaign path)');

  // Test 2: Campaign types query (works for all campaign types including Performance Max)
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
    ORDER BY metrics.conversions DESC
  `.trim();
  
  await testApiCall(normalizedCustomerId, managerId, accessToken, campaignTypesQuery, 
    '2️⃣ Testing Campaign Types Query (FROM campaign - includes Performance Max)');

  // Test 3: Ad formats query for Search, Display, Video campaigns
  // Note: MOBILE_APP variants cannot be used in WHERE clause
  const adFormatsQuery = `
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
      AND campaign.advertising_channel_type IN ('SEARCH', 'DISPLAY', 'VIDEO')
    ORDER BY metrics.conversions DESC
  `.trim();
  
  await testApiCall(normalizedCustomerId, managerId, accessToken, adFormatsQuery, 
    '3️⃣ Testing Ad Formats Query (FROM ad_group_ad - Search/Display/Video only)');

  // Test 4: Performance Max asset_group query
  const performanceMaxQuery = `
    SELECT
      segments.date,
      asset_group.id,
      asset_group.name,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions,
      metrics.cost_micros
    FROM asset_group
    WHERE segments.date BETWEEN '${dateStart}' AND '${dateEnd}'
      AND campaign.advertising_channel_type = 'PERFORMANCE_MAX'
    ORDER BY metrics.conversions DESC
  `.trim();
  
  await testApiCall(normalizedCustomerId, managerId, accessToken, performanceMaxQuery, 
    '4️⃣ Testing Performance Max Asset Group Query');

  // Test 5: Summary - Show what data we'll get from combining queries
  console.log('\n' + '='.repeat(80));
  console.log('📊 Summary: Combining Queries');
  console.log('='.repeat(80));
  console.log('\n✅ Query 2 (Campaign Types): Returns data for ALL campaign types including Performance Max');
  console.log('✅ Query 3 (Ad Formats): Returns data for Search/Display/Video campaigns only');
  console.log('✅ Query 4 (Performance Max): Returns asset_group data for Performance Max campaigns');
  console.log('\n💡 The code will combine:');
  console.log('   - Campaign Types: From Query 2 (all campaign types)');
  console.log('   - Ad Formats: From Query 3 (traditional campaigns) + Query 4 (Performance Max → responsive display)');
  console.log('');

  console.log('\n' + '='.repeat(80));
  console.log('🏁 Test Complete!');
  console.log('='.repeat(80));
  console.log('\n💡 Next Steps:');
  console.log('   - Check which queries succeeded');
  console.log('   - Review the structure analysis to see actual field paths');
  console.log('   - Update the code to use the working query structure\n');
}

main().catch(console.error);

