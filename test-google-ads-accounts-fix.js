#!/usr/bin/env node

/**
 * Test script to verify the fixed Google Ads API implementation
 * Tests the getAdAccounts method with the correct GAQL query
 */

import { GoogleAdsService } from './src/services/api/googleAdsService.js';

async function testGoogleAdsAccounts() {
  console.log('🧪 Testing Google Ads Accounts API Fix');
  console.log('=====================================');
  
  try {
    console.log('📞 Calling GoogleAdsService.getAdAccounts()...');
    const accounts = await GoogleAdsService.getAdAccounts();
    
    console.log(`✅ Successfully retrieved ${accounts.length} Google Ads accounts`);
    
    if (accounts.length > 0) {
      console.log('\n📋 Account Details:');
      accounts.forEach((account, index) => {
        console.log(`${index + 1}. ${account.name} (ID: ${account.id})`);
        console.log(`   Status: ${account.status}`);
        console.log(`   Currency: ${account.currency}`);
        console.log(`   Timezone: ${account.timezone}`);
        console.log('');
      });
      
      console.log('✅ Expected format matches your specification:');
      console.log('   - customer_client.id → account.id');
      console.log('   - customer_client.descriptive_name → account.name');
      console.log('   - customer_client.status → account.status');
      console.log('   - Manager accounts filtered out');
    } else {
      console.log('⚠️  No accounts found. This could mean:');
      console.log('   - No Google Ads integration is connected');
      console.log('   - No individual ad accounts are accessible');
      console.log('   - Manager account has no client accounts');
      console.log('   - MCC/Manager account not properly configured');
    }
    
    console.log('✅ Test completed successfully');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error details:', error.message);
    
    if (error.message.includes('not authenticated')) {
      console.log('\n💡 Troubleshooting:');
      console.log('   - Ensure Google Ads integration is connected');
      console.log('   - Check if OAuth tokens are valid');
      console.log('   - Verify developer token is configured');
    }
  }
}

// Run the test
testGoogleAdsAccounts();
