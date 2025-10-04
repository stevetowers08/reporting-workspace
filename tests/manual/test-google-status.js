// Test Google OAuth status and account fetching
console.log('=== GOOGLE ADS OAUTH STATUS TEST ===');

// Check if Google OAuth is connected
const { OAuthService } = await import('@/services/auth/oauthService');

console.log('Checking Google OAuth status...');
const hasTokens = OAuthService.getStoredTokens('google') !== null;
const isValid = OAuthService.isTokenValid('google');

console.log('Google OAuth Status:', {
  hasTokens,
  isValid,
  tokens: OAuthService.getStoredTokens('google')
});

// Test Google Ads Service
const { GoogleAdsService } = await import('@/services/api/googleAdsService');

console.log('Testing Google Ads Service...');
try {
  const accounts = await GoogleAdsService.getAdAccounts();
  console.log('✅ Google Ads accounts fetched successfully:', accounts);
} catch (error) {
  console.error('❌ Google Ads Service error:', error);
  console.error('Error details:', {
    message: error.message,
    stack: error.stack
  });
}

// Check environment variables
console.log('Environment variables:', {
  developerToken: import.meta.env.VITE_GOOGLE_ADS_DEVELOPER_TOKEN ? 'Set' : 'Not set',
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID ? 'Set' : 'Not set',
  clientSecret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET ? 'Set' : 'Not set'
});
