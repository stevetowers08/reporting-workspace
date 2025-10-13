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

async function testGoogleSheetsAPI() {
  console.log('🔍 Testing Google Sheets API directly...\n');

  try {
    // Test the Google Sheets API with the correct configuration
    const spreadsheetId = '1YOgfl_S0W4VL5SuWXdFk2tH9naFmwwPmfIz_lPmKtPc';
    const sheetName = 'Event Leads';
    
    console.log('📊 Testing Google Sheets API with:');
    console.log(`- Spreadsheet ID: ${spreadsheetId}`);
    console.log(`- Sheet Name: ${sheetName}`);
    console.log(`- Range: ${sheetName}!A:Z\n`);

    // Test 1: Try to access the correct sheet name
    console.log('📊 Test 1: Accessing Event Leads sheet');
    try {
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName + '!A:Z')}?key=${process.env.VITE_GOOGLE_API_KEY}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Event Leads Sheet API Response:', {
          range: data.range,
          values: data.values?.length || 0,
          firstRow: data.values?.[0],
          sampleData: data.values?.slice(0, 3)
        });
      } else {
        const errorText = await response.text();
        console.error('❌ Event Leads Sheet API Error:', response.status, errorText);
      }
    } catch (error) {
      console.error('❌ Event Leads Sheet API Error:', error.message);
    }

    // Test 2: Try to access Sheet1 (what the frontend is trying)
    console.log('\n📊 Test 2: Accessing Sheet1 (what frontend is trying)');
    try {
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A:Z?key=${process.env.VITE_GOOGLE_API_KEY}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Sheet1 API Response:', {
          range: data.range,
          values: data.values?.length || 0,
          firstRow: data.values?.[0],
          sampleData: data.values?.slice(0, 3)
        });
      } else {
        const errorText = await response.text();
        console.error('❌ Sheet1 API Error:', response.status, errorText);
      }
    } catch (error) {
      console.error('❌ Sheet1 API Error:', error.message);
    }

    // Test 3: Get spreadsheet metadata to see available sheets
    console.log('\n📊 Test 3: Getting spreadsheet metadata');
    try {
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${process.env.VITE_GOOGLE_API_KEY}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Spreadsheet Metadata:', {
          title: data.properties?.title,
          sheets: data.sheets?.map(sheet => ({
            title: sheet.properties?.title,
            sheetId: sheet.properties?.sheetId,
            gridProperties: sheet.properties?.gridProperties
          }))
        });
      } else {
        const errorText = await response.text();
        console.error('❌ Spreadsheet Metadata Error:', response.status, errorText);
      }
    } catch (error) {
      console.error('❌ Spreadsheet Metadata Error:', error.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testGoogleSheetsAPI();
