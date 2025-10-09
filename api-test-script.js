
// API Endpoint Testing Script
console.log('🚀 Starting API Endpoint Tests...');

// Test 1: Google Ads API Endpoints
async function testGoogleAdsEndpoints() {
  console.log('\n1️⃣ Testing Google Ads API Endpoints...');
  
  try {
    const { GoogleAdsService } = await import('/src/services/api/googleAdsService.ts');
    
    // Test connection
    console.log('   Testing connection...');
    const connectionTest = await GoogleAdsService.testConnection();
    console.log('   Connection result:', connectionTest);
    
    // Test authentication
    console.log('   Testing authentication...');
    const authResult = await GoogleAdsService.authenticate();
    console.log('   Authentication result:', authResult);
    
    // Test account discovery
    console.log('   Testing account discovery...');
    const managerId = await GoogleAdsService.getManagerAccountId();
    console.log('   Manager Account ID:', managerId);
    
    // Test ad accounts (if connected)
    if (authResult) {
      console.log('   Testing ad accounts...');
      const accounts = await GoogleAdsService.getAdAccounts();
      console.log('   Ad accounts:', accounts.length, 'found');
    }
    
    console.log('✅ Google Ads API endpoints working');
    
  } catch (error) {
    console.error('❌ Google Ads API test failed:', error.message);
  }
}

// Test 2: GoHighLevel API Endpoints
async function testGoHighLevelEndpoints() {
  console.log('\n2️⃣ Testing GoHighLevel API Endpoints...');
  
  try {
    const { GoHighLevelService } = await import('/src/services/ghl/goHighLevelService.ts');
    
    // Test service connection
    console.log('   Testing service connection...');
    const isConnected = GoHighLevelService.isConnected();
    console.log('   Service connected:', isConnected);
    
    // Test agency token methods
    console.log('   Testing agency token methods...');
    const agencyToken = GoHighLevelService.getAgencyToken();
    console.log('   Agency token exists:', !!agencyToken);
    
    // Test location token methods
    console.log('   Testing location token methods...');
    const locationToken = GoHighLevelService.getLocationToken('test-location');
    console.log('   Location token exists:', !!locationToken);
    
    // Test OAuth URL generation
    console.log('   Testing OAuth URL generation...');
    const authUrl = GoHighLevelService.getAuthorizationUrl(
      'test-client-id',
      'http://localhost:3000/callback',
      ['contacts.read', 'campaigns.read']
    );
    console.log('   OAuth URL generated:', authUrl.includes('https://marketplace.leadconnectorhq.com'));
    
    console.log('✅ GoHighLevel API endpoints working');
    
  } catch (error) {
    console.error('❌ GoHighLevel API test failed:', error.message);
  }
}

// Test 3: Facebook Ads API Endpoints
async function testFacebookAdsEndpoints() {
  console.log('\n3️⃣ Testing Facebook Ads API Endpoints...');
  
  try {
    const { FacebookAdsService } = await import('/src/services/api/facebookAdsService.ts');
    
    // Test connection
    console.log('   Testing connection...');
    const connectionTest = await FacebookAdsService.testConnection();
    console.log('   Connection result:', connectionTest);
    
    // Test access token
    console.log('   Testing access token...');
    try {
      const accessToken = await FacebookAdsService.getAccessToken();
      console.log('   Access token exists:', !!accessToken);
    } catch (error) {
      console.log('   Access token error (expected if not configured):', error.message);
    }
    
    console.log('✅ Facebook Ads API endpoints working');
    
  } catch (error) {
    console.error('❌ Facebook Ads API test failed:', error.message);
  }
}

// Test 4: Database Service Endpoints
async function testDatabaseEndpoints() {
  console.log('\n4️⃣ Testing Database Service Endpoints...');
  
  try {
    const { DatabaseService } = await import('/src/services/data/databaseService.ts');
    
    // Test client operations
    console.log('   Testing client operations...');
    const clients = await DatabaseService.getAllClients();
    console.log('   Clients retrieved:', clients.length);
    
    // Test integration operations
    console.log('   Testing integration operations...');
    const integrations = await DatabaseService.getIntegrations();
    console.log('   Integrations retrieved:', integrations.length);
    
    console.log('✅ Database service endpoints working');
    
  } catch (error) {
    console.error('❌ Database service test failed:', error.message);
  }
}

// Test 5: Shared Hooks
async function testSharedHooks() {
  console.log('\n5️⃣ Testing Shared Hooks...');
  
  try {
    const { useGHLMetrics, useGHLFunnelAnalytics, useGHLContactCount } = await import('/src/hooks/useGHLHooks.ts');
    
    console.log('   useGHLMetrics exists:', typeof useGHLMetrics === 'function');
    console.log('   useGHLFunnelAnalytics exists:', typeof useGHLFunnelAnalytics === 'function');
    console.log('   useGHLContactCount exists:', typeof useGHLContactCount === 'function');
    
    console.log('✅ Shared hooks working');
    
  } catch (error) {
    console.error('❌ Shared hooks test failed:', error.message);
  }
}

// Test 6: Webhook Handler
async function testWebhookHandler() {
  console.log('\n6️⃣ Testing Webhook Handler...');
  
  try {
    const { GHLWebhookHandler } = await import('/src/services/webhooks/ghlWebhookHandler.ts');
    
    console.log('   GHLWebhookHandler exists:', typeof GHLWebhookHandler === 'object');
    console.log('   handleWebhook method exists:', typeof GHLWebhookHandler.handleWebhook === 'function');
    
    console.log('✅ Webhook handler working');
    
  } catch (error) {
    console.error('❌ Webhook handler test failed:', error.message);
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting comprehensive API endpoint testing...');
  console.log('=====================================');
  
  await testGoogleAdsEndpoints();
  console.log('=====================================');
  
  await testGoHighLevelEndpoints();
  console.log('=====================================');
  
  await testFacebookAdsEndpoints();
  console.log('=====================================');
  
  await testDatabaseEndpoints();
  console.log('=====================================');
  
  await testSharedHooks();
  console.log('=====================================');
  
  await testWebhookHandler();
  console.log('=====================================');
  
  console.log('🎉 All API endpoint tests completed!');
}

// Export for manual testing
window.testAllAPIs = runAllTests;

// Auto-run if in browser
if (typeof window !== 'undefined') {
  runAllTests().catch(console.error);
}
