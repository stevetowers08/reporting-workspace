import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load environment variables from .env file
const envContent = readFileSync('.env', 'utf8');
const envLines = envContent.split('\n');
envLines.forEach(line => {
  if (line.trim() && !line.startsWith('#')) {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  }
});

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testGHLAPI() {
  console.log('🔍 Testing GoHighLevel API endpoints directly...\n');

  try {
    // Get Wormwood client data
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', '2775ae60-b5d6-4714-add4-d6fa30292822')
      .single();

    if (clientError) {
      console.error('❌ Error fetching client:', clientError);
      return;
    }

    console.log('✅ Client data:', {
      name: client.name,
      accounts: client.accounts
    });

    // Get GHL integration data
    const { data: ghlIntegration, error: ghlError } = await supabase
      .from('integrations')
      .select('*')
      .eq('platform', 'goHighLevel')
      .eq('account_id', 'glgXnEKLMggg0CFhBRN8')
      .single();

    if (ghlError) {
      console.error('❌ Error fetching GHL integration:', ghlError);
      return;
    }

    console.log('✅ GHL Integration data:', {
      platform: ghlIntegration.platform,
      account_id: ghlIntegration.account_id,
      connected: ghlIntegration.connected,
      config: ghlIntegration.config
    });

    // Test GHL API calls directly
    const accessToken = ghlIntegration.config?.tokens?.accessToken;
    if (!accessToken) {
      console.error('❌ No access token found');
      return;
    }

    console.log('🔍 Testing GHL API calls...\n');

    // Test 1: Get contacts count
    console.log('📊 Test 1: Contacts Count');
    try {
      const contactsResponse = await fetch('https://services.leadconnectorhq.com/contacts/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28'
        },
        body: JSON.stringify({
          locationId: 'glgXnEKLMggg0CFhBRN8',
          pageLimit: 1,
          query: ''
        })
      });

      if (contactsResponse.ok) {
        const contactsData = await contactsResponse.json();
        console.log('✅ Contacts API Response:', {
          total: contactsData.total,
          contacts: contactsData.contacts?.length || 0,
          firstContact: contactsData.contacts?.[0] ? {
            id: contactsData.contacts[0].id,
            firstName: contactsData.contacts[0].firstName,
            lastName: contactsData.contacts[0].lastName,
            email: contactsData.contacts[0].email,
            dateAdded: contactsData.contacts[0].dateAdded
          } : null
        });
      } else {
        console.error('❌ Contacts API Error:', contactsResponse.status, await contactsResponse.text());
      }
    } catch (error) {
      console.error('❌ Contacts API Error:', error.message);
    }

    // Test 2: Get opportunities
    console.log('\n📊 Test 2: Opportunities');
    try {
      const opportunitiesResponse = await fetch('https://services.leadconnectorhq.com/opportunities/', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28'
        }
      });

      if (opportunitiesResponse.ok) {
        const opportunitiesData = await opportunitiesResponse.json();
        console.log('✅ Opportunities API Response:', {
          total: opportunitiesData.total || opportunitiesData.opportunities?.length || 0,
          opportunities: opportunitiesData.opportunities?.slice(0, 3).map(opp => ({
            id: opp.id,
            name: opp.name,
            status: opp.status,
            value: opp.value,
            dateAdded: opp.dateAdded
          })) || []
        });
      } else {
        console.error('❌ Opportunities API Error:', opportunitiesResponse.status, await opportunitiesResponse.text());
      }
    } catch (error) {
      console.error('❌ Opportunities API Error:', error.message);
    }

    // Test 3: Get campaigns
    console.log('\n📊 Test 3: Campaigns');
    try {
      const campaignsResponse = await fetch('https://services.leadconnectorhq.com/campaigns/', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28'
        }
      });

      if (campaignsResponse.ok) {
        const campaignsData = await campaignsResponse.json();
        console.log('✅ Campaigns API Response:', {
          total: campaignsData.total || campaignsData.campaigns?.length || 0,
          campaigns: campaignsData.campaigns?.slice(0, 3).map(campaign => ({
            id: campaign.id,
            name: campaign.name,
            status: campaign.status,
            dateAdded: campaign.dateAdded
          })) || []
        });
      } else {
        console.error('❌ Campaigns API Error:', campaignsResponse.status, await campaignsResponse.text());
      }
    } catch (error) {
      console.error('❌ Campaigns API Error:', error.message);
    }

    // Test 4: Get location info
    console.log('\n📊 Test 4: Location Info');
    try {
      const locationResponse = await fetch('https://services.leadconnectorhq.com/locations/glgXnEKLMggg0CFhBRN8', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28'
        }
      });

      if (locationResponse.ok) {
        const locationData = await locationResponse.json();
        console.log('✅ Location API Response:', {
          id: locationData.id,
          name: locationData.name,
          address: locationData.address,
          phone: locationData.phone,
          email: locationData.email
        });
      } else {
        console.error('❌ Location API Error:', locationResponse.status, await locationResponse.text());
      }
    } catch (error) {
      console.error('❌ Location API Error:', error.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testGHLAPI();
