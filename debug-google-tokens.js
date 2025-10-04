// Quick localStorage check for Google OAuth tokens
console.log('=== GOOGLE OAUTH TOKEN DEBUG ===');

// Check all localStorage keys
const allKeys = Object.keys(localStorage);
console.log('All localStorage keys:', allKeys);

// Check specifically for Google tokens
const googleTokens = localStorage.getItem('oauth_tokens_google');
console.log('Google OAuth tokens raw:', googleTokens);

if (googleTokens) {
  try {
    const parsed = JSON.parse(googleTokens);
    console.log('Parsed Google tokens:', {
      hasAccessToken: !!parsed.accessToken,
      tokenLength: parsed.accessToken?.length,
      tokenType: parsed.tokenType,
      expiresIn: parsed.expiresIn,
      timestamp: parsed.timestamp,
      scope: parsed.scope
    });
    
    // Check if token is expired
    if (parsed.expiresIn) {
      const expiresAt = parsed.expiresIn * 1000;
      const now = Date.now();
      const isExpired = now >= expiresAt;
      console.log('Token expiration check:', {
        expiresAt: new Date(expiresAt).toISOString(),
        now: new Date(now).toISOString(),
        isExpired,
        timeUntilExpiry: expiresAt - now
      });
    }
  } catch (error) {
    console.error('Error parsing Google tokens:', error);
  }
} else {
  console.log('❌ No Google OAuth tokens found in localStorage');
}

// Test OAuthService methods
import { OAuthService } from '@/services/auth/oauthService';

const hasTokens = OAuthService.getStoredTokens('google') !== null;
const isValid = OAuthService.isTokenValid('google');

console.log('OAuthService status:', {
  hasTokens,
  isValid,
  tokens: OAuthService.getStoredTokens('google')
});
