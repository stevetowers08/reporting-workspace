#!/usr/bin/env node

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

async function main() {
  console.log('🔍 Testing Campaign Query for Performance Max\n');
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

  const query = `
    SELECT
      segments.date,
      campaign.advertising_channel_type,
      campaign.id,
      campaign.name,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions,
      metrics.cost_micros
    FROM campaign
    WHERE segments.date BETWEEN '${dateStartStr}' AND '${dateEndStr}'
    ORDER BY metrics.conversions DESC
  `.trim();

  console.log('📊 Querying campaigns...\n');
  
  try {
    const data = await makeApiRequest(customerId, managerId, accessToken, query);
    
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
    
    console.log(`✅ Got ${allResults.length} results\n`);
    
    // Group by channel type
    const byChannel = {};
    
    for (const result of allResults) {
      const channelType = result.campaign?.advertisingChannelType || result.campaign?.advertising_channel_type || 'UNKNOWN';
      const conversions = parseInt(result.metrics?.conversions || '0');
      const impressions = parseInt(result.metrics?.impressions || '0');
      
      if (!byChannel[channelType]) {
        byChannel[channelType] = { conversions: 0, impressions: 0, count: 0, campaigns: [] };
      }
      
      byChannel[channelType].conversions += conversions;
      byChannel[channelType].impressions += impressions;
      byChannel[channelType].count += 1;
      if (result.campaign?.name) {
        byChannel[channelType].campaigns.push(result.campaign.name);
      }
    }
    
    console.log('📈 Campaign Breakdown by Channel Type:');
    for (const [channel, data] of Object.entries(byChannel)) {
      const conversionRate = data.impressions > 0 ? (data.conversions / data.impressions * 100).toFixed(2) : '0.00';
      console.log(`\n   ${channel}:`);
      console.log(`     Conversions: ${data.conversions}`);
      console.log(`     Impressions: ${data.impressions.toLocaleString()}`);
      console.log(`     Conversion Rate: ${conversionRate}%`);
      console.log(`     Results: ${data.count}`);
      if (data.campaigns.length > 0) {
        console.log(`     Sample Campaigns: ${data.campaigns.slice(0, 3).join(', ')}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main().catch(console.error);

