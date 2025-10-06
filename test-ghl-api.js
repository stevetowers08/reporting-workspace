// Test GoHighLevel API directly
const API_KEY = 'pit-bdd2a6a2-734e-4e46-88a3-161683bd4bde';
const COMPANY_ID = 'WgNZ7xm35vYaZwflSov7';
const API_BASE_URL = 'https://services.leadconnectorhq.com';

async function testGoHighLevelAPI() {
  console.log('🔍 Testing GoHighLevel API...');
  console.log('API Key:', API_KEY.substring(0, 10) + '...');
  console.log('Company ID:', COMPANY_ID);
  
  try {
    // Test 1: Get company info
    console.log('\n1. Testing company info endpoint...');
    const companyResponse = await fetch(`${API_BASE_URL}/companies/${COMPANY_ID}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28',
      }
    });
    
    console.log('Company response status:', companyResponse.status);
    if (companyResponse.ok) {
      const companyData = await companyResponse.json();
      console.log('Company data:', companyData);
    } else {
      const errorText = await companyResponse.text();
      console.log('Company error:', errorText);
    }
    
    // Test 2: Get locations/search endpoint
    console.log('\n2. Testing locations/search endpoint...');
    const locationsResponse = await fetch(`${API_BASE_URL}/locations/search?companyId=${COMPANY_ID}&limit=100`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28',
      }
    });
    
    console.log('Locations response status:', locationsResponse.status);
    if (locationsResponse.ok) {
      const locationsData = await locationsResponse.json();
      console.log('Locations data:', locationsData);
      console.log('Number of locations:', locationsData.locations?.length || 0);
    } else {
      const errorText = await locationsResponse.text();
      console.log('Locations error:', errorText);
    }
    
    // Test 3: Try alternative locations endpoint
    console.log('\n3. Testing alternative locations endpoint...');
    const altLocationsResponse = await fetch(`${API_BASE_URL}/locations`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28',
      }
    });
    
    console.log('Alt locations response status:', altLocationsResponse.status);
    if (altLocationsResponse.ok) {
      const altLocationsData = await altLocationsResponse.json();
      console.log('Alt locations data:', altLocationsData);
    } else {
      const errorText = await altLocationsResponse.text();
      console.log('Alt locations error:', errorText);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testGoHighLevelAPI();