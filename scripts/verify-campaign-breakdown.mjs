#!/usr/bin/env node

/**
 * Verify Campaign Types and Ad Formats Data
 * Tests the exact data that should be displayed in the UI
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

async function makeApiRequest(customerId, managerId, accessToken, query) {
  const url = `https://googleads.googleapis.com/${API_VERSION}/customers/${customerId}/googleAds:searchStream`;
  
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
    throw new Error(`API Error: ${response.status} - ${text}`);
  }

  const data = JSON.parse(text);
  return Array.isArray(data) ? data : [data];
}

async function main() {
  const customerId = process.argv[2] || '3892760613';
  const normalizedCustomerId = normalizeCid(customerId);

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 30);
  const dateStart = startDate.toISOString().split('T')[0];
  const dateEnd = endDate.toISOString().split('T')[0];

  console.log('📊 Verifying Campaign Types & Ad Formats\n');
  console.log(`Customer ID: ${normalizedCustomerId}`);
  console.log(`Date Range: ${dateStart} to ${dateEnd}\n`);

  const [accessToken, managerId] = await Promise.all([
    getAccessToken(),
    getManagerAccountId()
  ]);

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
    WHERE segments.date BETWEEN '${dateStart}' AND '${dateEnd}'
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
    WHERE segments.date BETWEEN '${dateStart}' AND '${dateEnd}'
      AND campaign.advertising_channel_type = 'SEARCH'
      AND campaign.status != 'REMOVED'
    ORDER BY metrics.conversions DESC
  `.trim();

  // Query 3: Performance Max Assets
  const performanceMaxQuery = `
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

  console.log('⏳ Fetching data...\n');
  
  const [campaignBlocks, searchAdFormatBlocks, performanceMaxBlocks] = await Promise.all([
    makeApiRequest(normalizedCustomerId, managerId, accessToken, campaignTypesQuery),
    makeApiRequest(normalizedCustomerId, managerId, accessToken, searchAdFormatsQuery),
    makeApiRequest(normalizedCustomerId, managerId, accessToken, performanceMaxQuery)
  ]);

  // Process Campaign Types
  const campaignTypes = {
    search: { conversions: 0, impressions: 0, clicks: 0, cost: 0, conversionRate: 0, costPerLead: 0 },
    display: { conversions: 0, impressions: 0, clicks: 0, cost: 0, conversionRate: 0, costPerLead: 0 },
    youtube: { conversions: 0, impressions: 0, clicks: 0, cost: 0, conversionRate: 0, costPerLead: 0 },
    performanceMax: { conversions: 0, impressions: 0, clicks: 0, cost: 0, conversionRate: 0, costPerLead: 0 }
  };

  for (const block of campaignBlocks) {
    for (const result of block.results || []) {
      const channelType = result.campaign?.advertisingChannelType || result.campaign?.advertising_channel_type;
      const conversions = parseInt(result.metrics?.conversions || '0');
      const impressions = parseInt(result.metrics?.impressions || '0');
      const clicks = parseInt(result.metrics?.clicks || '0');
      const costMicros = parseFloat(result.metrics?.costMicros || result.metrics?.cost_micros || '0');
      const cost = costMicros / 1e6;

      if (channelType === 'SEARCH') {
        campaignTypes.search.conversions += conversions;
        campaignTypes.search.impressions += impressions;
        campaignTypes.search.clicks += clicks;
        campaignTypes.search.cost += cost;
      } else if (channelType === 'DISPLAY') {
        campaignTypes.display.conversions += conversions;
        campaignTypes.display.impressions += impressions;
        campaignTypes.display.clicks += clicks;
        campaignTypes.display.cost += cost;
      } else if (channelType === 'VIDEO' || channelType === 'YOUTUBE') {
        campaignTypes.youtube.conversions += conversions;
        campaignTypes.youtube.impressions += impressions;
        campaignTypes.youtube.clicks += clicks;
        campaignTypes.youtube.cost += cost;
      } else if (channelType === 'PERFORMANCE_MAX') {
        campaignTypes.performanceMax.conversions += conversions;
        campaignTypes.performanceMax.impressions += impressions;
        campaignTypes.performanceMax.clicks += clicks;
        campaignTypes.performanceMax.cost += cost;
      }
    }
  }

  // Calculate conversion rates and cost per lead
  for (const [key, data] of Object.entries(campaignTypes)) {
    if (data.clicks > 0) {
      data.conversionRate = (data.conversions / data.clicks) * 100;
    }
    if (data.conversions > 0) {
      data.costPerLead = data.cost / data.conversions;
    }
  }

  // Process Ad Formats
  const adFormats = {
    textAds: { conversions: 0, impressions: 0, clicks: 0, conversionRate: 0 },
    responsiveDisplay: { conversions: 0, impressions: 0, clicks: 0, conversionRate: 0 },
    videoAds: { conversions: 0, impressions: 0, clicks: 0, conversionRate: 0 }
  };

  const assetTypes = {};

  // Process Search Ad Formats
  for (const block of searchAdFormatBlocks) {
    for (const result of block.results || []) {
      const adType = result.adGroupAd?.ad?.type || result.ad_group_ad?.ad?.type;
      const conversions = parseInt(result.metrics?.conversions || '0');
      const impressions = parseInt(result.metrics?.impressions || '0');
      const clicks = parseInt(result.metrics?.clicks || '0');

      // Map Search ad types to formats
      if (adType === 'RESPONSIVE_SEARCH_AD' || adType === 'EXPANDED_TEXT_AD' || adType === 'TEXT_AD') {
        adFormats.textAds.conversions += conversions;
        adFormats.textAds.impressions += impressions;
        adFormats.textAds.clicks += clicks;
      } else if (adType === 'RESPONSIVE_DISPLAY_AD' || adType === 'IMAGE_AD') {
        adFormats.responsiveDisplay.conversions += conversions;
        adFormats.responsiveDisplay.impressions += impressions;
        adFormats.responsiveDisplay.clicks += clicks;
      } else if (adType === 'VIDEO_AD' || adType === 'VIDEO_RESPONSIVE_AD') {
        adFormats.videoAds.conversions += conversions;
        adFormats.videoAds.impressions += impressions;
        adFormats.videoAds.clicks += clicks;
      }
    }
  }

  // Process Performance Max Assets
  for (const block of performanceMaxBlocks) {
    for (const result of block.results || []) {
      const assetType = result.asset?.type;
      const conversions = parseInt(result.metrics?.conversions || '0');
      const impressions = parseInt(result.metrics?.impressions || '0');
      const clicks = parseInt(result.metrics?.clicks || '0');

      // Track actual asset types
      if (assetType) {
        if (!assetTypes[assetType]) {
          assetTypes[assetType] = { conversions: 0, impressions: 0, clicks: 0, conversionRate: 0 };
        }
        assetTypes[assetType].conversions += conversions;
        assetTypes[assetType].impressions += impressions;
        assetTypes[assetType].clicks += clicks;
      }

      // Map to ad formats
      if (assetType === 'TEXT') {
        adFormats.textAds.conversions += conversions;
        adFormats.textAds.impressions += impressions;
        adFormats.textAds.clicks += clicks;
      } else if (assetType === 'IMAGE' || assetType === 'MEDIA_BUNDLE') {
        adFormats.responsiveDisplay.conversions += conversions;
        adFormats.responsiveDisplay.impressions += impressions;
        adFormats.responsiveDisplay.clicks += clicks;
      } else if (assetType === 'YOUTUBE_VIDEO') {
        adFormats.videoAds.conversions += conversions;
        adFormats.videoAds.impressions += impressions;
        adFormats.videoAds.clicks += clicks;
      }
    }
  }

  // Calculate conversion rates for ad formats
  if (adFormats.textAds.clicks > 0) {
    adFormats.textAds.conversionRate = (adFormats.textAds.conversions / adFormats.textAds.clicks) * 100;
  }
  if (adFormats.responsiveDisplay.clicks > 0) {
    adFormats.responsiveDisplay.conversionRate = (adFormats.responsiveDisplay.conversions / adFormats.responsiveDisplay.clicks) * 100;
  }
  if (adFormats.videoAds.clicks > 0) {
    adFormats.videoAds.conversionRate = (adFormats.videoAds.conversions / adFormats.videoAds.clicks) * 100;
  }

  // Calculate conversion rates for asset types
  for (const [key, data] of Object.entries(assetTypes)) {
    if (data.clicks > 0) {
      data.conversionRate = (data.conversions / data.clicks) * 100;
    }
  }

  // Display Results
  console.log('='.repeat(80));
  console.log('📈 CAMPAIGN TYPES');
  console.log('='.repeat(80));
  
  const campaignTypesArray = [
    { name: 'Search', data: campaignTypes.search },
    { name: 'Display', data: campaignTypes.display },
    { name: 'YouTube', data: campaignTypes.youtube },
    { name: 'Performance Max', data: campaignTypes.performanceMax }
  ];

  for (const { name, data } of campaignTypesArray) {
    if (data.impressions > 0 || data.conversions > 0) {
      console.log(`\n${name}:`);
      console.log(`  Conversions: ${data.conversions}`);
      console.log(`  Impressions: ${data.impressions.toLocaleString()}`);
      console.log(`  Clicks: ${data.clicks.toLocaleString()}`);
      console.log(`  Cost: $${data.cost.toFixed(2)}`);
      console.log(`  Conversion Rate: ${data.conversionRate.toFixed(2)}%`);
      console.log(`  Cost per Lead: $${data.costPerLead.toFixed(2)}`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('🎨 AD FORMATS (Mapped Categories)');
  console.log('='.repeat(80));
  
  const adFormatsArray = [
    { name: 'Text Ads', data: adFormats.textAds },
    { name: 'Responsive Display', data: adFormats.responsiveDisplay },
    { name: 'Video Ads', data: adFormats.videoAds }
  ];

  for (const { name, data } of adFormatsArray) {
    if (data.impressions > 0 || data.conversions > 0) {
      console.log(`\n${name}:`);
      console.log(`  Conversions: ${data.conversions}`);
      console.log(`  Impressions: ${data.impressions.toLocaleString()}`);
      console.log(`  Clicks: ${data.clicks.toLocaleString()}`);
      console.log(`  Conversion Rate: ${data.conversionRate.toFixed(2)}%`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('🔧 AD FORMATS (Actual Asset Types from Performance Max)');
  console.log('='.repeat(80));
  
  if (Object.keys(assetTypes).length > 0) {
    for (const [assetType, data] of Object.entries(assetTypes)) {
      console.log(`\n${assetType}:`);
      console.log(`  Conversions: ${data.conversions}`);
      console.log(`  Impressions: ${data.impressions.toLocaleString()}`);
      console.log(`  Clicks: ${data.clicks.toLocaleString()}`);
      console.log(`  Conversion Rate: ${data.conversionRate.toFixed(2)}%`);
    }
  } else {
    console.log('\n  No asset types found');
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Verification Complete');
  console.log('='.repeat(80));
}

main().catch(console.error);

main().catch(console.error);

