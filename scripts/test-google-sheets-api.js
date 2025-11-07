// Script to test Google Sheets API directly
// Uses Node.js built-in fetch (available in Node 18+)

const SPREADSHEET_ID = '1YOgfl_S0W4VL5SuWXdFk2tH9naFmwwPmfIz_lPmKtPc';
const SHEET_NAME = 'Event Leads';

// Get environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ywxqgqfpwvxqjqkqgxro.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

// If no key, prompt user to pass it
if (!SUPABASE_ANON_KEY) {
  console.error('❌ VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY environment variable is required');
  console.error('   Run: VITE_SUPABASE_ANON_KEY=your_key node scripts/test-google-sheets-api.js');
  process.exit(1);
}

async function getAccessToken() {
  try {
    console.log('🔑 Fetching access token from Supabase...');
    const response = await fetch(`${SUPABASE_URL}/rest/v1/integrations?platform=eq.googleSheets&select=*`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch integrations: ${response.status} ${response.statusText}`);
    }

    const integrations = await response.json();
    
    if (integrations.length === 0) {
      throw new Error('No Google Sheets integration found');
    }

    const integration = integrations[0];
    const tokens = integration.config?.tokens || integration.config;
    
    let accessToken = tokens?.accessToken || tokens?.access_token;
    
    console.log(`✅ Got access token: ${accessToken ? accessToken.substring(0, 20) + '...' : 'null'}`);
    return accessToken;
  } catch (error) {
    console.error('❌ Error getting access token:', error.message);
    throw error;
  }
}

async function getSheetData(spreadsheetId, sheetName, accessToken) {
  const range = `${sheetName}!A:Z`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  
  console.log(`\n📊 Fetching data from Google Sheets...`);
  console.log(`   URL: ${url}`);
  console.log(`   Range: ${range}`);
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

function analyzeGuestCounts(values) {
  if (!values || values.length < 2) {
    console.log('⚠️  Not enough data rows');
    return;
  }

  const headers = values[0];
  const rows = values.slice(1);
  
  console.log(`\n📋 Headers (${headers.length} columns):`);
  headers.forEach((header, index) => {
    console.log(`   [${index}]: ${header || '(empty)'}`);
  });
  
  // Find guest count column
  const guestCountIndex = headers.findIndex(h => h && h.toLowerCase().includes('guest'));
  console.log(`\n🔍 Guest count column index: ${guestCountIndex >= 0 ? guestCountIndex : 'NOT FOUND'}`);
  
  // Find date column
  const dateIndex = headers.findIndex(h => h && h.toLowerCase().includes('date'));
  console.log(`🔍 Date column index: ${dateIndex >= 0 ? dateIndex : 'NOT FOUND'}`);
  
  // Analyze guest counts
  const guestRanges = {
    '1-50 guests': 0,
    '51-100 guests': 0,
    '101-200 guests': 0,
    '201-300 guests': 0,
    '300+ guests': 0
  };
  
  const guestValues = [];
  
  rows.forEach((row, index) => {
    const guestCountRaw = guestCountIndex >= 0 ? row[guestCountIndex] : row[5] || '0';
    const guestCount = parseInt(guestCountRaw);
    
    if (!isNaN(guestCount) && guestCount > 0) {
      guestValues.push(guestCount);
      
      if (guestCount <= 50) {
        guestRanges['1-50 guests']++;
      } else if (guestCount <= 100) {
        guestRanges['51-100 guests']++;
      } else if (guestCount <= 200) {
        guestRanges['101-200 guests']++;
      } else if (guestCount <= 300) {
        guestRanges['201-300 guests']++;
      } else {
        guestRanges['300+ guests']++;
      }
    }
  });
  
  console.log(`\n📊 Guest Count Analysis:`);
  console.log(`   Total rows: ${rows.length}`);
  console.log(`   Valid guest counts: ${guestValues.length}`);
  if (guestValues.length > 0) {
    console.log(`   Min: ${Math.min(...guestValues)}`);
    console.log(`   Max: ${Math.max(...guestValues)}`);
    console.log(`   Average: ${(guestValues.reduce((a, b) => a + b, 0) / guestValues.length).toFixed(2)}`);
  }
  
  console.log(`\n📊 Guest Range Distribution:`);
  Object.entries(guestRanges).forEach(([range, count]) => {
    console.log(`   ${range}: ${count} leads (${count > 0 ? ((count / rows.length) * 100).toFixed(1) : 0}%)`);
  });
  
  // Show sample data
  console.log(`\n📋 Sample rows (first 5):`);
  rows.slice(0, 5).forEach((row, index) => {
    const guestCount = guestCountIndex >= 0 ? row[guestCountIndex] : row[5];
    const date = dateIndex >= 0 ? row[dateIndex] : row[6];
    console.log(`   Row ${index + 1}: Guest=${guestCount || '(empty)'}, Date=${date || '(empty)'}`);
  });
  
  return guestRanges;
}

async function main() {
  try {
    console.log('🚀 Testing Google Sheets API\n');
    console.log(`Spreadsheet ID: ${SPREADSHEET_ID}`);
    console.log(`Sheet Name: ${SHEET_NAME}\n`);
    
    const accessToken = await getAccessToken();
    
    if (!accessToken) {
      throw new Error('No access token available');
    }
    
    const data = await getSheetData(SPREADSHEET_ID, SHEET_NAME, accessToken);
    
    console.log(`\n✅ Received data from API`);
    console.log(`   Total rows: ${data.values ? data.values.length : 0}`);
    
    if (data.values && data.values.length > 0) {
      analyzeGuestCounts(data.values);
    } else {
      console.log('⚠️  No data values in response');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();

