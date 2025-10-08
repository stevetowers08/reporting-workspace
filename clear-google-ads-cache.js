/**
 * Clear Google Ads Connection Cache
 * This script clears any cached connection data and forces a fresh check
 */

// Clear localStorage items related to Google Ads
const googleAdsKeys = [
  'oauth_code_verifier_google',
  'googleAdsConfigs',
  'google_ads_auth',
  'user_google_ads_auth'
];

googleAdsKeys.forEach(key => {
  localStorage.removeItem(key);
  console.log(`Cleared localStorage key: ${key}`);
});

// Clear sessionStorage
sessionStorage.clear();
console.log('Cleared sessionStorage');

// Clear any cached data in the browser
if ('caches' in window) {
  caches.keys().then(names => {
    names.forEach(name => {
      if (name.includes('google') || name.includes('ads')) {
        caches.delete(name);
        console.log(`Cleared cache: ${name}`);
      }
    });
  });
}

console.log('✅ Google Ads cache cleared! Please refresh the page.');
