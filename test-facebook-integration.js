// Test Facebook Integration
import { FacebookAdsService } from './src/services/api/facebookAdsService.js';

async function testFacebookIntegration() {
  try {
    console.log('🧪 Testing Facebook Integration...');
    
    // Test 1: Get Access Token
    console.log('1. Testing getAccessToken...');
    const token = await FacebookAdsService.getAccessToken();
    console.log('✅ Access token retrieved:', token.substring(0, 20) + '...');
    
    // Test 2: Test Connection
    console.log('2. Testing connection...');
    const connectionResult = await FacebookAdsService.testConnection();
    console.log('✅ Connection test result:', connectionResult);
    
    // Test 3: Get Ad Accounts
    console.log('3. Testing getAdAccounts...');
    const accounts = await FacebookAdsService.getAdAccounts();
    console.log('✅ Ad accounts retrieved:', accounts.length, 'accounts');
    console.log('   First account:', accounts[0]?.name || 'N/A');
    
    // Test 4: Get Campaigns
    if (accounts.length > 0) {
      console.log('4. Testing getCampaigns...');
      const campaigns = await FacebookAdsService.getCampaigns(accounts[0].id);
      console.log('✅ Campaigns retrieved:', campaigns.length, 'campaigns');
      console.log('   First campaign:', campaigns[0]?.name || 'N/A');
    }
    
    console.log('🎉 All tests passed! Facebook integration is working.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testFacebookIntegration();
