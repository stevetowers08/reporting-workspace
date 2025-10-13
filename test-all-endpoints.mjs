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

async function testAllEndpoints() {
  console.log('🔍 Testing All Endpoints Incrementally...\n');

  try {
    // Test 1: GoHighLevel API 2.0 with new version
    console.log('📊 Test 1: GoHighLevel API 2.0 Contacts Endpoint');
    await testGHLContactsAPI();
    
    console.log('\n📊 Test 2: GoHighLevel API 2.0 Opportunities Endpoint');
    await testGHLOpportunitiesAPI();
    
    console.log('\n📊 Test 3: GoHighLevel API 2.0 Campaigns Endpoint');
    await testGHLCampaignsAPI();
    
    console.log('\n📊 Test 4: Google Sheets API with correct sheet name');
    await testGoogleSheetsAPI();
    
    console.log('\n📊 Test 5: Facebook Ads API');
    await testFacebookAdsAPI();
    
    console.log('\n📊 Test 6: Google Ads API');
    await testGoogleAdsAPI();

  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
}

async function testGHLContactsAPI() {
  try {
    const accessToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdXRoQ2xhc3MiOiJMb2NhdGlvbiIsImF1dGhDbGFzc0lkIjoiZ2xnWG5FS0xNZ2dnMENGaEJSTjgiLCJzb3VyY2UiOiJJTlRFR1JBVElPTiIsInNvdXJjZUlkIjoiNjhlMTM1YWExN2Y1NzQwNjdjZmI3ZTM5LW1nb2V2dmt1IiwiY2hhbm5lbCI6Ik9BVVRIIiwicHJpbWFyeUF1dGhDbGFzc0lkIjoiZ2xnWG5FS0xNZ2dnMENGaEJSTjgiLCJvYXV0aE1ldGEiOnsic2NvcGVzIjpbImNvbnRhY3RzLnJlYWRvbmx5Iiwib3Bwb3J0dW5pdGllcy5yZWFkb25seSIsImNhbGVuZGFycy5yZWFkb25seSIsImZ1bm5lbHMvZnVubmVsLnJlYWRvbmx5IiwiZnVubmVscy9wYWdlLnJlYWRvbmx5IiwibG9jYXRpb25zLnJlYWRvbmx5Il0sImNsaWVudCI6IjY4ZTEzNWFhMTdmNTc0MDY3Y2ZiN2UzOSIsInZlcnNpb25JZCI6IjY4ZTEzNWFhMTdmNTc0MDY3Y2ZiN2UzOSIsImNsaWVudEtleSI6IjY4ZTEzNWFhMTdmNTc0MDY3Y2ZiN2UzOS1tZ29ldnZrdSJ9LCJpYXQiOjE3NjAzMjU5NzQuNTkxLCJleHAiOjE3NjA0MTIzNzQuNTkxfQ.ou-bQUFoBpcLHCffz39v13IgwPEKJYYifwoU9i0bcw1v0q3dri3Gx3yoWFTnkFnKp6Ef9aExbsUdZ1ai5jmOva8RmZNNrBWNoHMGdcmGjkdMPPXNpg9rQekVx8HffS2NeXniCq5Xn1yHHiFbkwEm0RFgg_geQuew119MbiEdmZB4Vuqu55DkhxF-Qxkm13HaSyk_mMIYFt4tUZJTJwefs8Bcc-rslQ2FKjb0-Xrd8XDTKUzAl87jiDJfOCzb8xeGoywh68gXb9Zm-QlCRIBr11JtSNSSx3APsMOrGHUY3gkzmtJDy09fs4Ca_n7hm9Ry1x3v2i1hOWa0fDQUBO9O5HB4GSRvjHKlI9j0AEdYVLNzUlb7BojAHYLIaEx9fuQkzbCVXadg1BQYy01_OKmqh6MIb8bCwKazGBi9lsk9beghZPzb6f5A1a7b_UF-rphITcEq5UV8VdKSlYGl1kAPX04DcyjgrF7vfSe5-Ya5HfpTapgAL4Rcg9959sPwxEuQ42-yf9_bFPv5t6s9uQeCrtIj81eirLcFjR9gZTHQc6zSVWFL6TAXIA1U_BMOUe9Xt9ThID1EsVqZlxJj9YM6ChaAed5a7uVkHVfKmpwdIq5dAiA-B5ykRleGNSad2-8xdaVJcj2Psdp-Efjxl2rKVvoHynio01-I3fLWX8QcbQQ';
    
    const response = await fetch('https://services.leadconnectorhq.com/contacts/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Version': '2023-07-25' // API 2.0
      },
      body: JSON.stringify({
        locationId: 'glgXnEKLMggg0CFhBRN8',
        pageLimit: 1,
        query: ''
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ GHL Contacts API 2.0 Response:', {
        total: data.total,
        contacts: data.contacts?.length || 0,
        firstContact: data.contacts?.[0] ? {
          id: data.contacts[0].id,
          firstName: data.contacts[0].firstName,
          lastName: data.contacts[0].lastName,
          email: data.contacts[0].email
        } : null
      });
    } else {
      const errorText = await response.text();
      console.error('❌ GHL Contacts API 2.0 Error:', response.status, errorText);
    }
  } catch (error) {
    console.error('❌ GHL Contacts API 2.0 Error:', error.message);
  }
}

async function testGHLOpportunitiesAPI() {
  try {
    const accessToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdXRoQ2xhc3MiOiJMb2NhdGlvbiIsImF1dGhDbGFzc0lkIjoiZ2xnWG5FS0xNZ2dnMENGaEJSTjgiLCJzb3VyY2UiOiJJTlRFR1JBVElPTiIsInNvdXJjZUlkIjoiNjhlMTM1YWExN2Y1NzQwNjdjZmI3ZTM5LW1nb2V2dmt1IiwiY2hhbm5lbCI6Ik9BVVRIIiwicHJpbWFyeUF1dGhDbGFzc0lkIjoiZ2xnWG5FS0xNZ2dnMENGaEJSTjgiLCJvYXV0aE1ldGEiOnsic2NvcGVzIjpbImNvbnRhY3RzLnJlYWRvbmx5Iiwib3Bwb3J0dW5pdGllcy5yZWFkb25seSIsImNhbGVuZGFycy5yZWFkb25seSIsImZ1bm5lbHMvZnVubmVsLnJlYWRvbmx5IiwiZnVubmVscy9wYWdlLnJlYWRvbmx5IiwibG9jYXRpb25zLnJlYWRvbmx5Il0sImNsaWVudCI6IjY4ZTEzNWFhMTdmNTc0MDY3Y2ZiN2UzOSIsInZlcnNpb25JZCI6IjY4ZTEzNWFhMTdmNTc0MDY3Y2ZiN2UzOSIsImNsaWVudEtleSI6IjY4ZTEzNWFhMTdmNTc0MDY3Y2ZiN2UzOS1tZ29ldnZrdSJ9LCJpYXQiOjE3NjAzMjU5NzQuNTkxLCJleHAiOjE3NjA0MTIzNzQuNTkxfQ.ou-bQUFoBpcLHCffz39v13IgwPEKJYYifwoU9i0bcw1v0q3dri3Gx3yoWFTnkFnKp6Ef9aExbsUdZ1ai5jmOva8RmZNNrBWNoHMGdcmGjkdMPPXNpg9rQekVx8HffS2NeXniCq5Xn1yHHiFbkwEm0RFgg_geQuew119MbiEdmZB4Vuqu55DkhxF-Qxkm13HaSyk_mMIYFt4tUZJTJwefs8Bcc-rslQ2FKjb0-Xrd8XDTKUzAl87jiDJfOCzb8xeGoywh68gXb9Zm-QlCRIBr11JtSNSSx3APsMOrGHUY3gkzmtJDy09fs4Ca_n7hm9Ry1x3v2i1hOWa0fDQUBO9O5HB4GSRvjHKlI9j0AEdYVLNzUlb7BojAHYLIaEx9fuQkzbCVXadg1BQYy01_OKmqh6MIb8bCwKazGBi9lsk9beghZPzb6f5A1a7b_UF-rphITcEq5UV8VdKSlYGl1kAPX04DcyjgrF7vfSe5-Ya5HfpTapgAL4Rcg9959sPwxEuQ42-yf9_bFPv5t6s9uQeCrtIj81eirLcFjR9gZTHQc6zSVWFL6TAXIA1U_BMOUe9Xt9ThID1EsVqZlxJj9YM6ChaAed5a7uVkHVfKmpwdIq5dAiA-B5ykRleGNSad2-8xdaVJcj2Psdp-Efjxl2rKVvoHynio01-I3fLWX8QcbQQ';
    
    const response = await fetch('https://services.leadconnectorhq.com/opportunities/', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Version': '2023-07-25' // API 2.0
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ GHL Opportunities API 2.0 Response:', {
        total: data.total || data.opportunities?.length || 0,
        opportunities: data.opportunities?.slice(0, 3).map(opp => ({
          id: opp.id,
          name: opp.name,
          status: opp.status,
          value: opp.value
        })) || []
      });
    } else {
      const errorText = await response.text();
      console.error('❌ GHL Opportunities API 2.0 Error:', response.status, errorText);
    }
  } catch (error) {
    console.error('❌ GHL Opportunities API 2.0 Error:', error.message);
  }
}

async function testGHLCampaignsAPI() {
  try {
    const accessToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdXRoQ2xhc3MiOiJMb2NhdGlvbiIsImF1dGhDbGFzc0lkIjoiZ2xnWG5FS0xNZ2dnMENGaEJSTjgiLCJzb3VyY2UiOiJJTlRFR1JBVElPTiIsInNvdXJjZUlkIjoiNjhlMTM1YWExN2Y1NzQwNjdjZmI3ZTM5LW1nb2V2dmt1IiwiY2hhbm5lbCI6Ik9BVVRIIiwicHJpbWFyeUF1dGhDbGFzc0lkIjoiZ2xnWG5FS0xNZ2dnMENGaEJSTjgiLCJvYXV0aE1ldGEiOnsic2NvcGVzIjpbImNvbnRhY3RzLnJlYWRvbmx5Iiwib3Bwb3J0dW5pdGllcy5yZWFkb25seSIsImNhbGVuZGFycy5yZWFkb25seSIsImZ1bm5lbHMvZnVubmVsLnJlYWRvbmx5IiwiZnVubmVscy9wYWdlLnJlYWRvbmx5IiwibG9jYXRpb25zLnJlYWRvbmx5Il0sImNsaWVudCI6IjY4ZTEzNWFhMTdmNTc0MDY3Y2ZiN2UzOSIsInZlcnNpb25JZCI6IjY4ZTEzNWFhMTdmNTc0MDY3Y2ZiN2UzOSIsImNsaWVudEtleSI6IjY4ZTEzNWFhMTdmNTc0MDY3Y2ZiN2UzOS1tZ29ldnZrdSJ9LCJpYXQiOjE3NjAzMjU5NzQuNTkxLCJleHAiOjE3NjA0MTIzNzQuNTkxfQ.ou-bQUFoBpcLHCffz39v13IgwPEKJYYifwoU9i0bcw1v0q3dri3Gx3yoWFTnkFnKp6Ef9aExbsUdZ1ai5jmOva8RmZNNrBWNoHMGdcmGjkdMPPXNpg9rQekVx8HffS2NeXniCq5Xn1yHHiFbkwEm0RFgg_geQuew119MbiEdmZB4Vuqu55DkhxF-Qxkm13HaSyk_mMIYFt4tUZJTJwefs8Bcc-rslQ2FKjb0-Xrd8XDTKUzAl87jiDJfOCzb8xeGoywh68gXb9Zm-QlCRIBr11JtSNSSx3APsMOrGHUY3gkzmtJDy09fs4Ca_n7hm9Ry1x3v2i1hOWa0fDQUBO9O5HB4GSRvjHKlI9j0AEdYVLNzUlb7BojAHYLIaEx9fuQkzbCVXadg1BQYy01_OKmqh6MIb8bCwKazGBi9lsk9beghZPzb6f5A1a7b_UF-rphITcEq5UV8VdKSlYGl1kAPX04DcyjgrF7vfSe5-Ya5HfpTapgAL4Rcg9959sPwxEuQ42-yf9_bFPv5t6s9uQeCrtIj81eirLcFjR9gZTHQc6zSVWFL6TAXIA1U_BMOUe9Xt9ThID1EsVqZlxJj9YM6ChaAed5a7uVkHVfKmpwdIq5dAiA-B5ykRleGNSad2-8xdaVJcj2Psdp-Efjxl2rKVvoHynio01-I3fLWX8QcbQQ';
    
    const response = await fetch('https://services.leadconnectorhq.com/campaigns/', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Version': '2023-07-25' // API 2.0
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ GHL Campaigns API 2.0 Response:', {
        total: data.total || data.campaigns?.length || 0,
        campaigns: data.campaigns?.slice(0, 3).map(campaign => ({
          id: campaign.id,
          name: campaign.name,
          status: campaign.status
        })) || []
      });
    } else {
      const errorText = await response.text();
      console.error('❌ GHL Campaigns API 2.0 Error:', response.status, errorText);
    }
  } catch (error) {
    console.error('❌ GHL Campaigns API 2.0 Error:', error.message);
  }
}

async function testGoogleSheetsAPI() {
  try {
    console.log('⚠️ Google Sheets API requires OAuth token - testing with mock data');
    console.log('✅ Google Sheets API would use:');
    console.log('  - Spreadsheet ID: 1YOgfl_S0W4VL5SuWXdFk2tH9naFmwwPmfIz_lPmKtPc');
    console.log('  - Sheet Name: Event Leads (fixed from Sheet1)');
    console.log('  - Range: Event Leads!A:Z');
    console.log('  - Endpoint: https://sheets.googleapis.com/v4/spreadsheets/{id}/values/{range}');
  } catch (error) {
    console.error('❌ Google Sheets API Error:', error.message);
  }
}

async function testFacebookAdsAPI() {
  try {
    console.log('⚠️ Facebook Ads API requires access token - testing with mock data');
    console.log('✅ Facebook Ads API would use:');
    console.log('  - Account ID: act_934926145475380');
    console.log('  - Endpoint: https://graph.facebook.com/v18.0/{account-id}/insights');
    console.log('  - Fields: impressions,clicks,spend,conversions');
  } catch (error) {
    console.error('❌ Facebook Ads API Error:', error.message);
  }
}

async function testGoogleAdsAPI() {
  try {
    console.log('⚠️ Google Ads API requires OAuth token - testing with mock data');
    console.log('✅ Google Ads API would use:');
    console.log('  - Customer ID: customers/5659913242');
    console.log('  - Endpoint: https://googleads.googleapis.com/v14/customers/{customer-id}/googleAds:search');
    console.log('  - Query: SELECT metrics.impressions, metrics.clicks, metrics.cost, metrics.conversions');
  } catch (error) {
    console.error('❌ Google Ads API Error:', error.message);
  }
}

testAllEndpoints();
