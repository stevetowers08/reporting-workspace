import { config } from 'dotenv';
config({ path: '.env.local.new' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

console.log('🔍 Testing Fixed Google Ads Edge Function');
console.log('==========================================');

try {
  const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/google-ads-api/accounts`;
  console.log('Edge Function URL:', edgeFunctionUrl);
  
  const response = await fetch(edgeFunctionUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    }
  });

  console.log('Edge Function Status:', response.status);
  
  if (response.ok) {
    const data = await response.json();
    console.log('✅ Edge Function SUCCESS! Response:', JSON.stringify(data, null, 2));
  } else {
    const errorText = await response.text();
    console.log('❌ Edge Function Error:', errorText);
  }
} catch (error) {
  console.log('❌ Edge Function Network Error:', error.message);
}
