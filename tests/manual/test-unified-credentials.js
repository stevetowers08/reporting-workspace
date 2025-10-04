import { UnifiedCredentialService } from '@/services/auth/unifiedCredentialService';
import { FacebookAdsService } from '@/services/api/facebookAdsService';

// Test the unified credential system
const testUnifiedCredentials = async () => {
  console.log('🔍 Testing Unified Credential System...');
  
  try {
    // Test 1: Get Facebook credentials
    console.log('📡 Testing Facebook credentials...');
    const facebookCreds = await UnifiedCredentialService.getCredentials('facebookAds');
    console.log('Facebook credentials:', facebookCreds ? 'Found' : 'Not found');
    
    // Test 2: Get access token
    console.log('📡 Testing access token retrieval...');
    const token = await UnifiedCredentialService.getAccessToken('facebookAds');
    console.log('Access token:', token ? `${token.substring(0, 20)}...` : 'Not found');
    
    // Test 3: Test Facebook API with unified credentials
    console.log('📡 Testing Facebook API with unified credentials...');
    const isValid = await FacebookAdsService.authenticate();
    console.log('Facebook API authentication:', isValid ? '✅ Success' : '❌ Failed');
    
    // Test 4: Get connected platforms
    console.log('📡 Testing connected platforms...');
    const platforms = await UnifiedCredentialService.getConnectedPlatforms();
    console.log('Connected platforms:', platforms.map(p => p.platform));
    
    console.log('🎉 Unified credential system test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Run the test
testUnifiedCredentials();
