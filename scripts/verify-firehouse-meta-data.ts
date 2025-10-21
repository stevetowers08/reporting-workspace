/*
 * Verification script for Fire House Loft Meta ads data
 * This script directly calls the Facebook API to verify the demographics and platform breakdown data
 */

import { FacebookAdsService } from '../src/services/api/facebookAdsService';

async function verifyFireHouseLoftData() {
  try {
    console.log('🔍 Verifying Fire House Loft Meta ads data...');
    
    // Get the last 30 days date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);
    
    const dateRange = {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    };
    
    console.log('📅 Date range:', dateRange);
    
    // Get Facebook ad accounts to find Fire House Loft account
    console.log('🔍 Discovering Facebook ad accounts...');
    const accounts = await FacebookAdsService.getAdAccounts();
    
    if (!accounts || accounts.length === 0) {
      console.error('❌ No Facebook ad accounts found');
      return;
    }
    
    console.log('📊 Available accounts:', accounts.map(a => ({ id: a.id, name: a.name })));
    
    // Find Fire House Loft account (or use first available)
    const fireHouseAccount = accounts.find((a: any) => 
      (a.name || a.descriptiveName || '').toLowerCase().includes('fire house loft')
    ) || accounts[0];
    
    const accountId = fireHouseAccount.id || fireHouseAccount.account_id || '';
    if (!accountId) {
      console.error('❌ No account ID found');
      return;
    }
    
    const formattedAccountId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
    console.log('🎯 Using account:', formattedAccountId, '(', fireHouseAccount.name, ')');
    
    // Get main metrics
    console.log('📈 Fetching main metrics...');
    const mainMetrics = await FacebookAdsService.getAccountMetrics(formattedAccountId, dateRange, 'lead', false);
    
    console.log('📊 Main Metrics:');
    console.log('  - Leads:', mainMetrics.leads);
    console.log('  - Spend:', mainMetrics.spend);
    console.log('  - Impressions:', mainMetrics.impressions);
    console.log('  - Clicks:', mainMetrics.clicks);
    console.log('  - CTR:', mainMetrics.ctr);
    console.log('  - CPC:', mainMetrics.cpc);
    
    // Get demographic breakdown
    console.log('👥 Fetching demographic breakdown...');
    const demographics = await FacebookAdsService.getDemographicBreakdown(formattedAccountId, dateRange);
    
    console.log('👥 Demographics:');
    if (demographics) {
      console.log('  - Age Groups:', demographics.ageGroups);
      console.log('  - Gender:', demographics.gender);
    } else {
      console.log('  - No demographic data available');
    }
    
    // Get platform breakdown
    console.log('📱 Fetching platform breakdown...');
    const platformBreakdown = await FacebookAdsService.getPlatformBreakdown(formattedAccountId, dateRange);
    
    console.log('📱 Platform Breakdown:');
    if (platformBreakdown) {
      console.log('  - Facebook vs Instagram:', platformBreakdown.facebookVsInstagram);
      console.log('  - Ad Placements:', platformBreakdown.adPlacements);
    } else {
      console.log('  - No platform breakdown data available');
    }
    
    // Summary comparison
    console.log('\n📋 SUMMARY COMPARISON:');
    console.log('Dashboard shows:');
    console.log('  - Leads: 94');
    console.log('  - Spend: $484');
    console.log('  - Age Groups: 25-34: 14%, 35-44: 33%, 45-54: 38%, 55+: 14%');
    console.log('  - Gender: Female: 87%, Male: 13%');
    console.log('  - Platforms: Facebook: 59%, Instagram: 41%');
    console.log('  - Placements: Feed: 23%, Stories: 0%, Reels: 77%');
    
    console.log('\nAPI returns:');
    console.log('  - Leads:', mainMetrics.leads);
    console.log('  - Spend:', mainMetrics.spend);
    console.log('  - Demographics:', demographics);
    console.log('  - Platform Breakdown:', platformBreakdown);
    
  } catch (error) {
    console.error('❌ Error verifying data:', error);
  }
}

// Run the verification
verifyFireHouseLoftData().catch(console.error);
