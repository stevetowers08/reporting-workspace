#!/usr/bin/env node

/**
 * Test YOUR actual Google Sheets using updated Edge Function
 */

import fetch from 'node-fetch';

const SUPABASE_URL = 'https://bdmcdyxjdkgitphieklb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbWNkeXhqZGtnaXRwaGlla2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0Mzk3MDYsImV4cCI6MjA3NTAxNTcwNn0.QwmjIXs7PbTi21GGDNd1Z0EQR2R6B_fwYWCXDFeOCPw';

async function testYourActualSheets() {
  console.log('🔍 Testing YOUR actual Google Sheets for lead source data...\n');

  try {
    // Step 1: List your actual spreadsheets
    console.log('1️⃣ Listing your actual spreadsheets...');
    
    const listResponse = await fetch(`${SUPABASE_URL}/functions/v1/google-sheets-data`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        operation: 'list_sheets'
      })
    });

    if (!listResponse.ok) {
      const errorText = await listResponse.text();
      console.log('❌ Failed to list spreadsheets:', listResponse.status, errorText);
      return;
    }

    const listData = await listResponse.json();
    
    if (listData.success && listData.data?.spreadsheets) {
      const spreadsheets = listData.data.spreadsheets;
      console.log(`✅ Found ${spreadsheets.length} spreadsheets:`);
      
      spreadsheets.forEach((sheet, index) => {
        console.log(`   ${index + 1}. "${sheet.name}" (ID: ${sheet.id})`);
        console.log(`      Modified: ${sheet.modifiedTime}`);
        console.log(`      URL: ${sheet.webViewLink}`);
      });

      // Step 2: Test each spreadsheet for lead source data
      console.log('\n2️⃣ Testing each spreadsheet for lead source data...');
      
      for (const sheet of spreadsheets) {
        console.log(`\n🔍 Testing spreadsheet: "${sheet.name}"`);
        
        try {
          const testResponse = await fetch(`${SUPABASE_URL}/functions/v1/google-sheets-data`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              spreadsheetId: sheet.id,
              range: 'A1:Z10' // Get first 10 rows
            })
          });

          if (testResponse.ok) {
            const testData = await testResponse.json();
            
            if (testData.success && testData.data?.values) {
              const values = testData.data.values;
              const headers = values[0];
              
              console.log(`   ✅ Headers: ${headers.join(', ')}`);
              
              // Look for lead source columns
              const sourceColumns = headers.filter((header, index) => {
                if (!header) return false;
                const lower = header.toLowerCase();
                return lower.includes('source') || 
                       lower.includes('lead') || 
                       lower.includes('origin') ||
                       lower.includes('referral') ||
                       lower.includes('utm') ||
                       lower.includes('campaign') ||
                       lower.includes('medium') ||
                       lower.includes('channel') ||
                       lower.includes('how') ||
                       lower.includes('where') ||
                       lower.includes('heard');
              });
              
              if (sourceColumns.length > 0) {
                console.log(`   🎯 FOUND LEAD SOURCE COLUMNS: ${sourceColumns.join(', ')}`);
                
                // Show sample data for source columns
                const sourceIndices = sourceColumns.map(col => headers.indexOf(col));
                console.log(`   📊 Sample source data:`);
                for (let i = 1; i <= Math.min(3, values.length - 1); i++) {
                  const row = values[i];
                  const sourceData = sourceIndices.map(idx => `${headers[idx]}: ${row[idx] || 'N/A'}`);
                  console.log(`      Row ${i}: ${sourceData.join(', ')}`);
                }
              } else {
                console.log(`   ⚠️  No obvious lead source columns found`);
              }
            } else {
              console.log(`   ❌ Failed to get data: ${testData.error || 'Unknown error'}`);
            }
          } else {
            console.log(`   ❌ Request failed: ${testResponse.status}`);
          }
        } catch (error) {
          console.log(`   ❌ Error: ${error.message}`);
        }
      }
      
    } else {
      console.log('❌ Failed to list spreadsheets:', listData.error || 'Unknown error');
    }
    
  } catch (error) {
    console.error('❌ Error testing your sheets:', error.message);
  }
}

// Run the test
testYourActualSheets().then(() => {
  console.log('\n🏁 Test completed');
}).catch(error => {
  console.error('💥 Test failed:', error);
});
