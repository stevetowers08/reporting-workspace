// Dashboard Data Debug Test
// Run this in the browser console to debug the dashboard data loading

console.log('🔍 Dashboard Data Debug Test Starting...');

(async () => {
  try {
    // Test 1: Check available clients
    console.log('\n📋 Step 1: Checking Available Clients');
    const { DatabaseService } = await import('./src/services/data/databaseService.ts');
    
    const clients = await DatabaseService.getAllClients();
    console.log(`Found ${clients.length} clients:`, clients.map(c => ({ id: c.id, name: c.name })));
    
    if (clients.length === 0) {
      console.log('❌ No clients found in database - this is the problem!');
      console.log('💡 Solution: Create a client in the admin panel first');
      return;
    }
    
    // Test 2: Check first client's account configuration
    console.log('\n🔧 Step 2: Checking Client Account Configuration');
    const firstClient = clients[0];
    console.log('First client:', firstClient);
    
    const clientData = await DatabaseService.getClientById(firstClient.id);
    console.log('Client data:', clientData);
    
    if (clientData?.accounts) {
      console.log('Account configuration:', {
        facebookAds: clientData.accounts.facebookAds || 'Not set',
        googleAds: clientData.accounts.googleAds || 'Not set',
        goHighLevel: clientData.accounts.goHighLevel || 'Not set',
        googleSheets: clientData.accounts.googleSheets || 'Not set'
      });
    } else {
      console.log('❌ No account configuration found for client');
    }
    
    // Test 3: Test EventMetricsService with actual client data
    console.log('\n📊 Step 3: Testing EventMetricsService with Real Client Data');
    const { EventMetricsService } = await import('./src/services/data/eventMetricsService.ts');
    
    const clientAccounts = {
      facebookAds: clientData?.accounts?.facebookAds,
      googleAds: clientData?.accounts?.googleAds,
      goHighLevel: clientData?.accounts?.goHighLevel,
      googleSheets: clientData?.accounts?.googleSheets
    };
    
    console.log('Using client accounts:', clientAccounts);
    
    const metrics = await EventMetricsService.getComprehensiveMetrics(
      firstClient.id,
      { start: '2024-01-01', end: '2024-12-31' },
      clientAccounts
    );
    
    console.log('✅ Comprehensive metrics retrieved:');
    console.log('  Total leads:', metrics.totalLeads);
    console.log('  Total spend:', metrics.totalSpend);
    console.log('  Facebook leads:', metrics.facebookMetrics?.leads);
    console.log('  Facebook spend:', metrics.facebookMetrics?.spend);
    console.log('  Google leads:', metrics.googleMetrics?.leads);
    console.log('  Google spend:', metrics.googleMetrics?.cost);
    console.log('  ROI:', metrics.roi);
    
    // Test 4: Check if Facebook API is being called
    console.log('\n🔍 Step 4: Checking Facebook API Integration');
    if (clientAccounts.facebookAds && clientAccounts.facebookAds !== 'none') {
      console.log('✅ Facebook Ads account configured:', clientAccounts.facebookAds);
      
      const { FacebookAdsService } = await import('./src/services/api/facebookAdsService.ts');
      
      try {
        const facebookMetrics = await FacebookAdsService.getAccountMetrics(
          clientAccounts.facebookAds,
          { start: '2024-01-01', end: '2024-12-31' }
        );
        
        console.log('✅ Facebook API working:');
        console.log('  Leads:', facebookMetrics.leads);
        console.log('  Spend:', facebookMetrics.spend);
        console.log('  Impressions:', facebookMetrics.impressions);
        
      } catch (error) {
        console.log('❌ Facebook API error:', error.message);
      }
    } else {
      console.log('❌ Facebook Ads account not configured');
      console.log('💡 Solution: Configure Facebook Ads account in admin panel');
    }
    
  } catch (error) {
    console.log('❌ Dashboard debug error:', error.message);
    console.log('Full error:', error);
  }
})();

console.log('\n🎯 Dashboard debug complete! Check results above.');
