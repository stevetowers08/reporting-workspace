// Quick test to check Google OAuth tokens
console.log('=== GOOGLE OAUTH TOKEN CHECK ===');

// Check localStorage for Google tokens
const googleTokens = localStorage.getItem('oauth_tokens_google');
console.log('Google OAuth tokens in localStorage:', googleTokens);

if (googleTokens) {
  try {
    const parsed = JSON.parse(googleTokens);
    console.log('Parsed Google tokens:', {
      hasAccessToken: !!parsed.accessToken,
      tokenLength: parsed.accessToken?.length,
      expiresIn: parsed.expiresIn,
      tokenType: parsed.tokenType
    });
  } catch (error) {
    console.error('Error parsing Google tokens:', error);
  }
} else {
  console.log('No Google OAuth tokens found in localStorage');
}

// Check all localStorage keys
console.log('All localStorage keys:', Object.keys(localStorage));

// Test Google Ads Service
import { GoogleAdsService } from '@/services/api/googleAdsService';

try {
  console.log('Testing Google Ads Service...');
  const accounts = await GoogleAdsService.getAdAccounts();
  console.log('Google Ads accounts:', accounts);
} catch (error) {
  console.error('Google Ads Service error:', error);
}
