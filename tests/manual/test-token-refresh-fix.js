import { TokenManager } from './src/services/auth/TokenManager.js';

console.log('Testing token refresh...');

try {
  // Force refresh the Google Ads tokens
  await TokenManager.refreshTokens('googleAds');
  console.log('Token refresh completed successfully!');
  
  // Check the new token
  const newToken = await TokenManager.getAccessToken('googleAds');
  console.log('New token retrieved:', newToken ? 'SUCCESS' : 'FAILED');
  
} catch (error) {
  console.error('Token refresh failed:', error);
}
