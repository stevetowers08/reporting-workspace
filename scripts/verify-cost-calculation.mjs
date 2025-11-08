#!/usr/bin/env node

/**
 * Verify Cost Calculation from Google Ads API
 * Tests that cost aggregation matches expected values
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

async function main() {
  const customerId = process.argv[2] || '3892760613';
  const normalizedCustomerId = normalizeCid(customerId);

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 30);
  const dateStart = startDate.toISOString().split('T')[0];
  const dateEnd = endDate.toISOString().split('T')[0];

  console.log('💰 Verifying Cost Calculation\n');
  console.log(`Customer ID: ${normalizedCustomerId}`);
  console.log(`Date Range: ${dateStart} to ${dateEnd}\n`);

  const [accessToken, managerId] = await Promise.all([
    getAccessToken(),
    getManagerAccountId()
  ]);

  const query = `
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

  const url = `https://googleads.googleapis.com/${API_VERSION}/customers/${normalizedCustomerId}/googleAds:searchStream`;
  
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
  const data = JSON.parse(text);
  const results = Array.isArray(data) ? data : [data];

  // Aggregate costs exactly like the service does
  let totalCostMicros = 0;
  let totalConversions = 0;
  let totalImpressions = 0;
  let totalClicks = 0;
  const costsByChannel = {
    PERFORMANCE_MAX: { costMicros: 0, conversions: 0, impressions: 0, clicks: 0 },
    SEARCH: { costMicros: 0, conversions: 0, impressions: 0, clicks: 0 },
    DISPLAY: { costMicros: 0, conversions: 0, impressions: 0, clicks: 0 },
    VIDEO: { costMicros: 0, conversions: 0, impressions: 0, clicks: 0 }
  };

  for (const block of results) {
    for (const result of block.results || []) {
      const costMicros = parseFloat(result.metrics?.costMicros || result.metrics?.cost_micros || '0');
      const conversions = parseInt(result.metrics?.conversions || '0');
      const impressions = parseInt(result.metrics?.impressions || '0');
      const clicks = parseInt(result.metrics?.clicks || '0');
      
      const channelType = result.campaign?.advertisingChannelType || 
                         result.campaign?.advertising_channel_type;
      
      totalCostMicros += costMicros;
      totalConversions += conversions;
      totalImpressions += impressions;
      totalClicks += clicks;

      if (channelType && costsByChannel[channelType]) {
        costsByChannel[channelType].costMicros += costMicros;
        costsByChannel[channelType].conversions += conversions;
        costsByChannel[channelType].impressions += impressions;
        costsByChannel[channelType].clicks += clicks;
      }
    }
  }

  const totalCost = totalCostMicros / 1e6;
  const costPerLead = totalConversions > 0 ? totalCost / totalConversions : 0;
  const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

  console.log('📊 Aggregated Results:');
  console.log(`   Total Cost: $${totalCost.toFixed(2)}`);
  console.log(`   Total Conversions: ${totalConversions}`);
  console.log(`   Total Impressions: ${totalImpressions.toLocaleString()}`);
  console.log(`   Total Clicks: ${totalClicks.toLocaleString()}`);
  console.log(`   Cost per Lead: $${costPerLead.toFixed(2)}`);
  console.log(`   Conversion Rate: ${conversionRate.toFixed(2)}%`);
  console.log(`   Total Rows Processed: ${results.reduce((sum, block) => sum + (block.results?.length || 0), 0)}`);

  console.log('\n📈 By Channel Type:');
  for (const [channel, data] of Object.entries(costsByChannel)) {
    if (data.costMicros > 0) {
      const cost = data.costMicros / 1e6;
      const channelCostPerLead = data.conversions > 0 ? cost / data.conversions : 0;
      const channelConversionRate = data.clicks > 0 ? (data.conversions / data.clicks) * 100 : 0;
      console.log(`   ${channel}:`);
      console.log(`     Cost: $${cost.toFixed(2)}`);
      console.log(`     Conversions: ${data.conversions}`);
      console.log(`     Impressions: ${data.impressions.toLocaleString()}`);
      console.log(`     Clicks: ${data.clicks.toLocaleString()}`);
      console.log(`     Cost per Lead: $${channelCostPerLead.toFixed(2)}`);
      console.log(`     Conversion Rate: ${channelConversionRate.toFixed(2)}%`);
    }
  }

  console.log('\n✅ Cost Calculation Verification Complete');
  console.log(`\n💡 Expected: ~$940`);
  console.log(`   Actual: $${totalCost.toFixed(2)}`);
  console.log(`   Difference: $${Math.abs(totalCost - 940).toFixed(2)}`);
  
  if (Math.abs(totalCost - 940) < 10) {
    console.log('   ✅ Cost matches expected value!');
  } else {
    console.log('   ⚠️  Cost differs from expected value');
  }
}

main().catch(console.error);

