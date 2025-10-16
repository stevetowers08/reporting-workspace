// Quick fix: Store your real Facebook access token
const _storeRealFacebookToken = async (realAccessToken) => {
  try {
    const { UnifiedCredentialService } = await import('/src/services/auth/unifiedCredentialService.ts');
    
    // Get existing config
    const existingConfig = await UnifiedCredentialService.getCredentials('facebookAds');
    
    // Update with real access token
    const updatedConfig = {
      ...existingConfig,
      accessToken: realAccessToken,
      tokenType: 'Bearer',
      lastUpdated: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      isActive: true
    };
    
    // Store in unified credential system
    const success = await UnifiedCredentialService.storeCredentials('facebookAds', updatedConfig);
    
    if (success) {
      console.log('✅ Real Facebook token stored successfully!');
      
      // Test the API
      const { FacebookAdsService } = await import('/src/services/api/facebookAdsService.ts');
      const isValid = await FacebookAdsService.authenticate();
      console.log('Facebook API test:', isValid ? '✅ Working!' : '❌ Still failing');
      
      return isValid;
    } else {
      console.log('❌ Failed to store token');
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error);
    return false;
  }
};

// Usage: storeRealFacebookToken('YOUR_REAL_FACEBOOK_ACCESS_TOKEN_HERE');
console.log('📝 To fix Facebook API:');
console.log('1. Get your real Facebook access token from Facebook Developer Console');
console.log('2. Run: storeRealFacebookToken("YOUR_REAL_TOKEN")');
console.log('3. Or use OAuth flow by clicking "Connect Facebook (OAuth)" button');
