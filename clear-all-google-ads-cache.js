/**
 * Comprehensive Google Ads Cache Clear
 * This script clears all possible caches and forces a fresh connection check
 */

console.log('🧹 Starting comprehensive Google Ads cache clear...');

// 1. Clear localStorage
const googleAdsKeys = [
  'oauth_code_verifier_google',
  'googleAdsConfigs',
  'google_ads_auth',
  'user_google_ads_auth',
  'googleAdsConnection',
  'googleAdsTokens'
];

googleAdsKeys.forEach(key => {
  localStorage.removeItem(key);
  console.log(`✅ Cleared localStorage key: ${key}`);
});

// 2. Clear sessionStorage
sessionStorage.clear();
console.log('✅ Cleared sessionStorage');

// 3. Clear browser caches
if ('caches' in window) {
  caches.keys().then(names => {
    names.forEach(name => {
      if (name.includes('google') || name.includes('ads') || name.includes('supabase')) {
        caches.delete(name);
        console.log(`✅ Cleared cache: ${name}`);
      }
    });
  });
}

// 4. Clear React Query cache (if available)
if (window.queryClient) {
  window.queryClient.clear();
  console.log('✅ Cleared React Query cache');
}

// 5. Clear any Google Ads related cookies
document.cookie.split(";").forEach(cookie => {
  const eqPos = cookie.indexOf("=");
  const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
  if (name.includes('google') || name.includes('ads')) {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    console.log(`✅ Cleared cookie: ${name}`);
  }
});

// 6. Force page reload to clear any remaining state
console.log('🔄 Reloading page to clear all state...');
setTimeout(() => {
  window.location.reload();
}, 1000);
