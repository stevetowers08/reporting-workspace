#!/usr/bin/env node
/**
 * Test script to verify Facebook and Google Ads demographics API calls
 * Run with: node scripts/test-demographics-api.mjs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFacebookDemographics() {
  console.log('\n📊 Testing Facebook Demographics API...\n');
  
  try {
    // Get Facebook integration
    const { data: integration, error: intError } = await supabase
      .from('integrations')
      .select('*')
      .eq('platform', 'facebookAds')
      .eq('connected', true)
      .single();

    if (intError || !integration) {
      console.error('❌ No Facebook integration found:', intError?.message);
      return;
    }

    const accessToken = integration.config?.accessToken;
    if (!accessToken) {
      console.error('❌ No Facebook access token found');
      return;
    }

    // Get a client with Facebook account
    const { data: clients } = await supabase
      .from('clients')
      .select('*')
      .limit(1);

    if (!clients || clients.length === 0) {
      console.error('❌ No clients found');
      return;
    }

    const client = clients[0];
    const accountId = client.accounts?.facebookAds;
    
    if (!accountId || accountId === 'none') {
      console.error('❌ No Facebook account ID found for client');
      return;
    }

    const formattedAccountId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
    
    // Calculate date range (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);
    
    const params = new URLSearchParams({
      access_token: accessToken,
      fields: 'impressions,clicks,spend,actions',
      breakdowns: 'age,gender',
      level: 'account',
      time_range: JSON.stringify({
        since: startDate.toISOString().split('T')[0],
        until: endDate.toISOString().split('T')[0]
      }),
      limit: '1000'
    });

    const url = `https://graph.facebook.com/v22.0/${formattedAccountId}/insights?${params}`;
    console.log('🔗 Request URL:', url.replace(/access_token=[^&]+/, 'access_token=***'));
    
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Facebook API Error:', JSON.stringify(data, null, 2));
      return;
    }

    console.log('✅ Facebook API Response:');
    console.log('   Data count:', data.data?.length || 0);
    
    if (data.data && data.data.length > 0) {
      console.log('\n📋 Sample data entries:');
      data.data.slice(0, 3).forEach((entry, idx) => {
        console.log(`\n   Entry ${idx + 1}:`);
        console.log('   - Age:', entry.age || 'N/A');
        console.log('   - Gender:', entry.gender || 'N/A');
        console.log('   - Actions:', JSON.stringify(entry.actions?.slice(0, 2), null, 2));
      });

      // Process demographics
      const ageGroups = { '25-34': 0, '35-44': 0, '45-54': 0, '55+': 0 };
      const gender = { female: 0, male: 0 };
      let totalLeads = 0;

      data.data.forEach((insight) => {
        const actions = insight.actions || [];
        const leadAction = actions.find(a => a.action_type === 'lead' || a.action_type === 'purchase');
        const leads = parseInt(leadAction?.value || '0');
        totalLeads += leads;

        if (insight.age) {
          const ageRange = insight.age;
          if (ageRange === '25-34') ageGroups['25-34'] += leads;
          else if (ageRange === '35-44') ageGroups['35-44'] += leads;
          else if (ageRange === '45-54') ageGroups['45-54'] += leads;
          else if (ageRange === '55-64' || ageRange === '65+') ageGroups['55+'] += leads;
        }

        if (insight.gender) {
          if (insight.gender === 'female') gender.female += leads;
          else if (insight.gender === 'male') gender.male += leads;
        }
      });

      // Convert to percentages
      if (totalLeads > 0) {
        Object.keys(ageGroups).forEach(key => {
          ageGroups[key] = Math.round((ageGroups[key] / totalLeads) * 100);
        });
        gender.female = Math.round((gender.female / totalLeads) * 100);
        gender.male = Math.round((gender.male / totalLeads) * 100);
      }

      console.log('\n📊 Processed Demographics:');
      console.log('   Total Leads:', totalLeads);
      console.log('   Age Groups:', JSON.stringify(ageGroups, null, 2));
      console.log('   Gender:', JSON.stringify(gender, null, 2));
    } else {
      console.log('⚠️  No demographic data returned');
    }

  } catch (error) {
    console.error('❌ Error testing Facebook demographics:', error);
  }
}

async function testGoogleDemographics() {
  console.log('\n📊 Testing Google Ads Demographics API...\n');
  
  try {
    // Get Google Ads config
    const { data: config } = await supabase
      .from('google_ads_configs')
      .select('*')
      .eq('is_active', true)
      .single();

    if (!config) {
      console.error('❌ No active Google Ads config found');
      return;
    }

    // Get user auth
    const { data: auth } = await supabase
      .from('user_google_ads_auth')
      .select('*')
      .limit(1)
      .single();

    if (!auth || !auth.access_token) {
      console.error('❌ No Google Ads auth found');
      return;
    }

    // Get a client with Google account
    const { data: clients } = await supabase
      .from('clients')
      .select('*')
      .limit(1);

    if (!clients || clients.length === 0) {
      console.error('❌ No clients found');
      return;
    }

    const client = clients[0];
    const customerId = client.accounts?.googleAds;
    
    if (!customerId || customerId === 'none') {
      console.error('❌ No Google Ads customer ID found for client');
      return;
    }

    console.log('✅ Found Google Ads credentials');
    console.log('   Customer ID:', customerId);
    console.log('   Developer Token:', config.developer_token ? '***' : 'Missing');
    console.log('   Manager Account ID:', config.manager_account_id || 'Missing');
    console.log('\n⚠️  Google Ads demographics require complex API setup');
    console.log('   This would need the full GoogleAdsService implementation');
    console.log('   Check the service logs for actual API calls');

  } catch (error) {
    console.error('❌ Error testing Google demographics:', error);
  }
}

async function main() {
  console.log('🚀 Starting Demographics API Tests...\n');
  
  await testFacebookDemographics();
  await testGoogleDemographics();
  
  console.log('\n✅ Tests completed');
}

main().catch(console.error);








