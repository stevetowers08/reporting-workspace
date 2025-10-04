// Facebook API Troubleshooting Script
// Run this in the browser console after the app loads

const troubleshootFacebookAPI = async () => {
  console.log('🔍 Facebook API Troubleshooting Started...\n');

  try {
    // 1. Check environment variables
    console.log('📋 Step 1: Checking Environment Variables');
    console.log('VITE_FACEBOOK_CLIENT_ID:', import.meta.env.VITE_FACEBOOK_CLIENT_ID);
    console.log('VITE_FACEBOOK_CLIENT_SECRET:', import.meta.env.VITE_FACEBOOK_CLIENT_SECRET ? 'Set' : 'Not set');
    console.log('VITE_FACEBOOK_ACCESS_TOKEN:', import.meta.env.VITE_FACEBOOK_ACCESS_TOKEN ? 'Set' : 'Not set');
    
    if (import.meta.env.VITE_FACEBOOK_ACCESS_TOKEN) {
      console.log('Token length:', import.meta.env.VITE_FACEBOOK_ACCESS_TOKEN.length);
      console.log('Token starts with:', import.meta.env.VITE_FACEBOOK_ACCESS_TOKEN.substring(0, 10) + '...');
    }

    // 2. Test FacebookAdsService
    console.log('\n📊 Step 2: Testing FacebookAdsService');
    const { FacebookAdsService } = await import('./src/services/api/facebookAdsService.ts');
    
    // Test token retrieval
    console.log('Testing getAccessToken()...');
    try {
      const token = await FacebookAdsService.getAccessToken();
      console.log('✅ Token retrieved successfully');
      console.log('Token length:', token.length);
      console.log('Token starts with:', token.substring(0, 10) + '...');
    } catch (error) {
      console.log('❌ Token retrieval failed:', error.message);
      return;
    }

    // Test authentication
    console.log('\n🔐 Step 3: Testing Authentication');
    try {
      const isAuthenticated = await FacebookAdsService.authenticate();
      console.log('Authentication result:', isAuthenticated ? '✅ Success' : '❌ Failed');
      
      if (!isAuthenticated) {
        console.log('❌ Authentication failed - check token validity');
        return;
      }
    } catch (error) {
      console.log('❌ Authentication error:', error.message);
      return;
    }

    // Test ad accounts
    console.log('\n📱 Step 4: Testing Ad Accounts');
    try {
      const accounts = await FacebookAdsService.getAdAccounts();
      console.log('Ad accounts found:', accounts.length);
      
      if (accounts.length === 0) {
        console.log('❌ No ad accounts found - check Facebook app permissions');
        return;
      }
      
      console.log('Account details:', accounts.map(acc => ({
        id: acc.id,
        name: acc.name,
        accountStatus: acc.accountStatus
      })));
    } catch (error) {
      console.log('❌ Ad accounts error:', error.message);
      return;
    }

    // Test account metrics
    console.log('\n📈 Step 5: Testing Account Metrics');
    try {
      const accounts = await FacebookAdsService.getAdAccounts();
      if (accounts.length > 0) {
        const metrics = await FacebookAdsService.getAccountMetrics(
          accounts[0].id,
          { start: '2024-01-01', end: '2024-12-31' }
        );
        
        console.log('✅ Metrics retrieved successfully:');
        console.log('Leads:', metrics.leads);
        console.log('Spend:', metrics.spend);
        console.log('Impressions:', metrics.impressions);
        console.log('Clicks:', metrics.clicks);
        console.log('CTR:', metrics.ctr);
        console.log('CPC:', metrics.cpc);
        
        if (metrics.leads === 0 && metrics.spend === 0) {
          console.log('⚠️  Warning: All metrics are zero - check date range and account data');
        }
      }
    } catch (error) {
      console.log('❌ Metrics error:', error.message);
      console.log('Error details:', error);
    }

    // Test EventMetricsService integration
    console.log('\n🔄 Step 6: Testing EventMetricsService Integration');
    try {
      const { EventMetricsService } = await import('./src/services/data/eventMetricsService.ts');
      
      const clientAccounts = {
        facebookAds: 'test_account_id', // This will be replaced by actual account ID
        googleAds: 'none',
        goHighLevel: 'none',
        googleSheets: 'none'
      };
      
      const metrics = await EventMetricsService.getComprehensiveMetrics(
        'test_client',
        { start: '2024-01-01', end: '2024-12-31' },
        clientAccounts
      );
      
      console.log('✅ EventMetricsService integration successful:');
      console.log('Facebook leads:', metrics.facebookMetrics?.leads);
      console.log('Facebook spend:', metrics.facebookMetrics?.spend);
      console.log('Total leads:', metrics.totalLeads);
      console.log('Total spend:', metrics.totalSpend);
      
    } catch (error) {
      console.log('❌ EventMetricsService error:', error.message);
    }

    console.log('\n🎉 Troubleshooting Complete!');
    console.log('If you see ✅ marks above, the Facebook API is working correctly.');
    console.log('If you see ❌ marks, check the specific error messages for solutions.');

  } catch (error) {
    console.log('❌ General troubleshooting error:', error.message);
    console.log('Error details:', error);
  }
};

// Run the troubleshooting
troubleshootFacebookAPI();
