// Script to check Google Sheets data via API
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ywxqgqfpwvxqjqkqgxro.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

// For Wormwood client - spreadsheet ID from previous context
const SPREADSHEET_ID = '1YOgfl_S0W4VL5SuWXdFk2tH9naFmwwPmfIz_lPmKtPc';
const SHEET_NAME = 'Event Leads';

async function getAccessToken() {
  try {
    // Get integration data from Supabase
    const response = await fetch(`${SUPABASE_URL}/rest/v1/integrations?platform=eq.googleSheets&select=*`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch integrations: ${response.status}`);
    }

    const integrations = await response.json();
    
    if (integrations.length === 0) {
      throw new Error('No Google Sheets integration found');
    }

    const integration = integrations[0];
    const tokens = integration.config?.tokens || integration.config;
    
    let accessToken = tokens?.accessToken || tokens?.access_token;
    const refreshToken = tokens?.refreshToken || tokens?.refresh_token;
    const expiresAt = tokens?.expiresAt || tokens?.expires_at;

    // Check if token is expired
    if (expiresAt && new Date(expiresAt) <= new Date()) {
      console.log('Token expired, refreshing...');
      // Refresh token logic would go here
      // For now, just log
      console.log('Token needs refresh');
    }

    return accessToken;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw error;
  }
}

async function getSheetData(spreadsheetId, sheetName, accessToken) {
  const range = `${sheetName}!A:Z`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  
  console.log(`Fetching: ${url}`);
  console.log(`Range: ${range}`);
  
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

async function main() {
  try {
    console.log('Getting access token...');
    const accessToken = await getAccessToken();
    
    if (!accessToken) {
      throw new Error('No access token available');
    }

    console.log(`Access token: ${accessToken.substring(0, 20)}...`);
    
    console.log(`\nFetching data from spreadsheet: ${SPREADSHEET_ID}`);
    console.log(`Sheet name: ${SHEET_NAME}`);
    
    const data = await getSheetData(SPREADSHEET_ID, SHEET_NAME, accessToken);
    
    console.log('\n=== HEADERS ===');
    if (data.values && data.values.length > 0) {
      console.log(JSON.stringify(data.values[0], null, 2));
    }
    
    console.log('\n=== FIRST 5 ROWS ===');
    if (data.values && data.values.length > 1) {
      data.values.slice(1, 6).forEach((row, index) => {
        console.log(`Row ${index + 1}:`, JSON.stringify(row));
      });
    }
    
    console.log(`\n=== TOTAL ROWS ===`);
    console.log(`Total rows: ${data.values ? data.values.length - 1 : 0} (excluding header)`);
    
    // Check for date column
    if (data.values && data.values.length > 0) {
      const headers = data.values[0];
      const dateColumnIndex = headers.findIndex(h => h && h.toLowerCase().includes('date'));
      console.log(`\n=== DATE COLUMN ===`);
      if (dateColumnIndex >= 0) {
        console.log(`Date column found at index ${dateColumnIndex}: "${headers[dateColumnIndex]}"`);
        console.log(`Sample dates from first 5 rows:`);
        data.values.slice(1, 6).forEach((row, index) => {
          const dateValue = row[dateColumnIndex];
          console.log(`  Row ${index + 1}: "${dateValue}"`);
        });
      } else {
        console.log('No date column found');
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();



