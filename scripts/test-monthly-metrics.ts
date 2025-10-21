/*
  Quick tester for monthly metrics endpoints
*/

import { FacebookAdsService } from '../src/services/api/facebookAdsService';
import { GoogleAdsService } from '../src/services/api/googleAdsService';

async function run() {
  try {
    // Fire House Loft Google customer id from accounts listing: customers/5894368498
    const firehouseGoogleId = '5894368498';
    console.log('Testing Google monthly metrics for Fire House Loft:', firehouseGoogleId);
    const g = await GoogleAdsService.getMonthlyMetrics(firehouseGoogleId);
    console.log('Google monthly metrics:', g);
  } catch (e) {
    console.error('Google monthly metrics error:', e);
  }

  try {
    // Try to find a Facebook ad account and test demographics/platform breakdown
    console.log('Discovering Facebook ad accounts...');
    const accounts = await FacebookAdsService.getAdAccounts();
    if (!accounts || accounts.length === 0) {
      console.warn('No Facebook ad accounts found. Skipping Facebook test.');
      return;
    }
    const target = accounts.find((a: any) => (a.name || a.descriptiveName || '').toLowerCase().includes('fire house loft')) || accounts[0];
    const accountId: string = target.id || target.account_id || '';
    if (!accountId) {
      console.warn('Facebook account id not found on target. Skipping.');
      return;
    }
    const formatted = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
    console.log('Testing Facebook data for account:', formatted, '(', target.name, ')');
    
    // Get last 30 days date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);
    const dateRange = {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    };
    
    console.log('Date range:', dateRange);
    
    // Get main metrics
    console.log('Getting main metrics...');
    const mainMetrics = await FacebookAdsService.getAccountMetrics(formatted, dateRange, 'lead', false);
    console.log('Main metrics:', {
      leads: mainMetrics.leads,
      spend: mainMetrics.spend,
      impressions: mainMetrics.impressions,
      clicks: mainMetrics.clicks,
      ctr: mainMetrics.ctr,
      cpc: mainMetrics.cpc
    });
    
    // Get demographics
    console.log('Getting demographics...');
    const demographics = await FacebookAdsService.getDemographicBreakdown(formatted, dateRange);
    console.log('Demographics:', demographics);
    
    // Get platform breakdown
    console.log('Getting platform breakdown...');
    const platformBreakdown = await FacebookAdsService.getPlatformBreakdown(formatted, dateRange);
    console.log('Platform breakdown:', platformBreakdown);
    
    // Compare with dashboard data
    console.log('\n=== COMPARISON WITH DASHBOARD ===');
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
    
  } catch (e) {
    console.error('Facebook data verification error:', e);
  }
}

run().catch(err => {
  console.error('Fatal error:', err);
});


