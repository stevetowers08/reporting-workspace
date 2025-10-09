/**
 * Comprehensive Google Ads Integration Status Check
 * This script checks the actual database state and integration status
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkGoogleAdsIntegration() {
  console.log('🔍 Google Ads Integration Status Check');
  console.log('=====================================');
  
  try {
    // Check 1: Database Integration Record
    console.log('\n1. Checking database integration record...');
    const { data: integration, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('platform', 'googleAds')
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        console.log('   ❌ No Google Ads integration record found in database');
        console.log('   This means Google Ads has never been connected.');
      } else {
        console.log('   ❌ Database error:', error.message);
      }
    } else {
      console.log('   ✅ Google Ads integration record found');
      console.log(`   Connected: ${integration.connected ? 'YES' : 'NO'}`);
      console.log(`   Account Name: ${integration.account_name || 'N/A'}`);
      console.log(`   Account ID: ${integration.account_id || 'N/A'}`);
      console.log(`   Last Sync: ${integration.last_sync || 'Never'}`);
      
      if (integration.config) {
        const config = integration.config;
        console.log('   Config Details:');
        console.log(`     Has Tokens: ${!!config.tokens}`);
        console.log(`     Has Access Token: ${!!config.tokens?.accessToken}`);
        console.log(`     Has Refresh Token: ${!!config.tokens?.refreshToken}`);
        console.log(`     Token Expires At: ${config.tokens?.expiresAt || 'N/A'}`);
        
        if (config.tokens?.expiresAt) {
          const expiresAt = new Date(config.tokens.expiresAt);
          const now = new Date();
          const isExpired = expiresAt < now;
          console.log(`     Token Status: ${isExpired ? 'EXPIRED' : 'VALID'}`);
        }
      }
    }
    
    // Check 2: Environment Variables
    console.log('\n2. Checking environment variables...');
    const clientId = process.env.VITE_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.VITE_GOOGLE_CLIENT_SECRET;
    const developerToken = process.env.VITE_GOOGLE_ADS_DEVELOPER_TOKEN;
    
    console.log(`   VITE_GOOGLE_CLIENT_ID: ${clientId ? '✅ SET' : '❌ NOT SET'}`);
    console.log(`   VITE_GOOGLE_CLIENT_SECRET: ${clientSecret ? '✅ SET' : '❌ NOT SET'}`);
    console.log(`   VITE_GOOGLE_ADS_DEVELOPER_TOKEN: ${developerToken ? '✅ SET' : '❌ NOT SET'}`);
    
    // Check 3: Edge Function Test
    console.log('\n3. Testing Supabase Edge Function...');
    try {
      const { data: edgeData, error: edgeError } = await supabase.functions.invoke('google-ads-api/accounts');
      
      if (edgeError) {
        console.log('   ❌ Edge Function error:', edgeError.message);
      } else if (edgeData?.success) {
        console.log('   ✅ Edge Function working');
        console.log(`   Accounts returned: ${edgeData.data?.length || 0}`);
      } else {
        console.log('   ❌ Edge Function returned invalid response');
      }
    } catch (error) {
      console.log('   ❌ Edge Function test failed:', error.message);
    }
    
    // Summary
    console.log('\n=====================================');
    console.log('📊 SUMMARY:');
    
    if (!integration) {
      console.log('❌ Google Ads is NOT connected');
      console.log('   Action needed: Connect Google Ads via the UI');
    } else if (!integration.connected) {
      console.log('❌ Google Ads integration exists but is disconnected');
      console.log('   Action needed: Reconnect Google Ads via the UI');
    } else if (!integration.config?.tokens?.accessToken) {
      console.log('❌ Google Ads is marked as connected but has no tokens');
      console.log('   Action needed: Reconnect Google Ads via the UI');
    } else {
      console.log('✅ Google Ads appears to be properly connected');
      console.log('   If you still see issues, check browser console for errors');
    }
    
  } catch (error) {
    console.log('❌ Error during check:', error.message);
  }
}

checkGoogleAdsIntegration().catch(console.error);
