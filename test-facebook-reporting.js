// Quick test script to verify Facebook Ads reporting service
import { facebookAdsReportingService } from './src/services/data/facebookAdsReportingService';

async function testFacebookAdsReporting() {
  try {
    console.log('Testing Facebook Ads Reporting Service...');
    
    const periods = facebookAdsReportingService.getAvailablePeriods();
    console.log('Available periods:', periods);
    
    const data = await facebookAdsReportingService.getFacebookAdsReportingData('30d');
    console.log('Reporting data:', {
      totalClients: data.totalClients,
      activeAccounts: data.activeAccounts,
      totalSpend: data.totalSpend,
      totalLeads: data.totalLeads,
      venuesCount: data.data.length
    });
    
    console.log('✅ Facebook Ads Reporting Service test completed successfully');
  } catch (error) {
    console.error('❌ Facebook Ads Reporting Service test failed:', error);
  }
}

// Run test if this script is executed directly
if (require.main === module) {
  testFacebookAdsReporting();
}

export { testFacebookAdsReporting };

