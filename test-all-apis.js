// Quick API Test Script
// Run this in browser console to test all APIs

const testAllAPIs = async () => {
  console.log('🔍 Testing All APIs...');
  
  try {
    // Test 1: Database Service
    console.log('📊 Testing Database Service...');
    const { DatabaseService } = await import('./src/services/data/databaseService.ts');
    const clients = await DatabaseService.getAllClients();
    console.log('✅ Database Service:', clients.length, 'clients found');
    
    // Test 2: Facebook Ads Service
    console.log('📘 Testing Facebook Ads Service...');
    const { FacebookAdsService } = await import('./src/services/api/facebookAdsService.ts');
    // This will fail if no valid account, but we can see the error
    try {
      const fbMetrics = await FacebookAdsService.getAccountMetrics('test-account');
      console.log('✅ Facebook Ads Service:', fbMetrics);
    } catch (error) {
      console.log('⚠️ Facebook Ads Service Error:', error.message);
    }
    
    // Test 3: Google Ads Service
    console.log('📗 Testing Google Ads Service...');
    const { GoogleAdsService } = await import('./src/services/api/googleAdsService.ts');
    try {
      const googleMetrics = await GoogleAdsService.getAccountMetrics('test-account');
      console.log('✅ Google Ads Service:', googleMetrics);
    } catch (error) {
      console.log('⚠️ Google Ads Service Error:', error.message);
    }
    
    // Test 4: Lead Data Service
    console.log('📋 Testing Lead Data Service...');
    const { LeadDataService } = await import('./src/services/data/leadDataService.ts');
    try {
      const leadData = await LeadDataService.fetchLeadData();
      console.log('✅ Lead Data Service:', leadData);
    } catch (error) {
      console.log('⚠️ Lead Data Service Error:', error.message);
    }
    
    // Test 5: Event Metrics Service
    console.log('📈 Testing Event Metrics Service...');
    const { EventMetricsService } = await import('./src/services/data/eventMetricsService.ts');
    try {
      const metrics = await EventMetricsService.getComprehensiveMetrics(
        'test-client',
        { start: '2024-01-01', end: '2024-01-31' },
        { facebookAds: 'test-fb', googleAds: 'test-google' }
      );
      console.log('✅ Event Metrics Service:', metrics);
    } catch (error) {
      console.log('⚠️ Event Metrics Service Error:', error.message);
    }
    
    console.log('🎉 API Testing Complete!');
    
  } catch (error) {
    console.error('❌ API Test Failed:', error);
  }
};

// Run the test
testAllAPIs();
