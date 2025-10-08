// Quick API Test Script
// Run this in the browser console at http://localhost:5173

async function quickAPITest() {
  console.log('🚀 Starting Quick API Test...');
  
  try {
    // Test 1: Check if we can import services
    console.log('📦 Testing service imports...');
    
    const { TokenManager } = await import('./src/services/auth/TokenManager.ts');
    console.log('✅ TokenManager imported successfully');
    
    const { GoogleAdsService } = await import('./src/services/api/googleAdsService.ts');
    console.log('✅ GoogleAdsService imported successfully');
    
    const { GoHighLevelService } = await import('./src/services/api/goHighLevelService.ts');
    console.log('✅ GoHighLevelService imported successfully');
    
    const { DatabaseService } = await import('./src/services/data/databaseService.ts');
    console.log('✅ DatabaseService imported successfully');
    
    // Test 2: Check connection status
    console.log('🔗 Testing connection status...');
    
    const googleConnected = await TokenManager.isConnected('googleAds');
    console.log(`Google Ads connected: ${googleConnected ? '✅' : '❌'}`);
    
    const ghlConnected = await TokenManager.isConnected('goHighLevel');
    console.log(`Go High Level connected: ${ghlConnected ? '✅' : '❌'}`);
    
    // Test 3: Test database connection
    console.log('🗄️ Testing database connection...');
    
    const clients = await DatabaseService.getAllClients();
    console.log(`✅ Database working - Found ${clients.length} clients`);
    
    const integrations = await DatabaseService.getIntegrations();
    console.log(`✅ Integrations working - Found ${integrations.length} integrations`);
    
    // Test 4: Test Google Ads if connected
    if (googleConnected) {
      console.log('🔍 Testing Google Ads API...');
      try {
        const accounts = await GoogleAdsService.getAdAccounts();
        console.log(`✅ Google Ads API working - Found ${accounts.length} accounts`);
      } catch (error) {
        console.log(`❌ Google Ads API error: ${error.message}`);
      }
    } else {
      console.log('⚠️ Google Ads not connected - skipping API test');
    }
    
    // Test 5: Test Go High Level if connected
    if (ghlConnected) {
      console.log('🔍 Testing Go High Level API...');
      // Since we're using location-level OAuth, we don't need to test getAllLocations
      console.log('✅ Go High Level API test skipped (location-level OAuth)');
    } else {
      console.log('⚠️ Go High Level not connected - skipping API test');
    }
    
    console.log('🎉 Quick API Test Complete!');
    
  } catch (error) {
    console.error('❌ Quick API Test Failed:', error);
  }
}

// Make it available globally
window.quickAPITest = quickAPITest;

console.log('🔧 Quick API test function available as window.quickAPITest()');
console.log('📝 Run quickAPITest() in the console to test APIs');
