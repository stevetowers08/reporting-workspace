/**
 * API Testing Script for Google Ads and Go High Level
 * This script tests the frontend API calls and logs detailed error information
 */

// Test Google Ads API calls
async function testGoogleAdsAPI() {
  console.log('🔍 Testing Google Ads API calls...');
  
  try {
    // Test 1: Check if Google Ads is connected
    const { TokenManager } = await import('./src/services/auth/TokenManager.ts');
    const isConnected = await TokenManager.isConnected('googleAds');
    console.log('🔍 Google Ads connected:', isConnected);
    
    if (!isConnected) {
      console.log('❌ Google Ads not connected - skipping API tests');
      return;
    }
    
    // Test 2: Get access token
    const accessToken = await TokenManager.getAccessToken('googleAds');
    console.log('🔍 Google Ads access token:', accessToken ? 'Found' : 'Not found');
    
    if (!accessToken) {
      console.log('❌ No Google Ads access token available');
      return;
    }
    
    // Test 3: Test Google Ads service
    const { GoogleAdsService } = await import('./src/services/api/googleAdsService.ts');
    
    console.log('🔍 Testing Google Ads getAdAccounts...');
    const accounts = await GoogleAdsService.getAdAccounts();
    console.log('🔍 Google Ads accounts:', accounts);
    
    if (accounts.length > 0) {
      console.log('🔍 Testing Google Ads getAccountMetrics...');
      const metrics = await GoogleAdsService.getAccountMetrics(accounts[0].id, {
        start: '2024-01-01',
        end: '2024-01-31'
      });
      console.log('🔍 Google Ads metrics:', metrics);
    }
    
  } catch (error) {
    console.error('❌ Google Ads API test failed:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
  }
}

// Test Go High Level API calls
async function testGoHighLevelAPI() {
  console.log('🔍 Testing Go High Level API calls...');
  
  try {
    // Test 1: Check if Go High Level is connected
    const { TokenManager } = await import('./src/services/auth/TokenManager.ts');
    const isConnected = await TokenManager.isConnected('goHighLevel');
    console.log('🔍 Go High Level connected:', isConnected);
    
    if (!isConnected) {
      console.log('❌ Go High Level not connected - skipping API tests');
      return;
    }
    
    // Test 2: Get access token
    const accessToken = await TokenManager.getAccessToken('goHighLevel');
    console.log('🔍 Go High Level access token:', accessToken ? 'Found' : 'Not found');
    
    if (!accessToken) {
      console.log('❌ No Go High Level access token available');
      return;
    }
    
    // Test 3: Test Go High Level service
    const { GoHighLevelService } = await import('./src/services/api/goHighLevelService.ts');
    
    console.log('🔍 Testing Go High Level getLocations...');
    const locations = await GoHighLevelService.getLocations();
    console.log('🔍 Go High Level locations:', locations);
    
    if (locations.length > 0) {
      console.log('🔍 Testing Go High Level getGHLMetrics...');
      const metrics = await GoHighLevelService.getGHLMetrics(locations[0].id, {
        start: '2024-01-01',
        end: '2024-01-31'
      });
      console.log('🔍 Go High Level metrics:', metrics);
    }
    
  } catch (error) {
    console.error('❌ Go High Level API test failed:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
  }
}

// Test EventMetricsService
async function testEventMetricsService() {
  console.log('🔍 Testing EventMetricsService...');
  
  try {
    const { EventMetricsService } = await import('./src/services/data/eventMetricsService.ts');
    
    const metrics = await EventMetricsService.getComprehensiveMetrics(
      'test-client',
      { start: '2024-01-01', end: '2024-01-31' },
      {
        facebookAds: 'test-facebook-account',
        googleAds: 'test-google-account',
        goHighLevel: 'test-ghl-location'
      }
    );
    
    console.log('🔍 EventMetricsService result:', metrics);
    
  } catch (error) {
    console.error('❌ EventMetricsService test failed:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
  }
}

// Test database connections
async function testDatabaseConnections() {
  console.log('🔍 Testing database connections...');
  
  try {
    const { DatabaseService } = await import('./src/services/data/databaseService.ts');
    
    console.log('🔍 Testing getAllClients...');
    const clients = await DatabaseService.getAllClients();
    console.log('🔍 Clients:', clients);
    
    console.log('🔍 Testing getIntegrations...');
    const integrations = await DatabaseService.getIntegrations();
    console.log('🔍 Integrations:', integrations);
    
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting API testing...');
  console.log('=====================================');
  
  await testDatabaseConnections();
  console.log('=====================================');
  
  await testGoogleAdsAPI();
  console.log('=====================================');
  
  await testGoHighLevelAPI();
  console.log('=====================================');
  
  await testEventMetricsService();
  console.log('=====================================');
  
  console.log('✅ API testing completed');
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.testAPIs = {
    testGoogleAdsAPI,
    testGoHighLevelAPI,
    testEventMetricsService,
    testDatabaseConnections,
    runAllTests
  };
  console.log('🔍 API testing functions available as window.testAPIs');
}

// Run tests if this is executed directly
if (typeof window === 'undefined') {
  runAllTests().catch(console.error);
}
