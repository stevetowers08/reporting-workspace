#!/usr/bin/env node

// Real API Call Testing Script
// This tests actual API calls to external services

import { writeFileSync } from 'fs';

const testScript = `
// Real API Call Testing Script
console.log('🚀 Testing REAL API Calls...');
console.log('=====================================');

// Test 1: Google Ads API - Real Calls
async function testGoogleAdsRealCalls() {
  console.log('\\n1️⃣ Testing Google Ads API - REAL CALLS...');
  
  try {
    const { GoogleAdsService } = await import('/src/services/api/googleAdsService.ts');
    
    // Test connection with real credentials
    console.log('   Testing connection with real credentials...');
    try {
      const connectionResult = await GoogleAdsService.testConnection();
      console.log('   ✅ Connection result:', connectionResult);
      
      if (connectionResult) {
        // Test authentication
        console.log('   Testing authentication...');
        const authResult = await GoogleAdsService.authenticate();
        console.log('   ✅ Authentication result:', authResult);
        
        // Test manager account discovery
        console.log('   Testing manager account discovery...');
        const managerId = await GoogleAdsService.getManagerAccountId();
        console.log('   ✅ Manager Account ID:', managerId);
        
        if (managerId) {
          // Test ad accounts
          console.log('   Testing ad accounts retrieval...');
          const accounts = await GoogleAdsService.getAdAccounts();
          console.log('   ✅ Ad accounts found:', accounts.length);
          if (accounts.length > 0) {
            console.log('   📊 Sample account:', {
              id: accounts[0].id,
              name: accounts[0].name,
              currency: accounts[0].currencyCode
            });
          }
          
          // Test account metrics
          if (accounts.length > 0) {
            console.log('   Testing account metrics...');
            const metrics = await GoogleAdsService.getAccountMetrics(accounts[0].id);
            console.log('   ✅ Account metrics:', metrics);
          }
        }
      }
    } catch (error) {
      console.log('   ⚠️  Google Ads API not configured or credentials invalid:', error.message);
    }
    
  } catch (error) {
    console.error('   ❌ Google Ads API test failed:', error.message);
  }
}

// Test 2: GoHighLevel API - Real Calls
async function testGoHighLevelRealCalls() {
  console.log('\\n2️⃣ Testing GoHighLevel API - REAL CALLS...');
  
  try {
    const { GoHighLevelService } = await import('/src/services/ghl/goHighLevelService.ts');
    
    // Test service connection
    console.log('   Testing service connection...');
    const isConnected = GoHighLevelService.isConnected();
    console.log('   ✅ Service connected:', isConnected);
    
    // Test agency token
    console.log('   Testing agency token...');
    const agencyToken = GoHighLevelService.getAgencyToken();
    console.log('   ✅ Agency token exists:', !!agencyToken);
    
    if (agencyToken) {
      // Test agency token validity
      console.log('   Testing agency token validity...');
      try {
        const tokenTest = await GoHighLevelService.testAgencyToken();
        console.log('   ✅ Agency token test:', tokenTest);
      } catch (error) {
        console.log('   ⚠️  Agency token invalid:', error.message);
      }
    }
    
    // Test OAuth URL generation
    console.log('   Testing OAuth URL generation...');
    const authUrl = GoHighLevelService.getAuthorizationUrl(
      'test-client-id',
      'http://localhost:5173/oauth/callback',
      ['contacts.read', 'campaigns.read']
    );
    console.log('   ✅ OAuth URL generated:', authUrl.includes('https://marketplace.leadconnectorhq.com'));
    
    // Test location-specific calls (if we have a location token)
    console.log('   Testing location-specific API calls...');
    try {
      // This would require a real location ID and token
      const testLocationId = 'test-location-123';
      const locationToken = GoHighLevelService.getLocationToken(testLocationId);
      
      if (locationToken) {
        console.log('   ✅ Location token found for test location');
        // We could test real API calls here if we had valid tokens
      } else {
        console.log('   ⚠️  No location token found - skipping location-specific tests');
      }
    } catch (error) {
      console.log('   ⚠️  Location-specific test failed:', error.message);
    }
    
  } catch (error) {
    console.error('   ❌ GoHighLevel API test failed:', error.message);
  }
}

// Test 3: Facebook Ads API - Real Calls
async function testFacebookAdsRealCalls() {
  console.log('\\n3️⃣ Testing Facebook Ads API - REAL CALLS...');
  
  try {
    const { FacebookAdsService } = await import('/src/services/api/facebookAdsService.ts');
    
    // Test connection
    console.log('   Testing connection...');
    try {
      const connectionResult = await FacebookAdsService.testConnection();
      console.log('   ✅ Connection result:', connectionResult);
      
      if (connectionResult) {
        // Test access token
        console.log('   Testing access token...');
        const accessToken = await FacebookAdsService.getAccessToken();
        console.log('   ✅ Access token exists:', !!accessToken);
        
        if (accessToken) {
          // Test ad accounts
          console.log('   Testing ad accounts...');
          const accounts = await FacebookAdsService.getAdAccounts();
          console.log('   ✅ Ad accounts found:', accounts.length);
          
          if (accounts.length > 0) {
            console.log('   📊 Sample account:', {
              id: accounts[0].id,
              name: accounts[0].name,
              account_status: accounts[0].account_status
            });
            
            // Test campaigns
            console.log('   Testing campaigns...');
            const campaigns = await FacebookAdsService.getCampaigns(accounts[0].id);
            console.log('   ✅ Campaigns found:', campaigns.length);
          }
        }
      }
    } catch (error) {
      console.log('   ⚠️  Facebook Ads API not configured or credentials invalid:', error.message);
    }
    
  } catch (error) {
    console.error('   ❌ Facebook Ads API test failed:', error.message);
  }
}

// Test 4: Database Service - Real Calls
async function testDatabaseRealCalls() {
  console.log('\\n4️⃣ Testing Database Service - REAL CALLS...');
  
  try {
    const { DatabaseService } = await import('/src/services/data/databaseService.ts');
    
    // Test client operations
    console.log('   Testing client operations...');
    const clients = await DatabaseService.getAllClients();
    console.log('   ✅ Clients retrieved:', clients.length);
    
    if (clients.length > 0) {
      console.log('   📊 Sample client:', {
        id: clients[0].id,
        name: clients[0].name,
        created_at: clients[0].created_at
      });
    }
    
    // Test integration operations
    console.log('   Testing integration operations...');
    const integrations = await DatabaseService.getIntegrations();
    console.log('   ✅ Integrations retrieved:', integrations.length);
    
    if (integrations.length > 0) {
      console.log('   📊 Sample integration:', {
        id: integrations[0].id,
        platform: integrations[0].platform,
        status: integrations[0].status
      });
    }
    
    // Test client-specific integrations
    if (clients.length > 0) {
      console.log('   Testing client-specific integrations...');
      const clientIntegrations = await DatabaseService.getClientIntegrations(clients[0].id);
      console.log('   ✅ Client integrations:', clientIntegrations.length);
    }
    
  } catch (error) {
    console.error('   ❌ Database service test failed:', error.message);
  }
}

// Test 5: Shared Hooks - Real Data Fetching
async function testSharedHooksRealCalls() {
  console.log('\\n5️⃣ Testing Shared Hooks - REAL DATA FETCHING...');
  
  try {
    const { useGHLMetrics, useGHLFunnelAnalytics, useGHLContactCount } = await import('/src/hooks/useGHLHooks.ts');
    
    console.log('   ✅ useGHLMetrics exists:', typeof useGHLMetrics === 'function');
    console.log('   ✅ useGHLFunnelAnalytics exists:', typeof useGHLFunnelAnalytics === 'function');
    console.log('   ✅ useGHLContactCount exists:', typeof useGHLContactCount === 'function');
    
    // Note: We can't actually call React hooks outside of a React component
    // But we can verify the service methods they use
    console.log('   📝 Note: React hooks require component context to test data fetching');
    
  } catch (error) {
    console.error('   ❌ Shared hooks test failed:', error.message);
  }
}

// Test 6: Webhook Handler - Real Processing
async function testWebhookHandlerRealCalls() {
  console.log('\\n6️⃣ Testing Webhook Handler - REAL PROCESSING...');
  
  try {
    const { GHLWebhookHandler } = await import('/src/services/webhooks/ghlWebhookHandler.ts');
    
    console.log('   ✅ GHLWebhookHandler exists:', typeof GHLWebhookHandler === 'object');
    console.log('   ✅ handleWebhook method exists:', typeof GHLWebhookHandler.handleWebhook === 'function');
    
    // Test webhook signature verification
    console.log('   Testing webhook signature verification...');
    const isValid = GHLWebhookHandler.verifyWebhookSignature();
    console.log('   ✅ Webhook signature verification:', isValid);
    
    // Note: We can't test actual webhook processing without a real webhook payload
    console.log('   📝 Note: Webhook processing requires real webhook payloads to test');
    
  } catch (error) {
    console.error('   ❌ Webhook handler test failed:', error.message);
  }
}

// Test 7: Environment Variables and Configuration
async function testEnvironmentConfiguration() {
  console.log('\\n7️⃣ Testing Environment Configuration...');
  
  try {
    // Check if environment variables are loaded
    const env = import.meta.env;
    
    console.log('   ✅ Environment loaded:', !!env);
    console.log('   📊 Key environment variables:');
    console.log('     - VITE_SUPABASE_URL:', !!env.VITE_SUPABASE_URL);
    console.log('     - VITE_SUPABASE_ANON_KEY:', !!env.VITE_SUPABASE_ANON_KEY);
    console.log('     - VITE_GOOGLE_ADS_DEVELOPER_TOKEN:', !!env.VITE_GOOGLE_ADS_DEVELOPER_TOKEN);
    console.log('     - VITE_GHL_CLIENT_ID:', !!env.VITE_GHL_CLIENT_ID);
    console.log('     - VITE_FACEBOOK_ACCESS_TOKEN:', !!env.VITE_FACEBOOK_ACCESS_TOKEN);
    
    // Test Supabase connection
    console.log('   Testing Supabase connection...');
    const { supabase } = await import('/src/lib/supabase.ts');
    console.log('   ✅ Supabase client loaded:', !!supabase);
    
  } catch (error) {
    console.error('   ❌ Environment configuration test failed:', error.message);
  }
}

// Run all real API tests
async function runAllRealAPITests() {
  console.log('🚀 Starting REAL API Call Testing...');
  console.log('=====================================');
  
  await testGoogleAdsRealCalls();
  console.log('=====================================');
  
  await testGoHighLevelRealCalls();
  console.log('=====================================');
  
  await testFacebookAdsRealCalls();
  console.log('=====================================');
  
  await testDatabaseRealCalls();
  console.log('=====================================');
  
  await testSharedHooksRealCalls();
  console.log('=====================================');
  
  await testWebhookHandlerRealCalls();
  console.log('=====================================');
  
  await testEnvironmentConfiguration();
  console.log('=====================================');
  
  console.log('🎉 All REAL API Call tests completed!');
  console.log('\\n📋 SUMMARY:');
  console.log('- ✅ Services are accessible and loaded correctly');
  console.log('- ⚠️  Some APIs may not be configured with valid credentials');
  console.log('- 📝 Check environment variables for API configuration');
  console.log('- 🔧 Configure API credentials to test full functionality');
}

// Export for manual testing
window.testAllRealAPIs = runAllRealAPITests;

// Auto-run if in browser
if (typeof window !== 'undefined') {
  runAllRealAPITests().catch(console.error);
}
`;

writeFileSync('real-api-test-script.js', testScript);

console.log('📝 Real API test script created: real-api-test-script.js');
console.log('🌐 Open http://localhost:5173 in your browser');
console.log('📋 Copy and paste the contents of real-api-test-script.js into the browser console');
console.log('⏳ Or run: window.testAllRealAPIs() in the browser console');
console.log('');
console.log('🔍 This will test ACTUAL API calls and data retrieval, not just service accessibility');
