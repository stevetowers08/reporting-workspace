#!/usr/bin/env node

/**
 * Test Google Sheets API to list available spreadsheets
 */

import fetch from 'node-fetch';

const SUPABASE_URL = 'https://bdmcdyxjdkgitphieklb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbWNkeXhqZGtnaXRwaGlla2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0Mzk3MDYsImV4cCI6MjA3NTAxNTcwNn0.QwmjIXs7PbTi21GGDNd1Z0EQR2R6B_fwYWCXDFeOCPw';

async function listSheets() {
  console.log('🔍 Listing available Google Sheets...\n');

  try {
    // First, let's check what spreadsheets are available by testing the service
    const response = await fetch(`${SUPABASE_URL}/functions/v1/google-sheets-data`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        operation: 'list_sheets'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Failed to list sheets:', response.status, errorText);
      
      // Try a different approach - test with a range that might exist
      console.log('\n🔍 Trying to test with common spreadsheet patterns...');
      await testCommonPatterns();
      return;
    }

    const data = await response.json();
    console.log('✅ Response:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function testCommonPatterns() {
  // Test some common spreadsheet ID patterns that might exist
  const commonIds = [
    '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms', // Google sample
    '1s5Q4Q4Q4Q4Q4Q4Q4Q4Q4Q4Q4Q4Q4Q4Q4Q4Q4Q4Q4Q4Q4Q4Q', // Placeholder
  ];

  for (const spreadsheetId of commonIds) {
    console.log(`\n🔍 Testing spreadsheet: ${spreadsheetId}`);
    
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/google-sheets-data`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          spreadsheetId: spreadsheetId,
          range: 'A1:Z5'
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.values) {
          const headers = data.data.values[0];
          console.log(`   ✅ Headers: ${headers.join(', ')}`);
          
          // Check for source-related columns
          const sourceColumns = headers.filter(h => 
            h && h.toLowerCase().includes('source')
          );
          if (sourceColumns.length > 0) {
            console.log(`   🎯 Found source columns: ${sourceColumns.join(', ')}`);
          }
        }
      } else {
        console.log(`   ❌ Failed: ${response.status}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
}

// Run the test
listSheets().then(() => {
  console.log('\n🏁 Test completed');
}).catch(error => {
  console.error('💥 Test failed:', error);
});
