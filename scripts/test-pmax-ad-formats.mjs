#!/usr/bin/env node

/**
 * Test how Performance Max campaigns report ad format data
 * Try different queries to see what ad format breakdown is available
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env.local');
config({ path: envPath });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://bdmcdyxjdkgitphieklb.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbWNkeXhqZGtnaXRwaGlla2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0Mzk3MDYsImV4cCI6MjA3NTAxNTcwNn0.QwmjIXs7PbTi21GGDNd1Z0EQR2R6B_fwYWCXDFeOCPw';
const supabase = createClient(supabaseUrl, supabaseKey);

const API_VERSION = 'v22';
const DEVELOPER_TOKEN = process.env.VITE_GOOGLE_ADS_DEVELOPER_TOKEN || '5D7nPWHfNnpiMgxGOgNLlA';

const customerId = process.argv[2];
if (!customerId) {
  console.error('❌ Please provide a customer ID');
  process.exit(1);
}

// Get date range (last 30 days)
const dateEnd = new Date();
const dateStart = new Date();
dateStart.setDate(dateStart.getDate() - 30);
const dateStartStr = dateStart.toISOString().split('T')[0];
const dateEndStr = dateEnd.toISOString().split('T')[0];

async function getAccessToken() {
  const { data: integration } = await supabase
    .from('integrations')
    .select('config')
    .eq('platform', 'googleAds')
    .eq('connected', true)
    .single();
  return integration?.config?.tokens?.accessToken;
}

async function getManagerAccountId() {
  const { data: integration } = await supabase
    .from('integrations')
    .select('account_id, config')
    .eq('platform', 'googleAds')
    .eq('connected', true)
    .single();
  return integration?.config?.manager_account_id || integration?.account_id || '3791504588';
}

function normalizeCid(cid) {
  return String(cid).replace(/\D/g, '');
}

async function makeApiRequest(customerId, managerId, accessToken, query) {
  const url = `https://googleads.googleapis.com/${API_VERSION}/customers/${normalizeCid(customerId)}/googleAds:searchStream`;
  
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

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error: ${response.status} - ${text}`);
  }

  return JSON.parse(await response.text());
}

async function testQuery(name, query, customerId, managerId, accessToken) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`${name}`);
  console.log('='.repeat(80));
  console.log(`\n📝 Query:\n${query}\n`);
  
  try {
    const data = await makeApiRequest(customerId, managerId, accessToken, query);
    
    // Handle array response
    let allResults = [];
    if (Array.isArray(data)) {
      for (const batch of data) {
        if (batch.results) {
          allResults = allResults.concat(batch.results);
        }
      }
    } else if (data.results) {
      allResults = data.results;
    }
    
    console.log(`✅ Success - ${allResults.length} results`);
    
    if (allResults.length > 0) {
      console.log('\n📋 Sample result (first):');
      console.log(JSON.stringify(allResults[0], null, 2).substring(0, 1000));
      
      // Show available fields
      console.log('\n🔍 Available fields in result:');
      const sample = allResults[0];
      const fields = Object.keys(sample);
      fields.forEach(field => {
        const value = sample[field];
        if (typeof value === 'object' && value !== null) {
          console.log(`   ${field}: { ${Object.keys(value).join(', ')} }`);
        } else {
          console.log(`   ${field}: ${typeof value}`);
        }
      });
    }
    
    return allResults;
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return [];
  }
}

async function main() {
  console.log('🔍 Testing Performance Max Ad Format Queries\n');
  console.log(`Customer ID: ${customerId}`);
  console.log(`Date Range: ${dateStartStr} to ${dateEndStr}\n`);

  const accessToken = await getAccessToken();
  if (!accessToken) {
    console.error('❌ Failed to get access token');
    process.exit(1);
  }

  const managerId = await getManagerAccountId();
  if (!managerId) {
    console.error('❌ Failed to get manager account ID');
    process.exit(1);
  }

  // Test 1: Performance Max with ad_network_type segment (channel breakdown)
  const query1 = `
    SELECT
      segments.date,
      segments.ad_network_type,
      campaign.advertising_channel_type,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions,
      metrics.cost_micros
    FROM campaign
    WHERE segments.date BETWEEN '${dateStartStr}' AND '${dateEndStr}'
      AND campaign.advertising_channel_type = 'PERFORMANCE_MAX'
    ORDER BY metrics.conversions DESC
  `.trim();

  await testQuery('1️⃣ Performance Max with ad_network_type (channel breakdown)', query1, customerId, managerId, accessToken);

  // Test 2: Performance Max asset_group with ad_network_type
  const query2 = `
    SELECT
      segments.date,
      segments.ad_network_type,
      asset_group.id,
      asset_group.name,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions,
      metrics.cost_micros
    FROM asset_group
    WHERE segments.date BETWEEN '${dateStartStr}' AND '${dateEndStr}'
      AND campaign.advertising_channel_type = 'PERFORMANCE_MAX'
    ORDER BY metrics.conversions DESC
  `.trim();

  await testQuery('2️⃣ Asset Group with ad_network_type (channel breakdown)', query2, customerId, managerId, accessToken);

  // Test 3: Performance Max with performance_view (if available)
  const query3 = `
    SELECT
      segments.date,
      performance_view.ad_network_type,
      performance_view.asset_group_id,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions,
      metrics.cost_micros
    FROM performance_view
    WHERE segments.date BETWEEN '${dateStartStr}' AND '${dateEndStr}'
      AND campaign.advertising_channel_type = 'PERFORMANCE_MAX'
    ORDER BY metrics.conversions DESC
  `.trim();

  await testQuery('3️⃣ Performance View for Performance Max', query3, customerId, managerId, accessToken);

  // Test 4: Check if there's a way to get ad format type from asset_group_asset
  const query4 = `
    SELECT
      segments.date,
      asset_group_asset.asset.type,
      asset_group_asset.asset_group.id,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions,
      metrics.cost_micros
    FROM asset_group_asset
    WHERE segments.date BETWEEN '${dateStartStr}' AND '${dateEndStr}'
      AND campaign.advertising_channel_type = 'PERFORMANCE_MAX'
    ORDER BY metrics.conversions DESC
  `.trim();

  await testQuery('4️⃣ Asset Group Asset with asset type', query4, customerId, managerId, accessToken);

  // Test 5: Performance Max with segment breakdown by device, network, etc.
  const query5 = `
    SELECT
      segments.date,
      segments.device,
      segments.ad_network_type,
      campaign.advertising_channel_type,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions,
      metrics.cost_micros
    FROM campaign
    WHERE segments.date BETWEEN '${dateStartStr}' AND '${dateEndStr}'
      AND campaign.advertising_channel_type = 'PERFORMANCE_MAX'
    ORDER BY metrics.conversions DESC
  `.trim();

  await testQuery('5️⃣ Performance Max with device and network segments', query5, customerId, managerId, accessToken);

  console.log('\n' + '='.repeat(80));
  console.log('✅ Testing Complete!');
  console.log('='.repeat(80));
  console.log('\n💡 Next Steps:');
  console.log('   - Review which queries returned data');
  console.log('   - Check available fields for ad format/channel breakdown');
  console.log('   - Map Performance Max data to ad format categories\n');
}

main().catch(console.error);

