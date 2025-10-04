// Simple test to fetch Google Sheets data using the API
const spreadsheetId = '1V0C4jLBvUfrnBK8wMQaAQ_Ly2C6681e0JyNcmzrUKn4';
const sheetName = 'Wedding Leads';

async function fetchGoogleSheetsData() {
  try {
    console.log('🔍 Fetching Google Sheets data...');
    console.log(`📊 Spreadsheet ID: ${spreadsheetId}`);
    console.log(`📋 Sheet Name: ${sheetName}`);
    
    // First, let's check if we can access the spreadsheet metadata
    const metadataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
    
    console.log('\n📡 Making API call to Google Sheets...');
    console.log(`URL: ${metadataUrl}`);
    
    // Note: This will fail without proper authentication, but we can see the structure
    const response = await fetch(metadataUrl);
    
    if (!response.ok) {
      console.log(`❌ API call failed with status: ${response.status}`);
      console.log(`Response: ${await response.text()}`);
      return;
    }
    
    const data = await response.json();
    console.log('\n✅ Successfully fetched spreadsheet metadata:');
    console.log(JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 This is expected without proper OAuth authentication.');
    console.log('We need to use the app\'s authentication system to access the data.');
  }
}

fetchGoogleSheetsData();
