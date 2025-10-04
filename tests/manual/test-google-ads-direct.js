// Test Google Ads API directly
console.log('=== TESTING GOOGLE ADS API DIRECTLY ===');

// Import services
import { GoogleAdsService } from '@/services/api/googleAdsService';
import { DatabaseService } from '@/services/data/databaseService';

try {
  console.log('1. Testing GoogleAdsService.getAdAccounts()...');
  const accounts = await GoogleAdsService.getAdAccounts();
  console.log('✅ SUCCESS: Google Ads accounts fetched:', accounts);
} catch (error) {
  console.error('❌ ERROR: Google Ads API failed:', error);
  console.error('Error details:', {
    message: error.message,
    stack: error.stack
  });
}

// Test database access
try {
  console.log('2. Testing database integration access...');
  const integrations = await DatabaseService.getIntegrations();
  const googleIntegration = integrations.find(i => i.platform === 'googleAds' && i.connected);
  console.log('Google integration from database:', {
    found: !!googleIntegration,
    hasTokens: !!googleIntegration?.config?.tokens,
    hasAccessToken: !!googleIntegration?.config?.tokens?.accessToken,
    tokenLength: googleIntegration?.config?.tokens?.accessToken?.length
  });
} catch (error) {
  console.error('❌ Database access failed:', error);
}
