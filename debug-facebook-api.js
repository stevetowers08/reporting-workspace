// Debug Facebook API connection
const debugFacebookAPI = async () => {
  console.log('🔍 Debugging Facebook API Connection...\n');

  try {
    // Check localStorage for tokens
    console.log('📱 Checking localStorage...');
    const oauthTokens = localStorage.getItem('oauth_tokens_facebook');
    console.log('OAuth tokens:', oauthTokens ? 'Found' : 'Not found');
    
    if (oauthTokens) {
      try {
        const tokens = JSON.parse(oauthTokens);
        console.log('Token details:', {
          hasAccessToken: !!tokens.accessToken,
          tokenLength: tokens.accessToken?.length || 0,
          expiresAt: tokens.expiresAt,
          scope: tokens.scope
        });
      } catch (e) {
        console.log('❌ Failed to parse OAuth tokens:', e.message);
      }
    }

    // Check unified credential service
    console.log('\n🔐 Checking Unified Credential Service...');
    try {
      const { UnifiedCredentialService } = await import('./src/services/auth/unifiedCredentialService.ts');
      const credentials = await UnifiedCredentialService.getCredentials('facebookAds');
      console.log('Unified credentials:', credentials ? 'Found' : 'Not found');
      
      if (credentials) {
        console.log('Credential details:', {
          hasAccessToken: !!credentials.accessToken,
          tokenLength: credentials.accessToken?.length || 0,
          isActive: credentials.isActive,
          lastUpdated: credentials.lastUpdated
        });
      }
    } catch (e) {
      console.log('❌ Unified credential service error:', e.message);
    }

    // Test Facebook service
    console.log('\n📊 Testing Facebook Ads Service...');
    try {
      const { FacebookAdsService } = await import('./src/services/api/facebookAdsService.ts');
      
      // Test authentication
      console.log('Testing authentication...');
      const isAuthenticated = await FacebookAdsService.authenticate();
      console.log('Authentication result:', isAuthenticated ? '✅ Success' : '❌ Failed');
      
      if (isAuthenticated) {
        // Test getting ad accounts
        console.log('Testing ad accounts...');
        const accounts = await FacebookAdsService.getAdAccounts();
        console.log('Ad accounts found:', accounts.length);
        console.log('Account details:', accounts.map(acc => ({ id: acc.id, name: acc.name })));
        
        if (accounts.length > 0) {
          // Test getting metrics
          console.log('Testing account metrics...');
          const metrics = await FacebookAdsService.getAccountMetrics(
            accounts[0].id,
            { start: '2024-01-01', end: '2024-12-31' }
          );
          console.log('Metrics result:', {
            leads: metrics.leads,
            spend: metrics.spend,
            impressions: metrics.impressions,
            clicks: metrics.clicks
          });
        }
      }
    } catch (e) {
      console.log('❌ Facebook service error:', e.message);
      console.log('Error details:', e);
    }

  } catch (error) {
    console.log('❌ General error:', error.message);
  }
};

// Run the debug
debugFacebookAPI();
