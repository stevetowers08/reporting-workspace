// Direct Google Ads API test for venues/locations
// This tests the Google Ads API directly without Supabase

const GOOGLE_ADS_DEVELOPER_TOKEN = process.env.GOOGLE_ADS_DEVELOPER_TOKEN || 'your-developer-token';
const GOOGLE_ADS_ACCESS_TOKEN = process.env.GOOGLE_ADS_ACCESS_TOKEN || 'your-access-token';

async function testGoogleAdsDirect() {
  try {
    console.log('🔍 Testing Google Ads API directly for venues/locations...');
    console.log('Developer Token:', GOOGLE_ADS_DEVELOPER_TOKEN ? 'Present' : 'Missing');
    console.log('Access Token:', GOOGLE_ADS_ACCESS_TOKEN ? 'Present' : 'Missing');
    
    if (!GOOGLE_ADS_DEVELOPER_TOKEN || !GOOGLE_ADS_ACCESS_TOKEN) {
      console.log('❌ Missing Google Ads credentials');
      console.log('Please set GOOGLE_ADS_DEVELOPER_TOKEN and GOOGLE_ADS_ACCESS_TOKEN environment variables');
      return;
    }
    
    // Test 1: Get accessible customers (these are like venues/locations)
    console.log('\n🔍 Testing: Get accessible customers (venues/locations)');
    const customersResponse = await fetch('https://googleads.googleapis.com/v20/customers:listAccessibleCustomers', {
      headers: {
        'Authorization': `Bearer ${GOOGLE_ADS_ACCESS_TOKEN}`,
        'developer-token': GOOGLE_ADS_DEVELOPER_TOKEN,
        'Content-Type': 'application/json'
      }
    });
    
    if (!customersResponse.ok) {
      const errorText = await customersResponse.text();
      console.log(`❌ Error getting customers: ${customersResponse.status} - ${errorText}`);
      return;
    }
    
    const customersData = await customersResponse.json();
    const customers = customersData.resourceNames || [];
    
    console.log(`✅ Successfully retrieved ${customers.length} accessible customers:`);
    
    // Test 2: Get details for each customer (venue/location)
    for (let i = 0; i < Math.min(customers.length, 3); i++) {
      const customerResourceName = customers[i];
      const customerId = customerResourceName.split('/').pop();
      
      console.log(`\n🔍 Testing: Get customer details for ${customerId}`);
      
      try {
        const customerResponse = await fetch(`https://googleads.googleapis.com/v20/customers/${customerId}`, {
          headers: {
            'Authorization': `Bearer ${GOOGLE_ADS_ACCESS_TOKEN}`,
            'developer-token': GOOGLE_ADS_DEVELOPER_TOKEN,
            'Content-Type': 'application/json'
          }
        });
        
        if (customerResponse.ok) {
          const customerData = await customerResponse.json();
          console.log(`✅ Customer ${i + 1}: ${customerData.descriptiveName || `Customer ${customerId}`}`);
          console.log(`   ID: ${customerId}`);
          console.log(`   Currency: ${customerData.currencyCode || 'USD'}`);
          console.log(`   Timezone: ${customerData.timeZone || 'UTC'}`);
          console.log(`   Status: ${customerData.status || 'Unknown'}`);
        } else {
          const errorText = await customerResponse.text();
          console.log(`❌ Error getting customer ${customerId}: ${customerResponse.status} - ${errorText}`);
        }
      } catch (error) {
        console.log(`❌ Error getting customer ${customerId}:`, error.message);
      }
    }
    
    // Test 3: Get campaigns for the first customer (if any)
    if (customers.length > 0) {
      const firstCustomerId = customers[0].split('/').pop();
      console.log(`\n🔍 Testing: Get campaigns for customer ${firstCustomerId}`);
      
      const query = `
        SELECT 
          campaign.id,
          campaign.name,
          campaign.status,
          campaign.advertising_channel_type
        FROM campaign 
        LIMIT 5
      `;
      
      try {
        const campaignsResponse = await fetch(`https://googleads.googleapis.com/v20/customers/${firstCustomerId}/googleAds:search`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GOOGLE_ADS_ACCESS_TOKEN}`,
            'developer-token': GOOGLE_ADS_DEVELOPER_TOKEN,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ query })
        });
        
        if (campaignsResponse.ok) {
          const campaignsData = await campaignsResponse.json();
          const campaigns = campaignsData.results || [];
          console.log(`✅ Successfully retrieved ${campaigns.length} campaigns:`);
          
          campaigns.forEach((result, index) => {
            const campaign = result.campaign;
            console.log(`\n  Campaign ${index + 1}: ${campaign.name}`);
            console.log(`    ID: ${campaign.id}`);
            console.log(`    Status: ${campaign.status}`);
            console.log(`    Type: ${campaign.advertisingChannelType}`);
          });
        } else {
          const errorText = await campaignsResponse.text();
          console.log(`❌ Error getting campaigns: ${campaignsResponse.status} - ${errorText}`);
        }
      } catch (error) {
        console.log(`❌ Error getting campaigns:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing Google Ads API:', error.message);
    console.error('Stack:', error.stack);
  }
}

testGoogleAdsDirect();
