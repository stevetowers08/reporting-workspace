// Facebook API Debug Test
// Run this in the browser console at http://127.0.0.1:8086/

console.log('🔍 Starting Facebook API Debug Test...');

// Test 1: Check if environment variables are loaded
console.log('📋 Environment Variables Check:');
console.log('VITE_FACEBOOK_CLIENT_ID:', import.meta.env.VITE_FACEBOOK_CLIENT_ID);
console.log('VITE_FACEBOOK_ACCESS_TOKEN exists:', !!import.meta.env.VITE_FACEBOOK_ACCESS_TOKEN);

if (import.meta.env.VITE_FACEBOOK_ACCESS_TOKEN) {
  console.log('Token length:', import.meta.env.VITE_FACEBOOK_ACCESS_TOKEN.length);
  console.log('Token preview:', import.meta.env.VITE_FACEBOOK_ACCESS_TOKEN.substring(0, 20) + '...');
}

// Test 2: Check localStorage for OAuth tokens
console.log('\n💾 LocalStorage Check:');
const oauthTokens = localStorage.getItem('oauth_tokens_facebook');
console.log('OAuth tokens in localStorage:', oauthTokens ? 'Found' : 'Not found');

if (oauthTokens) {
  try {
    const tokens = JSON.parse(oauthTokens);
    console.log('Parsed tokens:', {
      hasAccessToken: !!tokens.accessToken,
      tokenLength: tokens.accessToken?.length || 0,
      expiresAt: tokens.expiresAt
    });
  } catch (e) {
    console.log('Error parsing OAuth tokens:', e.message);
  }
}

// Test 3: Test FacebookAdsService
console.log('\n📊 FacebookAdsService Test:');
(async () => {
  try {
    const { FacebookAdsService } = await import('./src/services/api/facebookAdsService.ts');
    
    console.log('Service imported successfully');
    
    // Test getAccessToken
    console.log('Testing getAccessToken()...');
    const token = await FacebookAdsService.getAccessToken();
    console.log('✅ Access token retrieved:', token.substring(0, 20) + '...');
    
    // Test authentication
    console.log('Testing authenticate()...');
    const authResult = await FacebookAdsService.authenticate();
    console.log('Authentication result:', authResult ? '✅ Success' : '❌ Failed');
    
    if (authResult) {
      // Test ad accounts
      console.log('Testing getAdAccounts()...');
      const accounts = await FacebookAdsService.getAdAccounts();
      console.log(`✅ Found ${accounts.length} ad accounts`);
      
      if (accounts.length > 0) {
        console.log('First account:', {
          id: accounts[0].id,
          name: accounts[0].name,
          status: accounts[0].accountStatus
        });
        
        // Test metrics
        console.log('Testing getAccountMetrics()...');
        const metrics = await FacebookAdsService.getAccountMetrics(
          accounts[0].id,
          { start: '2024-01-01', end: '2024-12-31' }
        );
        
        console.log('✅ Metrics retrieved:');
        console.log('  Leads:', metrics.leads);
        console.log('  Spend:', metrics.spend);
        console.log('  Impressions:', metrics.impressions);
        console.log('  Clicks:', metrics.clicks);
        
        if (metrics.leads === 0 && metrics.spend === 0) {
          console.log('⚠️  Warning: All metrics are zero - this might be normal if no campaigns ran in 2024');
        }
      } else {
        console.log('❌ No ad accounts found - check Facebook app permissions');
      }
    }
    
  } catch (error) {
    console.log('❌ FacebookAdsService error:', error.message);
    console.log('Full error:', error);
  }
})();

// Test 4: Check EventMetricsService integration
console.log('\n🔄 EventMetricsService Integration Test:');
(async () => {
  try {
    const { EventMetricsService } = await import('./src/services/data/eventMetricsService.ts');
    
    // Test with a mock client
    const testClientAccounts = {
      facebookAds: 'test_account', // This will be replaced by actual account
      googleAds: 'none',
      goHighLevel: 'none',
      googleSheets: 'none'
    };
    
    console.log('Testing getComprehensiveMetrics()...');
    const comprehensiveMetrics = await EventMetricsService.getComprehensiveMetrics(
      'test_client',
      { start: '2024-01-01', end: '2024-12-31' },
      testClientAccounts
    );
    
    console.log('✅ Comprehensive metrics retrieved:');
    console.log('  Facebook leads:', comprehensiveMetrics.facebookMetrics?.leads);
    console.log('  Facebook spend:', comprehensiveMetrics.facebookMetrics?.spend);
    console.log('  Total leads:', comprehensiveMetrics.totalLeads);
    console.log('  Total spend:', comprehensiveMetrics.totalSpend);
    console.log('  ROI:', comprehensiveMetrics.roi);
    
  } catch (error) {
    console.log('❌ EventMetricsService error:', error.message);
    console.log('Full error:', error);
  }
})();

console.log('\n🎯 Debug test complete! Check the results above.');
