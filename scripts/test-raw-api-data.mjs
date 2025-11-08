#!/usr/bin/env node

/**
 * Test raw API data to see exactly what we're getting
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

// Get date range (last 30 days) - same as other scripts
const dateEnd = new Date();
const dateStart = new Date();
dateStart.setDate(dateStart.getDate() - 30);
// Format as YYYY-MM-DD
const dateStartStr = dateStart.toISOString().split('T')[0];
const dateEndStr = dateEnd.toISOString().split('T')[0];

console.log('Date range:', dateStartStr, 'to', dateEndStr);

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

async function main() {
  console.log('🔍 Testing Raw API Data\n');
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

  // Test 1: Campaign Types Query
  const campaignTypesQuery = `
    SELECT
      segments.date,
      campaign.advertising_channel_type,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions,
      metrics.cost_micros
    FROM campaign
    WHERE segments.date BETWEEN '${dateStartStr}' AND '${dateEndStr}'
    ORDER BY metrics.conversions DESC
  `.trim();

  console.log('📊 Testing Campaign Types Query...\n');
  const campaignData = await makeApiRequest(customerId, managerId, accessToken, campaignTypesQuery);
  
  console.log('   Response keys:', Object.keys(campaignData));
  console.log(`   Total results: ${campaignData.results?.length || 0}`);
  
  // Google Ads API might return data in batches
  let allResults = [];
  if (Array.isArray(campaignData)) {
    // Response is an array of batches
    for (const batch of campaignData) {
      if (batch.results) {
        allResults = allResults.concat(batch.results);
      }
    }
  } else if (campaignData.results) {
    allResults = campaignData.results;
  }
  
  console.log(`   Total results (after processing): ${allResults.length}`);
  if (allResults.length > 0) {
    console.log('   Sample result structure:', JSON.stringify(allResults[0], null, 2).substring(0, 500));
  }
  
  // Analyze campaign types
  const campaignTypeCounts = {};
  const campaignTypeData = {};
  
  for (const result of allResults) {
    const channelType = result.campaign?.advertisingChannelType || result.campaign?.advertising_channel_type;
    const conversions = parseInt(result.metrics?.conversions || '0');
    const impressions = parseInt(result.metrics?.impressions || '0');
    
    if (channelType) {
      campaignTypeCounts[channelType] = (campaignTypeCounts[channelType] || 0) + 1;
      if (!campaignTypeData[channelType]) {
        campaignTypeData[channelType] = { conversions: 0, impressions: 0 };
      }
      campaignTypeData[channelType].conversions += conversions;
      campaignTypeData[channelType].impressions += impressions;
    } else {
      console.log('   ⚠️  Result without channelType:', Object.keys(result));
    }
  }
  
  console.log('\n📈 Campaign Types Found:');
  if (Object.keys(campaignTypeCounts).length === 0) {
    console.log('   No campaign types found');
  } else {
    for (const [type, count] of Object.entries(campaignTypeCounts)) {
      const data = campaignTypeData[type];
      console.log(`   ${type}: ${count} results, ${data.conversions} conversions, ${data.impressions} impressions`);
    }
  }
  
  // Test 2: Ad Formats Query (only for Search/Display/Video)
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
    WHERE segments.date BETWEEN '${dateStartStr}' AND '${dateEndStr}'
      AND campaign.advertising_channel_type IN ('SEARCH', 'DISPLAY', 'VIDEO')
    ORDER BY metrics.conversions DESC
  `.trim();

  console.log('\n📱 Testing Ad Formats Query...\n');
  const adFormatData = await makeApiRequest(customerId, managerId, accessToken, adFormatsQuery);
  
  // Analyze ad types
  const adTypeCounts = {};
  const adTypeData = {};
  
  for (const result of adFormatData.results || []) {
    const adType = result.adGroupAd?.ad?.type || result.ad_group_ad?.ad?.type;
    const conversions = parseInt(result.metrics?.conversions || '0');
    const impressions = parseInt(result.metrics?.impressions || '0');
    
    if (adType) {
      adTypeCounts[adType] = (adTypeCounts[adType] || 0) + 1;
      if (!adTypeData[adType]) {
        adTypeData[adType] = { conversions: 0, impressions: 0 };
      }
      adTypeData[adType].conversions += conversions;
      adTypeData[adType].impressions += impressions;
    }
  }
  
  console.log('📈 Ad Types Found:');
  if (Object.keys(adTypeCounts).length === 0) {
    console.log('   No ad format data (account may only have Performance Max campaigns)');
  } else {
    for (const [type, count] of Object.entries(adTypeCounts)) {
      const data = adTypeData[type];
      console.log(`   ${type}: ${count} results, ${data.conversions} conversions, ${data.impressions} impressions`);
    }
  }
  
  // Test 3: Performance Max Asset Groups
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
    WHERE segments.date BETWEEN '${dateStartStr}' AND '${dateEndStr}'
      AND campaign.advertising_channel_type = 'PERFORMANCE_MAX'
    ORDER BY metrics.conversions DESC
  `.trim();

  console.log('\n🎯 Testing Performance Max Asset Groups...\n');
  const pmData = await makeApiRequest(customerId, managerId, accessToken, performanceMaxQuery);
  
  let pmConversions = 0;
  let pmImpressions = 0;
  
  for (const result of pmData.results || []) {
    pmConversions += parseInt(result.metrics?.conversions || '0');
    pmImpressions += parseInt(result.metrics?.impressions || '0');
  }
  
  console.log(`📈 Performance Max Asset Groups: ${pmData.results?.length || 0} results, ${pmConversions} conversions, ${pmImpressions} impressions`);
  
  console.log('\n✅ Summary:');
  console.log('   Campaign Types:', Object.keys(campaignTypeCounts).join(', ') || 'None');
  console.log('   Ad Formats:', Object.keys(adTypeCounts).join(', ') || 'None (Performance Max only)');
  console.log('   Performance Max:', pmConversions > 0 ? `${pmConversions} conversions` : 'No data');
}

main().catch(console.error);

