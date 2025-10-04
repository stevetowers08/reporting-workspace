// Simple localStorage check
console.log('=== CURRENT LOCALSTORAGE STATUS ===');
console.log('All keys:', Object.keys(localStorage));
console.log('Google tokens:', localStorage.getItem('oauth_tokens_google'));
console.log('Facebook tokens:', localStorage.getItem('oauth_tokens_facebook'));
