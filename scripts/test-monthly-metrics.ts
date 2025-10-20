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
    // Try to find a Facebook ad account and test monthly metrics
    console.log('Discovering Facebook ad accounts...');
    const accounts = await FacebookAdsService.getAdAccounts();
    if (!accounts || accounts.length === 0) {
      console.warn('No Facebook ad accounts found. Skipping Facebook monthly test.');
      return;
    }
    const target = accounts.find((a: any) => (a.name || a.descriptiveName || '').toLowerCase().includes('fire house loft')) || accounts[0];
    const accountId: string = target.id || target.account_id || '';
    if (!accountId) {
      console.warn('Facebook account id not found on target. Skipping.');
      return;
    }
    const formatted = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
    console.log('Testing Facebook monthly metrics for account:', formatted);
    const f = await FacebookAdsService.getMonthlyMetrics(formatted, 'lead');
    console.log('Facebook monthly metrics:', f);
  } catch (e) {
    console.error('Facebook monthly metrics error:', e);
  }
}

run().catch(err => {
  console.error('Fatal error:', err);
});


