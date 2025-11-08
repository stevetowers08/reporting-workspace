#!/usr/bin/env node

/**
 * Test Campaign Types and Ad Formats API Calls
 * Mimics exact logic from googleAdsService.ts
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
const DEVELOPER_TOKEN = process.env.VITE_GOOGLE_ADS_DEVELOPER_TOKEN || process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '5D7nPWHfNnpiMgxGOgNLlA';

function normalizeCid(cid) {
  return String(cid).replace(/\D/g, '');
}

async function getAccessToken() {
  const { data: integration } = await supabase
    .from('integrations')
    .select('config')
    .eq('platform', 'googleAds')
    .eq('connected', true)
    .single();

  if (integration?.config?.tokens?.accessToken) {
    return integration.config.tokens.accessToken;
  }

  const { data: auth } = await supabase
    .from('user_google_ads_auth')
    .select('*')
    .limit(1)
    .single();

  if (auth && auth.access_token) {
    return auth.access_token;
  }

  throw new Error('No Google Ads auth found');
}

async function getManagerAccountId() {
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

  const { data: config } = await supabase
    .from('google_ads_configs')
    .select('*')
    .eq('is_active', true)
    .single();

  if (config) {
    return String(config.manager_account_id || config.managerAccountId || '3791504588').replace(/\D/g, '');
  }

  return '3791504588';
}

async function makeApiRequest(customerId, managerId, accessToken, query, queryName) {
  const url = `https://googleads.googleapis.com/${API_VERSION}/customers/${customerId}/googleAds:searchStream`;
  
  console.log(`\n🔍 ${queryName}`);
  console.log(`   URL: ${url}`);
  console.log(`   Query: ${query.substring(0, 100)}...`);
  
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
    console.error(`   ❌ Error (${response.status}): ${text.substring(0, 200)}`);
    throw new Error(`API Error: ${response.status} - ${text}`);
  }

  const data = JSON.parse(text);
  const blocks = Array.isArray(data) ? data : [data];
  const totalResults = blocks.reduce((sum, block) => sum + (block.results?.length || 0), 0);
  
  console.log(`   ✅ Success: ${totalResults} total results`);
  if (totalResults > 0) {
    console.log(`   📋 Sample result:`, JSON.stringify(blocks[0]?.results?.[0], null, 2).substring(0, 500));
  }
  
  return blocks;
}

async function main() {
  const customerId = process.argv[2] || '3892760613';
  const normalizedCustomerId = normalizeCid(customerId);

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 30);
  const dateStart = startDate.toISOString().split('T')[0];
  const dateEnd = endDate.toISOString().split('T')[0];

  console.log('🧪 Testing Campaign Types & Ad Formats API Calls\n');
  console.log(`Customer ID: ${normalizedCustomerId}`);
  console.log(`Date Range: ${dateStart} to ${dateEnd}`);
  console.log(`Developer Token: ${DEVELOPER_TOKEN.substring(0, 10)}...`);

  const [accessToken, managerId] = await Promise.all([
    getAccessToken(),
    getManagerAccountId()
  ]);

  console.log(`Access Token: ${accessToken.substring(0, 20)}... (length: ${accessToken.length})`);
  console.log(`Manager ID: ${managerId}\n`);

  const dateClause = `segments.date BETWEEN '${dateStart}' AND '${dateEnd}'`;

  // Query 1: Campaign Types
  const campaignTypesQuery = `
    SELECT
      segments.date,
      campaign.advertising_channel_type,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions,
      metrics.cost_micros
    FROM campaign
    WHERE ${dateClause}
      AND campaign.status != 'REMOVED'
    ORDER BY metrics.conversions DESC
  `.trim();

  // Query 2: Search Ad Formats
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
    WHERE ${dateClause}
      AND campaign.advertising_channel_type = 'SEARCH'
      AND campaign.status != 'REMOVED'
    ORDER BY metrics.conversions DESC
  `.trim();

  // Query 3: Performance Max Assets
  // NOTE: Removed segments.ad_network_type to avoid double-counting
  // Each row = one asset per day (aggregated across all networks)
  const performanceMaxQuery = `
    SELECT
      segments.date,
      campaign.id,
      asset_group.id,
      asset.id,
      asset.type,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions,
      metrics.cost_micros
    FROM asset_group_asset
    WHERE ${dateClause}
      AND campaign.advertising_channel_type = 'PERFORMANCE_MAX'
      AND campaign.status != 'REMOVED'
    ORDER BY metrics.conversions DESC
  `.trim();

  console.log('⏳ Executing queries in parallel (like Promise.allSettled)...\n');

  const [campaignResult, searchResult, pmaxResult] = await Promise.allSettled([
    makeApiRequest(normalizedCustomerId, managerId, accessToken, campaignTypesQuery, '1️⃣ Campaign Types Query'),
    makeApiRequest(normalizedCustomerId, managerId, accessToken, searchAdFormatsQuery, '2️⃣ Search Ad Formats Query'),
    makeApiRequest(normalizedCustomerId, managerId, accessToken, performanceMaxQuery, '3️⃣ Performance Max Assets Query')
  ]);

  console.log('\n' + '='.repeat(80));
  console.log('📊 Query Results Summary');
  console.log('='.repeat(80));

  const campaignBlocks = campaignResult.status === 'fulfilled' ? campaignResult.value : [];
  const searchBlocks = searchResult.status === 'fulfilled' ? searchResult.value : [];
  const pmaxBlocks = pmaxResult.status === 'fulfilled' ? pmaxResult.value : [];

  console.log(`\nCampaign Types: ${campaignResult.status === 'fulfilled' ? '✅' : '❌'}`);
  if (campaignResult.status === 'fulfilled') {
    const total = campaignBlocks.reduce((sum, block) => sum + (block.results?.length || 0), 0);
    console.log(`   Total Results: ${total}`);
  } else {
    console.log(`   Error: ${campaignResult.reason?.message || 'Unknown error'}`);
  }

  console.log(`\nSearch Ad Formats: ${searchResult.status === 'fulfilled' ? '✅' : '❌'}`);
  if (searchResult.status === 'fulfilled') {
    const total = searchBlocks.reduce((sum, block) => sum + (block.results?.length || 0), 0);
    console.log(`   Total Results: ${total}`);
  } else {
    console.log(`   Error: ${searchResult.reason?.message || 'Unknown error'}`);
  }

  console.log(`\nPerformance Max Assets: ${pmaxResult.status === 'fulfilled' ? '✅' : '❌'}`);
  if (pmaxResult.status === 'fulfilled') {
    const total = pmaxBlocks.reduce((sum, block) => sum + (block.results?.length || 0), 0);
    console.log(`   Total Results: ${total}`);
    
    // Process and show breakdown by asset type
    const assetTypes = {};
    let processedRows = 0;
    
    for (const block of pmaxBlocks) {
      const results = block.results || [];
      for (const result of results) {
        processedRows++;
        const assetType = result.asset?.type || 
                         result.asset?.type_ ||
                         result.asset?.type?.name ||
                         result.asset?.type_?.name ||
                         'UNKNOWN';
        
        const conversions = parseInt(result.metrics?.conversions || '0');
        const impressions = parseInt(result.metrics?.impressions || '0');
        const clicks = parseInt(result.metrics?.clicks || '0');
        const costMicros = parseInt(result.metrics?.costMicros || '0');
        
        if (!assetTypes[assetType]) {
          assetTypes[assetType] = {
            count: 0,
            conversions: 0,
            impressions: 0,
            clicks: 0,
            costMicros: 0
          };
        }
        
        assetTypes[assetType].count++;
        assetTypes[assetType].conversions += conversions;
        assetTypes[assetType].impressions += impressions;
        assetTypes[assetType].clicks += clicks;
        assetTypes[assetType].costMicros += costMicros;
      }
    }
    
    console.log(`\n   📊 Breakdown by Asset Type:`);
    const assetTypeKeys = Object.keys(assetTypes).sort((a, b) => 
      assetTypes[b].conversions - assetTypes[a].conversions
    );
    
    for (const assetType of assetTypeKeys) {
      const data = assetTypes[assetType];
      const cost = (data.costMicros / 1_000_000).toFixed(2);
      const conversionRate = data.clicks > 0 ? ((data.conversions / data.clicks) * 100).toFixed(2) : '0.00';
      console.log(`      ${assetType}:`);
      console.log(`         Rows: ${data.count.toLocaleString()}`);
      console.log(`         Conversions: ${data.conversions.toLocaleString()}`);
      console.log(`         Impressions: ${data.impressions.toLocaleString()}`);
      console.log(`         Clicks: ${data.clicks.toLocaleString()}`);
      console.log(`         Cost: $${cost}`);
      console.log(`         Conversion Rate: ${conversionRate}%`);
    }
    
    console.log(`\n   ✅ Processed ${processedRows.toLocaleString()} rows from ${total.toLocaleString()} total results`);
  } else {
    console.log(`   Error: ${pmaxResult.reason?.message || 'Unknown error'}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Test Complete - Compare these results with browser console logs');
  console.log('='.repeat(80));
}

main().catch(console.error);

