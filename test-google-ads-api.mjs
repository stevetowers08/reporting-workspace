#!/usr/bin/env node

// Test Google Ads API Integration
import { GoogleAdsService } from './src/services/api/googleAdsService.js';

async function testGoogleAdsAPI() {
  console.log('🔍 Testing Google Ads API Integration...\n');

  try {
    // Test 1: Connection Test
    console.log('1️⃣ Testing connection...');
    const connectionTest = await GoogleAdsService.testConnection();
    
    if (connectionTest.success) {
      console.log('✅ Connection successful');
      console.log(`   Manager Account ID: ${connectionTest.accountInfo?.managerAccountId}`);
      console.log(`   Has Access Token: ${connectionTest.accountInfo?.hasAccessToken}`);
      console.log(`   Has Developer Token: ${connectionTest.accountInfo?.hasDeveloperToken}`);
    } else {
      console.log('❌ Connection failed:', connectionTest.error);
      return;
    }

    // Test 2: Authentication
    console.log('\n2️⃣ Testing authentication...');
    const authResult = await GoogleAdsService.authenticate();
    
    if (authResult) {
      console.log('✅ Authentication successful');
    } else {
      console.log('❌ Authentication failed');
      return;
    }

    // Test 3: Get Manager Account ID
    console.log('\n3️⃣ Testing manager account discovery...');
    const managerId = await GoogleAdsService.getManagerAccountId();
    
    if (managerId) {
      console.log(`✅ Manager Account ID: ${managerId}`);
    } else {
      console.log('❌ Failed to get manager account ID');
      return;
    }

    // Test 4: Get Ad Accounts
    console.log('\n4️⃣ Testing ad accounts retrieval...');
    const accounts = await GoogleAdsService.getAdAccounts();
    
    if (accounts && accounts.length > 0) {
      console.log(`✅ Found ${accounts.length} ad accounts:`);
      accounts.slice(0, 3).forEach(account => {
        console.log(`   - ${account.name} (${account.id}) - ${account.status}`);
      });
    } else {
      console.log('⚠️ No ad accounts found or error occurred');
    }

    // Test 5: Get Account Metrics (if accounts exist)
    if (accounts && accounts.length > 0) {
      console.log('\n5️⃣ Testing account metrics...');
      const firstAccount = accounts[0];
      const metrics = await GoogleAdsService.getAccountMetrics(firstAccount.id);
      
      if (metrics) {
        console.log(`✅ Metrics retrieved for ${firstAccount.name}:`);
        console.log(`   - Impressions: ${metrics.impressions || 'N/A'}`);
        console.log(`   - Clicks: ${metrics.clicks || 'N/A'}`);
        console.log(`   - Cost: ${metrics.cost || 'N/A'}`);
      } else {
        console.log('❌ Failed to get account metrics');
      }
    }

    console.log('\n🎉 Google Ads API integration test completed successfully!');

  } catch (error) {
    console.error('❌ Google Ads API test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testGoogleAdsAPI().catch(console.error);
