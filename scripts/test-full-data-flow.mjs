#!/usr/bin/env node

/**
 * Test the full data flow from API to component structure
 * Simulates exactly what happens in the app
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

// Simulate the exact processing from GoogleAdsService.processCampaignBreakdownDataSeparate
function processCampaignBreakdown(campaignBlocks, adFormatBlocks, performanceMaxBlocks) {
  const campaignTypes = {
    search: { conversions: 0, impressions: 0, conversionRate: 0 },
    display: { conversions: 0, impressions: 0, conversionRate: 0 },
    youtube: { conversions: 0, impressions: 0, conversionRate: 0 }
  };
  
  const adFormats = {
    textAds: { conversions: 0, impressions: 0, conversionRate: 0 },
    responsiveDisplay: { conversions: 0, impressions: 0, conversionRate: 0 },
    videoAds: { conversions: 0, impressions: 0, conversionRate: 0 }
  };

  // Process campaign types
  for (const block of campaignBlocks) {
    const results = block?.results || [];
    for (const result of results) {
      const conversions = parseInt(result.metrics?.conversions || '0');
      const impressions = parseInt(result.metrics?.impressions || '0');
      const channelType = result.campaign?.advertisingChannelType || result.campaign?.advertising_channel_type;

      if (channelType === 'SEARCH' || channelType === 'SEARCH_MOBILE_APP' || channelType === 'PERFORMANCE_MAX') {
        campaignTypes.search.conversions += conversions;
        campaignTypes.search.impressions += impressions;
      } else if (channelType === 'DISPLAY' || channelType === 'DISPLAY_MOBILE_APP') {
        campaignTypes.display.conversions += conversions;
        campaignTypes.display.impressions += impressions;
      } else if (channelType === 'VIDEO' || channelType === 'VIDEO_MOBILE_APP') {
        campaignTypes.youtube.conversions += conversions;
        campaignTypes.youtube.impressions += impressions;
      }
    }
  }

  // Process ad formats from ad_group_ad
  const adTypeMapping = {
    'RESPONSIVE_SEARCH_AD': 'textAds',
    'EXPANDED_TEXT_AD': 'textAds',
    'RESPONSIVE_DISPLAY_AD': 'responsiveDisplay',
    'VIDEO_RESPONSIVE_AD': 'videoAds',
    'VIDEO_AD': 'videoAds'
  };

  for (const block of adFormatBlocks) {
    const results = block?.results || [];
    for (const result of results) {
      const conversions = parseInt(result.metrics?.conversions || '0');
      const impressions = parseInt(result.metrics?.impressions || '0');
      const adType = (result.adGroupAd || result.ad_group_ad)?.ad?.type;
      
      if (adType && adTypeMapping[adType]) {
        adFormats[adTypeMapping[adType]].conversions += conversions;
        adFormats[adTypeMapping[adType]].impressions += impressions;
      }
    }
  }

  // Process Performance Max from asset_group
  for (const block of performanceMaxBlocks) {
    const results = block?.results || [];
    for (const result of results) {
      const conversions = parseInt(result.metrics?.conversions || '0');
      const impressions = parseInt(result.metrics?.impressions || '0');
      
      if (conversions > 0 || impressions > 0) {
        adFormats.responsiveDisplay.conversions += conversions;
        adFormats.responsiveDisplay.impressions += impressions;
      }
    }
  }

  // Calculate conversion rates
  if (campaignTypes.search.impressions > 0) {
    campaignTypes.search.conversionRate = (campaignTypes.search.conversions / campaignTypes.search.impressions) * 100;
  }
  if (campaignTypes.display.impressions > 0) {
    campaignTypes.display.conversionRate = (campaignTypes.display.conversions / campaignTypes.display.impressions) * 100;
  }
  if (campaignTypes.youtube.impressions > 0) {
    campaignTypes.youtube.conversionRate = (campaignTypes.youtube.conversions / campaignTypes.youtube.impressions) * 100;
  }

  if (adFormats.textAds.impressions > 0) {
    adFormats.textAds.conversionRate = (adFormats.textAds.conversions / adFormats.textAds.impressions) * 100;
  }
  if (adFormats.responsiveDisplay.impressions > 0) {
    adFormats.responsiveDisplay.conversionRate = (adFormats.responsiveDisplay.conversions / adFormats.responsiveDisplay.impressions) * 100;
  }
  if (adFormats.videoAds.impressions > 0) {
    adFormats.videoAds.conversionRate = (adFormats.videoAds.conversions / adFormats.videoAds.impressions) * 100;
  }

  return { campaignTypes, adFormats };
}

// Simulate what the component expects
function simulateComponentData(campaignBreakdown) {
  const campaignTypesData = [
    {
      name: 'Search',
      impressions: campaignBreakdown?.campaignTypes?.search?.impressions || 0,
      conversions: campaignBreakdown?.campaignTypes?.search?.conversions || 0,
      conversionRate: campaignBreakdown?.campaignTypes?.search?.conversionRate || 0
    },
    {
      name: 'Display',
      impressions: campaignBreakdown?.campaignTypes?.display?.impressions || 0,
      conversions: campaignBreakdown?.campaignTypes?.display?.conversions || 0,
      conversionRate: campaignBreakdown?.campaignTypes?.display?.conversionRate || 0
    },
    {
      name: 'YouTube',
      impressions: campaignBreakdown?.campaignTypes?.youtube?.impressions || 0,
      conversions: campaignBreakdown?.campaignTypes?.youtube?.conversions || 0,
      conversionRate: campaignBreakdown?.campaignTypes?.youtube?.conversionRate || 0
    }
  ];

  const adFormatsData = [
    {
      name: 'Text Ads',
      impressions: campaignBreakdown?.adFormats?.textAds?.impressions || 0,
      conversions: campaignBreakdown?.adFormats?.textAds?.conversions || 0,
      conversionRate: campaignBreakdown?.adFormats?.textAds?.conversionRate || 0
    },
    {
      name: 'Responsive Display',
      impressions: campaignBreakdown?.adFormats?.responsiveDisplay?.impressions || 0,
      conversions: campaignBreakdown?.adFormats?.responsiveDisplay?.conversions || 0,
      conversionRate: campaignBreakdown?.adFormats?.responsiveDisplay?.conversionRate || 0
    },
    {
      name: 'Video Ads',
      impressions: campaignBreakdown?.adFormats?.videoAds?.impressions || 0,
      conversions: campaignBreakdown?.adFormats?.videoAds?.conversions || 0,
      conversionRate: campaignBreakdown?.adFormats?.videoAds?.conversionRate || 0
    }
  ];

  return { campaignTypesData, adFormatsData };
}

async function main() {
  const customerId = process.argv[2] || '3892760613';
  console.log('🔍 Testing Full Data Flow (API → Service → Component)\n');
  console.log(`Customer ID: ${customerId}\n`);

  const accessToken = await getAccessToken();
  const managerId = await getManagerAccountId();

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 30);
  const dateStart = startDate.toISOString().split('T')[0];
  const dateEnd = endDate.toISOString().split('T')[0];

  console.log(`📅 Date Range: ${dateStart} to ${dateEnd}\n`);

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

  console.log('📊 Fetching data from API...\n');

  const [campaignBlocks, adFormatBlocks, performanceMaxBlocks] = await Promise.allSettled([
    makeApiRequest(customerId, managerId, accessToken, campaignTypesQuery),
    makeApiRequest(customerId, managerId, accessToken, adFormatsQuery),
    makeApiRequest(customerId, managerId, accessToken, performanceMaxQuery).catch(() => [])
  ]);

  const campaignResults = campaignBlocks.status === 'fulfilled' ? campaignBlocks.value : [];
  const adFormatResults = adFormatBlocks.status === 'fulfilled' ? adFormatBlocks.value : [];
  const performanceMaxResults = performanceMaxBlocks.status === 'fulfilled' ? performanceMaxBlocks.value : [];

  const campaignArray = Array.isArray(campaignResults) ? campaignResults : [campaignResults];
  const adFormatArray = Array.isArray(adFormatResults) ? adFormatResults : [adFormatResults];
  const performanceMaxArray = Array.isArray(performanceMaxResults) ? performanceMaxResults : [performanceMaxResults];

  console.log('✅ Data fetched!\n');
  console.log(`   Campaign Types: ${campaignArray.reduce((sum, b) => sum + (b.results?.length || 0), 0)} results`);
  console.log(`   Ad Formats: ${adFormatArray.reduce((sum, b) => sum + (b.results?.length || 0), 0)} results`);
  console.log(`   Performance Max: ${performanceMaxArray.reduce((sum, b) => sum + (b.results?.length || 0), 0)} results\n`);

  // Process the data (simulating GoogleAdsService)
  const campaignBreakdown = processCampaignBreakdown(campaignArray, adFormatArray, performanceMaxArray);

  console.log('📦 Processed Campaign Breakdown (what GoogleAdsService returns):');
  console.log(JSON.stringify(campaignBreakdown, null, 2));
  console.log('');

  // Simulate component data preparation
  const componentData = simulateComponentData(campaignBreakdown);

  console.log('🎨 Component Data (what charts will display):\n');
  console.log('📊 Campaign Types Chart Data:');
  componentData.campaignTypesData.forEach(item => {
    console.log(`   ${item.name}: ${item.conversions} conversions, ${item.impressions.toLocaleString()} impressions`);
  });
  console.log('\n📱 Ad Formats Chart Data:');
  componentData.adFormatsData.forEach(item => {
    console.log(`   ${item.name}: ${item.conversions} conversions, ${item.impressions.toLocaleString()} impressions`);
  });

  const totalCampaignConversions = componentData.campaignTypesData.reduce((sum, item) => sum + item.conversions, 0);
  const totalAdFormatConversions = componentData.adFormatsData.reduce((sum, item) => sum + item.conversions, 0);

  console.log('\n✅ Final Verification:');
  console.log(`   Campaign Types Total: ${totalCampaignConversions} conversions`);
  console.log(`   Ad Formats Total: ${totalAdFormatConversions} conversions`);
  console.log(`   Charts will show: ${totalCampaignConversions > 0 && totalAdFormatConversions > 0 ? '✅ DATA' : totalCampaignConversions > 0 ? '⚠️  PARTIAL DATA' : '❌ NO DATA'}\n`);

  // Check if data structure matches component expectations
  console.log('🔍 Data Structure Check:');
  console.log(`   campaignBreakdown exists: ${!!campaignBreakdown}`);
  console.log(`   campaignBreakdown.campaignTypes exists: ${!!campaignBreakdown.campaignTypes}`);
  console.log(`   campaignBreakdown.campaignTypes.search exists: ${!!campaignBreakdown.campaignTypes.search}`);
  console.log(`   campaignBreakdown.campaignTypes.search.impressions: ${campaignBreakdown.campaignTypes.search.impressions}`);
  console.log(`   campaignBreakdown.campaignTypes.search.conversions: ${campaignBreakdown.campaignTypes.search.conversions}`);
  console.log(`   campaignBreakdown.adFormats exists: ${!!campaignBreakdown.adFormats}`);
  console.log(`   campaignBreakdown.adFormats.responsiveDisplay exists: ${!!campaignBreakdown.adFormats.responsiveDisplay}`);
  console.log(`   campaignBreakdown.adFormats.responsiveDisplay.impressions: ${campaignBreakdown.adFormats.responsiveDisplay.impressions}`);
  console.log(`   campaignBreakdown.adFormats.responsiveDisplay.conversions: ${campaignBreakdown.adFormats.responsiveDisplay.conversions}\n`);
}

main().catch(console.error);

