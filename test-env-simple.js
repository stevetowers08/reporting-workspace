/**
 * Simple Google Ads Environment Test
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

console.log('🔍 Google Ads Environment Test');
console.log('==============================');

// Test environment variables
const clientId = process.env.VITE_GOOGLE_CLIENT_ID;
const clientSecret = process.env.VITE_GOOGLE_CLIENT_SECRET;
const developerToken = process.env.VITE_GOOGLE_ADS_DEVELOPER_TOKEN;

console.log('\nEnvironment Variables:');
console.log(`✅ VITE_GOOGLE_CLIENT_ID: ${clientId ? 'SET' : 'NOT SET'}`);
console.log(`✅ VITE_GOOGLE_CLIENT_SECRET: ${clientSecret ? 'SET' : 'NOT SET'}`);
console.log(`✅ VITE_GOOGLE_ADS_DEVELOPER_TOKEN: ${developerToken ? 'SET' : 'NOT SET'}`);

if (clientId && clientSecret && developerToken) {
  console.log('\n✅ All required environment variables are set!');
  console.log('\nNext steps:');
  console.log('1. Restart your development server (npm run dev)');
  console.log('2. Try connecting to Google Ads in the UI');
  console.log('3. Check browser console for any OAuth errors');
} else {
  console.log('\n❌ Missing environment variables. Please check .env.local file.');
}

console.log('\n==============================');
