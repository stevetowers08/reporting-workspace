// Quick Facebook API Test
// Run this in browser console to test the API

const testFacebookAPI = async () => {
  console.log('🧪 Quick Facebook API Test');
  
  try {
    // Import the service
    const { FacebookAdsService } = await import('./src/services/api/facebookAdsService.ts');
    
    // Test 1: Get access token
    console.log('1. Testing access token...');
    const token = await FacebookAdsService.getAccessToken();
    console.log('✅ Token retrieved:', token.substring(0, 20) + '...');
    
    // Test 2: Authenticate
    console.log('2. Testing authentication...');
    const auth = await FacebookAdsService.authenticate();
    console.log(auth ? '✅ Authentication successful' : '❌ Authentication failed');
    
    if (!auth) return;
    
    // Test 3: Get ad accounts
    console.log('3. Testing ad accounts...');
    const accounts = await FacebookAdsService.getAdAccounts();
    console.log(`✅ Found ${accounts.length} ad accounts`);
    
    if (accounts.length === 0) {
      console.log('❌ No ad accounts found - check Facebook app permissions');
      return;
    }
    
    // Test 4: Get metrics for first account
    console.log('4. Testing account metrics...');
    const metrics = await FacebookAdsService.getAccountMetrics(
      accounts[0].id,
      { start: '2024-01-01', end: '2024-12-31' }
    );
    
    console.log('✅ Metrics retrieved:');
    console.log('  Leads:', metrics.leads);
    console.log('  Spend:', metrics.spend);
    console.log('  Impressions:', metrics.impressions);
    console.log('  Clicks:', metrics.clicks);
    
    console.log('\n🎉 Facebook API is working correctly!');
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    console.log('Error details:', error);
  }
};

// Run the test
testFacebookAPI();
