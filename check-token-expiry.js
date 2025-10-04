// Check if Google Ads token is expired
const { DatabaseService } = await import('@/services/data/databaseService');
const integrations = await DatabaseService.getIntegrations();
const googleIntegration = integrations.find(i => i.platform === 'googleAds' && i.connected);

if (googleIntegration?.config?.tokens) {
  const tokens = googleIntegration.config.tokens;
  console.log('Google Ads token info:', {
    hasAccessToken: !!tokens.accessToken,
    tokenLength: tokens.accessToken?.length,
    expiresIn: tokens.expiresIn,
    tokenType: tokens.tokenType,
    scope: tokens.scope
  });
  
  // Check if token is expired
  if (tokens.expiresIn) {
    const now = Date.now();
    const expiresAt = tokens.expiresIn * 1000; // Convert to milliseconds
    const isExpired = now >= expiresAt;
    const timeUntilExpiry = expiresAt - now;
    
    console.log('Token expiration check:', {
      now: new Date(now).toISOString(),
      expiresAt: new Date(expiresAt).toISOString(),
      isExpired,
      timeUntilExpiry: Math.round(timeUntilExpiry / 1000) + ' seconds'
    });
    
    if (isExpired) {
      console.log('❌ TOKEN IS EXPIRED! Need to refresh or reconnect.');
    } else {
      console.log('✅ Token is still valid');
    }
  }
} else {
  console.log('❌ No Google Ads tokens found');
}
