#!/usr/bin/env node

/**
 * Test Google Sheets API for 'source' column using Supabase Edge Function
 */

import fetch from 'node-fetch';

const SUPABASE_URL = 'https://bdmcdyxjdkgitphieklb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbWNkeXhqZGtnaXRwaGlla2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0Mzk3MDYsImV4cCI6MjA3NTAxNTcwNn0.QwmjIXs7PbTi21GGDNd1Z0EQR2R6B_fwYWCXDFeOCPw';

// Test with a sample spreadsheet ID
const TEST_SPREADSHEET_ID = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'; // Google Sheets sample

async function testSheetsSource() {
  console.log('🔍 Testing Google Sheets API for "source" column...\n');

  try {
    // Test the Supabase Edge Function
    const response = await fetch(`${SUPABASE_URL}/functions/v1/google-sheets-data`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        spreadsheetId: TEST_SPREADSHEET_ID,
        range: 'A1:Z10' // Get first 10 rows
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Edge Function request failed:', response.status, errorText);
      return;
    }

    const data = await response.json();
    
    if (data.success && data.data?.values) {
      console.log('✅ Successfully fetched Google Sheets data');
      console.log(`   Rows: ${data.data.values.length}`);
      
      const values = data.data.values;
      if (values.length > 0) {
        const headers = values[0];
        console.log(`   Headers: ${headers.join(', ')}`);
        
        // Look for 'source' column specifically
        const sourceIndex = headers.findIndex(header => 
          header && header.toLowerCase().includes('source')
        );
        
        if (sourceIndex !== -1) {
          console.log(`✅ Found "source" column at index ${sourceIndex}: "${headers[sourceIndex]}"`);
          
          // Show sample source data
          console.log('\n📊 Sample source data:');
          for (let i = 1; i <= Math.min(5, values.length - 1); i++) {
            const row = values[i];
            console.log(`   Row ${i}: ${row[sourceIndex] || 'N/A'}`);
          }
        } else {
          console.log('⚠️  No "source" column found');
          
          // Look for any columns that might contain source info
          const potentialSourceColumns = headers.filter(header => 
            header && (
              header.toLowerCase().includes('lead') ||
              header.toLowerCase().includes('origin') ||
              header.toLowerCase().includes('referral') ||
              header.toLowerCase().includes('utm') ||
              header.toLowerCase().includes('campaign') ||
              header.toLowerCase().includes('medium')
            )
          );
          
          if (potentialSourceColumns.length > 0) {
            console.log(`   Found potential source-related columns: ${potentialSourceColumns.join(', ')}`);
          }
        }
        
        // Show first few rows
        console.log('\n📋 First 3 rows:');
        for (let i = 0; i < Math.min(3, values.length); i++) {
          console.log(`   Row ${i + 1}: ${values[i].join(' | ')}`);
        }
      }
    } else {
      console.log('❌ Failed to fetch data:', data.error || 'Unknown error');
    }
    
  } catch (error) {
    console.error('❌ Error testing Google Sheets:', error.message);
  }
}

// Run the test
testSheetsSource().then(() => {
  console.log('\n🏁 Test completed');
}).catch(error => {
  console.error('💥 Test failed:', error);
});
