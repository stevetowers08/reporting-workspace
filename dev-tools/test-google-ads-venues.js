// Test Google Ads API to get venues/locations
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testGoogleAdsVenues() {
  try {
    console.log('🔍 Testing Google Ads API for venues/locations...');
    
    // First, check if Google Ads is connected
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('config')
      .eq('platform', 'googleAds')
      .eq('connected', true)
      .single();

    if (integrationError || !integration) {
      console.log('❌ Google Ads not connected');
      console.log('Integration error:', integrationError);
      return;
    }

    console.log('✅ Google Ads integration found');
    
    // Test the Edge Function for accounts (which are like venues in Google Ads)
    console.log('\n🔍 Testing Google Ads accounts via Edge Function...');
    
    const { data: accountsData, error: accountsError } = await supabase.functions.invoke('google-ads-api/accounts');
    
    if (accountsError) {
      console.log('❌ Error calling Google Ads Edge Function:', accountsError);
      return;
    }
    
    if (!accountsData?.success) {
      console.log('❌ Google Ads Edge Function returned error:', accountsData);
      return;
    }
    
    console.log('✅ Successfully retrieved Google Ads accounts:');
    console.log(`Found ${accountsData.data.length} accounts:`);
    
    accountsData.data.forEach((account, index) => {
      console.log(`\n${index + 1}. ${account.name}`);
      console.log(`   ID: ${account.id}`);
      console.log(`   Currency: ${account.currency}`);
      console.log(`   Timezone: ${account.timezone}`);
      console.log(`   Descriptive Name: ${account.descriptiveName}`);
    });
    
    // Test getting campaigns for the first account (if any)
    if (accountsData.data.length > 0) {
      const firstAccount = accountsData.data[0];
      console.log(`\n🔍 Testing campaigns for account: ${firstAccount.name} (${firstAccount.id})`);
      
      const { data: campaignsData, error: campaignsError } = await supabase.functions.invoke(
        `google-ads-api/campaigns?customerId=${firstAccount.id}`
      );
      
      if (campaignsError) {
        console.log('❌ Error calling campaigns Edge Function:', campaignsError);
      } else if (!campaignsData?.success) {
        console.log('❌ Campaigns Edge Function returned error:', campaignsData);
      } else {
        console.log(`✅ Successfully retrieved ${campaignsData.data.length} campaigns`);
        campaignsData.data.slice(0, 3).forEach((campaign, index) => {
          console.log(`\n  Campaign ${index + 1}: ${campaign.name}`);
          console.log(`    ID: ${campaign.id}`);
          console.log(`    Status: ${campaign.status}`);
          console.log(`    Type: ${campaign.type}`);
          if (campaign.metrics) {
            console.log(`    Impressions: ${campaign.metrics.impressions}`);
            console.log(`    Clicks: ${campaign.metrics.clicks}`);
            console.log(`    Cost: $${campaign.metrics.cost?.toFixed(2) || '0.00'}`);
          }
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing Google Ads venues:', error.message);
    console.error('Stack:', error.stack);
  }
}

testGoogleAdsVenues();
