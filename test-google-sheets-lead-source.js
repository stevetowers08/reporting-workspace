#!/usr/bin/env node

/**
 * Test script to check if Google Sheets API is returning lead source data
 * This script tests the Google Sheets integration for the lead info tab
 */

import fetch from 'node-fetch';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

async function testGoogleSheetsLeadSource() {
  console.log('🔍 Testing Google Sheets API for Lead Source Data...\n');

  try {
    // Test 1: Check if Google Sheets integration is connected
    console.log('1️⃣ Checking Google Sheets integration status...');
    
    const integrationResponse = await fetch(`${SUPABASE_URL}/rest/v1/integrations?platform=eq.googleSheets&connected=eq.true`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!integrationResponse.ok) {
      throw new Error(`Failed to check integration status: ${integrationResponse.status}`);
    }

    const integrations = await integrationResponse.json();
    
    if (integrations.length === 0) {
      console.log('❌ Google Sheets integration not connected');
      return;
    }

    console.log('✅ Google Sheets integration is connected');
    console.log(`   Account: ${integrations[0].config?.accountInfo?.email || 'Unknown'}`);

    // Test 2: Get available spreadsheets
    console.log('\n2️⃣ Fetching available spreadsheets...');
    
    const sheetsResponse = await fetch(`${SUPABASE_URL}/functions/v1/google-sheets-data`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        operation: 'list_sheets'
      })
    });

    if (!sheetsResponse.ok) {
      console.log('⚠️  Could not fetch spreadsheet list directly, trying alternative approach...');
      
      // Alternative: Test with a known spreadsheet ID if available
      const testSpreadsheetId = process.env.TEST_SPREADSHEET_ID;
      if (testSpreadsheetId) {
        await testSpecificSpreadsheet(testSpreadsheetId);
      } else {
        console.log('❌ No test spreadsheet ID provided. Set TEST_SPREADSHEET_ID environment variable to test specific spreadsheet.');
      }
      return;
    }

    const sheetsData = await sheetsResponse.json();
    console.log('✅ Successfully fetched spreadsheet data');
    console.log(`   Response: ${JSON.stringify(sheetsData, null, 2)}`);

    // Test 3: Analyze data structure for lead source information
    if (sheetsData.success && sheetsData.data?.values) {
      console.log('\n3️⃣ Analyzing data structure for lead source information...');
      
      const values = sheetsData.data.values;
      console.log(`   Total rows: ${values.length}`);
      
      if (values.length > 0) {
        const headers = values[0];
        console.log(`   Headers: ${headers.join(', ')}`);
        
        // Look for lead source related columns
        const leadSourceColumns = headers.filter(header => 
          header && (
            header.toLowerCase().includes('lead') ||
            header.toLowerCase().includes('source') ||
            header.toLowerCase().includes('origin') ||
            header.toLowerCase().includes('referral') ||
            header.toLowerCase().includes('utm') ||
            header.toLowerCase().includes('campaign')
          )
        );
        
        if (leadSourceColumns.length > 0) {
          console.log(`✅ Found potential lead source columns: ${leadSourceColumns.join(', ')}`);
          
          // Show sample data for lead source columns
          const leadSourceIndices = leadSourceColumns.map(col => headers.indexOf(col));
          console.log('\n📊 Sample lead source data:');
          
          for (let i = 1; i <= Math.min(5, values.length - 1); i++) {
            const row = values[i];
            const leadSourceData = leadSourceIndices.map(idx => `${headers[idx]}: ${row[idx] || 'N/A'}`);
            console.log(`   Row ${i}: ${leadSourceData.join(', ')}`);
          }
        } else {
          console.log('⚠️  No obvious lead source columns found in headers');
          console.log('   Consider checking if lead source data is in a different column or format');
        }
        
        // Show first few rows of data
        console.log('\n📋 First 3 rows of data:');
        for (let i = 0; i < Math.min(3, values.length); i++) {
          console.log(`   Row ${i + 1}: ${values[i].join(' | ')}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error testing Google Sheets API:', error.message);
    console.error('   Stack:', error.stack);
  }
}

async function testSpecificSpreadsheet(spreadsheetId) {
  console.log(`\n🔍 Testing specific spreadsheet: ${spreadsheetId}`);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/google-sheets-data`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        spreadsheetId: spreadsheetId,
        range: 'A1:Z100' // Get first 100 rows
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (data.success && data.data?.values) {
      console.log('✅ Successfully fetched spreadsheet data');
      console.log(`   Rows: ${data.data.values.length}`);
      
      const values = data.data.values;
      if (values.length > 0) {
        const headers = values[0];
        console.log(`   Headers: ${headers.join(', ')}`);
        
        // Look for lead source columns
        const leadSourceColumns = headers.filter(header => 
          header && (
            header.toLowerCase().includes('lead') ||
            header.toLowerCase().includes('source') ||
            header.toLowerCase().includes('origin') ||
            header.toLowerCase().includes('referral') ||
            header.toLowerCase().includes('utm') ||
            header.toLowerCase().includes('campaign')
          )
        );
        
        if (leadSourceColumns.length > 0) {
          console.log(`✅ Found lead source columns: ${leadSourceColumns.join(', ')}`);
        } else {
          console.log('⚠️  No lead source columns found');
        }
      }
    } else {
      console.log('❌ Failed to fetch data:', data.error || 'Unknown error');
    }
    
  } catch (error) {
    console.error('❌ Error testing specific spreadsheet:', error.message);
  }
}

// Run the test
testGoogleSheetsLeadSource().then(() => {
  console.log('\n🏁 Test completed');
}).catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});
