#!/usr/bin/env node
/**
 * Test Google Ads Demographics API for Camarillo Ranch
 * Account ID: 3815117380
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Camarillo Ranch account
const CAMARILLO_ACCOUNT = '3815117380';
const CLIENT_ID = 'fd5632bd-ca1e-4dac-8eee-0385b4e487ea';

async function getCredentials() {
  // Get Google Ads config
  const { data: config } = await supabase
    .from('google_ads_configs')
    .select('*')
    .eq('is_active', true)
    .single();

  if (!config) {
    throw new Error('No active Google Ads config found');
  }

  // Get user auth
  const { data: auth } = await supabase
    .from('user_google_ads_auth')
    .select('*')
    .limit(1)
    .single();

  if (!auth || !auth.access_token) {
    throw new Error('No Google Ads auth found');
  }

  return {
    accessToken: auth.access_token,
    developerToken: config.developer_token,
    managerAccountId: config.manager_account_id || config.managerAccountId || '3791504588'
  };
}

function normalizeCid(id) {
  return String(id).replace(/\D/g, '');
}

async function testDemographicsAPI(customerId, dateRange, credentials) {
  const { accessToken, developerToken, managerAccountId } = credentials;
  const normalizedCid = normalizeCid(customerId);
  const normalizedManager = normalizeCid(managerAccountId);

  // Test Gender Demographics
  console.log('\n📊 Testing Gender Demographics...');
  const genderDateClause = `segments.date BETWEEN '${dateRange.start}' AND '${dateRange.end}'`;
  const genderGaql = `
    SELECT 
      ad_group_criterion.gender.type,
      metrics.conversions,
      metrics.cost_micros,
      metrics.impressions,
      metrics.clicks
    FROM gender_view 
    WHERE ${genderDateClause}
    AND ad_group_criterion.status = 'ENABLED'
  `;

  const genderUrl = `https://googleads.googleapis.com/v21/customers/${normalizedCid}/googleAds:searchStream`;
  const genderHeaders = {
    'Authorization': `Bearer ${accessToken}`,
    'developer-token': developerToken,
    'login-customer-id': normalizedManager,
    'Content-Type': 'application/json'
  };

  console.log('   URL:', genderUrl);
  console.log('   Customer ID:', normalizedCid);
  console.log('   Manager ID:', normalizedManager);
  console.log('   GAQL:', genderGaql.replace(/\s+/g, ' ').trim());

  try {
    const genderResponse = await fetch(genderUrl, {
      method: 'POST',
      headers: genderHeaders,
      body: JSON.stringify({ query: genderGaql })
    });

    if (!genderResponse.ok) {
      const errorText = await genderResponse.text();
      console.error('   ❌ Gender API Error:', genderResponse.status, genderResponse.statusText);
      console.error('   Error details:', errorText.substring(0, 500));
      return;
    }

    const genderData = await genderResponse.json();
    console.log('   ✅ Gender Response:', JSON.stringify(genderData, null, 2).substring(0, 1000));

    // Process gender data
    const gender = { female: 0, male: 0 };
    let totalConversions = 0;

    if (Array.isArray(genderData)) {
      for (const block of genderData) {
        const results = block.results || [];
        for (const result of results) {
          const conversions = parseInt(result.metrics?.conversions || '0');
          totalConversions += conversions;
          const genderType = result.ad_group_criterion?.gender?.type;
          if (genderType === 'GENDER_FEMALE') {
            gender.female += conversions;
          } else if (genderType === 'GENDER_MALE') {
            gender.male += conversions;
          }
        }
      }
    }

    if (totalConversions > 0) {
      gender.female = Math.round((gender.female / totalConversions) * 100);
      gender.male = Math.round((gender.male / totalConversions) * 100);
    }

    console.log('   📊 Processed Gender:', { totalConversions, gender });

  } catch (error) {
    console.error('   ❌ Gender API Error:', error.message);
  }

  // Test Age Demographics
  console.log('\n📊 Testing Age Demographics...');
  const ageDateClause = `segments.date BETWEEN '${dateRange.start}' AND '${dateRange.end}'`;
  const ageGaql = `
    SELECT 
      ad_group_criterion.age_range.type,
      metrics.conversions,
      metrics.cost_micros,
      metrics.impressions,
      metrics.clicks
    FROM age_range_view 
    WHERE ${ageDateClause}
    AND ad_group_criterion.status = 'ENABLED'
  `;

  const ageUrl = `https://googleads.googleapis.com/v21/customers/${normalizedCid}/googleAds:searchStream`;
  const ageHeaders = {
    'Authorization': `Bearer ${accessToken}`,
    'developer-token': developerToken,
    'login-customer-id': normalizedManager,
    'Content-Type': 'application/json'
  };

  console.log('   URL:', ageUrl);
  console.log('   GAQL:', ageGaql.replace(/\s+/g, ' ').trim());

  try {
    const ageResponse = await fetch(ageUrl, {
      method: 'POST',
      headers: ageHeaders,
      body: JSON.stringify({ query: ageGaql })
    });

    if (!ageResponse.ok) {
      const errorText = await ageResponse.text();
      console.error('   ❌ Age API Error:', ageResponse.status, ageResponse.statusText);
      console.error('   Error details:', errorText.substring(0, 500));
      return;
    }

    const ageData = await ageResponse.json();
    console.log('   ✅ Age Response:', JSON.stringify(ageData, null, 2).substring(0, 1000));

    // Process age data
    const ageGroups = { '25-34': 0, '35-44': 0, '45-54': 0, '55+': 0 };
    let totalConversions = 0;

    if (Array.isArray(ageData)) {
      for (const block of ageData) {
        const results = block.results || [];
        for (const result of results) {
          const conversions = parseInt(result.metrics?.conversions || '0');
          totalConversions += conversions;
          const ageRange = result.ad_group_criterion?.age_range?.type;
          if (ageRange === 'AGE_RANGE_25_34') {
            ageGroups['25-34'] += conversions;
          } else if (ageRange === 'AGE_RANGE_35_44') {
            ageGroups['35-44'] += conversions;
          } else if (ageRange === 'AGE_RANGE_45_54') {
            ageGroups['45-54'] += conversions;
          } else if (ageRange === 'AGE_RANGE_55_64' || ageRange === 'AGE_RANGE_65_UP') {
            ageGroups['55+'] += conversions;
          }
        }
      }
    }

    if (totalConversions > 0) {
      const percentageMultiplier = 100 / totalConversions;
      ageGroups['25-34'] = Math.round(ageGroups['25-34'] * percentageMultiplier);
      ageGroups['35-44'] = Math.round(ageGroups['35-44'] * percentageMultiplier);
      ageGroups['45-54'] = Math.round(ageGroups['45-54'] * percentageMultiplier);
      ageGroups['55+'] = Math.round(ageGroups['55+'] * percentageMultiplier);
    }

    console.log('   📊 Processed Age Groups:', { totalConversions, ageGroups });

  } catch (error) {
    console.error('   ❌ Age API Error:', error.message);
  }
}

async function main() {
  console.log('🧪 Testing Google Ads Demographics API for Camarillo Ranch\n');
  console.log('Account ID:', CAMARILLO_ACCOUNT);
  console.log('Client ID:', CLIENT_ID);

  // Get date range (last 30 days)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 30);
  const dateRange = {
    start: startDate.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0]
  };

  console.log('Date Range:', dateRange);

  try {
    const credentials = await getCredentials();
    console.log('\n✅ Credentials obtained');
    console.log('   Developer Token:', credentials.developerToken ? '***' : 'Missing');
    console.log('   Manager Account ID:', credentials.managerAccountId);
    console.log('   Access Token:', credentials.accessToken.substring(0, 20) + '...');

    await testDemographicsAPI(CAMARILLO_ACCOUNT, dateRange, credentials);

    console.log('\n✅ Test completed');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main().catch(console.error);








