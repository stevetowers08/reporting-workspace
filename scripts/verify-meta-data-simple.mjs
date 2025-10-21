/*
 * Simple verification script for Fire House Loft Meta ads data
 * This script directly calls the Facebook API to verify the demographics and platform breakdown data
 */

// Simple console logger to avoid debug config issues
const log = {
  info: (msg, ...args) => console.log(`[INFO] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[ERROR] ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[WARN] ${msg}`, ...args)
};

async function verifyFireHouseLoftData() {
  try {
    log.info('🔍 Verifying Fire House Loft Meta ads data...');
    
    // Import the Facebook service
    const { FacebookAdsService } = await import('../src/services/api/facebookAdsService.ts');
    
    // Get the last 30 days date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);
    
    const dateRange = {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    };
    
    log.info('📅 Date range:', dateRange);
    
    // Get Facebook ad accounts to find Fire House Loft account
    log.info('🔍 Discovering Facebook ad accounts...');
    const accounts = await FacebookAdsService.getAdAccounts();
    
    if (!accounts || accounts.length === 0) {
      log.error('❌ No Facebook ad accounts found');
      return;
    }
    
    log.info('📊 Available accounts:', accounts.map(a => ({ id: a.id, name: a.name })));
    
    // Find Fire House Loft account (or use first available)
    const fireHouseAccount = accounts.find(a => 
      (a.name || a.descriptiveName || '').toLowerCase().includes('fire house loft')
    ) || accounts[0];
    
    const accountId = fireHouseAccount.id || fireHouseAccount.account_id || '';
    if (!accountId) {
      log.error('❌ No account ID found');
      return;
    }
    
    const formattedAccountId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
    log.info('🎯 Using account:', formattedAccountId, '(', fireHouseAccount.name, ')');
    
    // Get main metrics
    log.info('📈 Fetching main metrics...');
    const mainMetrics = await FacebookAdsService.getAccountMetrics(formattedAccountId, dateRange, 'lead', false);
    
    log.info('📊 Main Metrics:');
    log.info('  - Leads:', mainMetrics.leads);
    log.info('  - Spend:', mainMetrics.spend);
    log.info('  - Impressions:', mainMetrics.impressions);
    log.info('  - Clicks:', mainMetrics.clicks);
    log.info('  - CTR:', mainMetrics.ctr);
    log.info('  - CPC:', mainMetrics.cpc);
    
    // Get demographic breakdown
    log.info('👥 Fetching demographic breakdown...');
    const demographics = await FacebookAdsService.getDemographicBreakdown(formattedAccountId, dateRange);
    
    log.info('👥 Demographics:');
    if (demographics) {
      log.info('  - Age Groups:', demographics.ageGroups);
      log.info('  - Gender:', demographics.gender);
    } else {
      log.info('  - No demographic data available');
    }
    
    // Get platform breakdown
    log.info('📱 Fetching platform breakdown...');
    const platformBreakdown = await FacebookAdsService.getPlatformBreakdown(formattedAccountId, dateRange);
    
    log.info('📱 Platform Breakdown:');
    if (platformBreakdown) {
      log.info('  - Facebook vs Instagram:', platformBreakdown.facebookVsInstagram);
      log.info('  - Ad Placements:', platformBreakdown.adPlacements);
    } else {
      log.info('  - No platform breakdown data available');
    }
    
    // Summary comparison
    log.info('\n📋 SUMMARY COMPARISON:');
    log.info('Dashboard shows:');
    log.info('  - Leads: 94');
    log.info('  - Spend: $484');
    log.info('  - Age Groups: 25-34: 14%, 35-44: 33%, 45-54: 38%, 55+: 14%');
    log.info('  - Gender: Female: 87%, Male: 13%');
    log.info('  - Platforms: Facebook: 59%, Instagram: 41%');
    log.info('  - Placements: Feed: 23%, Stories: 0%, Reels: 77%');
    
    log.info('\nAPI returns:');
    log.info('  - Leads:', mainMetrics.leads);
    log.info('  - Spend:', mainMetrics.spend);
    log.info('  - Demographics:', demographics);
    log.info('  - Platform Breakdown:', platformBreakdown);
    
  } catch (error) {
    log.error('❌ Error verifying data:', error);
  }
}

// Run the verification
verifyFireHouseLoftData().catch(console.error);
