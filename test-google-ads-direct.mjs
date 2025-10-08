import { config } from 'dotenv';
config({ path: '.env.local.new' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const GOOGLE_ADS_DEVELOPER_TOKEN = process.env.VITE_GOOGLE_ADS_DEVELOPER_TOKEN;

console.log('🔍 Testing Google Ads Direct API Call');
console.log('=====================================');

async function testGoogleAdsDirectAPI() {
  try {
    // Get tokens from database
    const dbResponse = await fetch(`${SUPABASE_URL}/rest/v1/integrations?select=config&platform=eq.googleAds&connected=eq.true`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      }
    });

    const integrations = await dbResponse.json();
    const tokens = integrations[0]?.config?.tokens;
    
    if (!tokens) {
      console.log('❌ No tokens found in database');
      return;
    }

    const accessToken = tokens.accessToken || tokens.access_token;
    console.log('Using Access Token:', accessToken?.substring(0, 30) + '...');
    console.log('Using Developer Token:', GOOGLE_ADS_DEVELOPER_TOKEN);
    
    // Test the exact same API call that the frontend service makes
    const response = await fetch('https://googleads.googleapis.com/v20/customers:listAccessibleCustomers', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': GOOGLE_ADS_DEVELOPER_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    console.log('Direct API Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Direct API SUCCESS! Found customers:', data.resourceNames?.length || 0);
      
      // Test getting customer details (like the frontend service does)
      if (data.resourceNames && data.resourceNames.length > 0) {
        const firstCustomer = data.resourceNames[0];
        const customerId = firstCustomer.split('/').pop();
        
        console.log(`\n🔍 Testing customer details for: ${customerId}`);
        
        const customerResponse = await fetch(`https://googleads.googleapis.com/v20/customers/${customerId}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'developer-token': GOOGLE_ADS_DEVELOPER_TOKEN,
            'Content-Type': 'application/json'
          }
        });

        if (customerResponse.ok) {
          const customerData = await customerResponse.json();
          console.log('✅ Customer details SUCCESS!');
          console.log('Customer Name:', customerData.descriptiveName);
          console.log('Currency:', customerData.currencyCode);
          console.log('Timezone:', customerData.timeZone);
        } else {
          const errorText = await customerResponse.text();
          console.log('❌ Customer details Error:', errorText);
        }
      }
    } else {
      const errorText = await response.text();
      console.log('❌ Direct API Error:', errorText);
    }
  } catch (error) {
    console.log('❌ Network Error:', error.message);
  }
}

testGoogleAdsDirectAPI();
