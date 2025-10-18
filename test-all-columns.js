#!/usr/bin/env node

/**
 * Test Google Sheets API - Check ALL columns for lead source data
 */

import fetch from 'node-fetch';

const SUPABASE_URL = 'https://bdmcdyxjdkgitphieklb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbWNkeXhqZGtnaXRwaGlla2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0Mzk3MDYsImV4cCI6MjA3NTAxNTcwNn0.QwmjIXs7PbTi21GGDNd1Z0EQR2R6B_fwYWCXDFeOCPw';

// Test with a sample spreadsheet ID
const TEST_SPREADSHEET_ID = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'; // Google Sheets sample

async function checkAllColumns() {
  console.log('🔍 Checking ALL columns in Google Sheets for lead source data...\n');

  try {
    // Get more rows to see all data
    const response = await fetch(`${SUPABASE_URL}/functions/v1/google-sheets-data`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        spreadsheetId: TEST_SPREADSHEET_ID,
        range: 'A1:Z50' // Get first 50 rows to see all columns
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Request failed:', response.status, errorText);
      return;
    }

    const data = await response.json();
    
    if (data.success && data.data?.values) {
      console.log('✅ Successfully fetched Google Sheets data');
      console.log(`   Total rows: ${data.data.values.length}`);
      
      const values = data.data.values;
      if (values.length > 0) {
        const headers = values[0];
        console.log(`\n📋 ALL COLUMNS FOUND:`);
        console.log(`   Total columns: ${headers.length}`);
        
        // Show all column headers with their index
        headers.forEach((header, index) => {
          console.log(`   Column ${index + 1}: "${header}"`);
        });
        
        // Look for ANY columns that might contain source/lead information
        console.log(`\n🔍 ANALYZING COLUMNS FOR LEAD SOURCE DATA:`);
        
        const potentialSourceColumns = [];
        headers.forEach((header, index) => {
          if (header) {
            const lowerHeader = header.toLowerCase();
            if (
              lowerHeader.includes('source') ||
              lowerHeader.includes('lead') ||
              lowerHeader.includes('origin') ||
              lowerHeader.includes('referral') ||
              lowerHeader.includes('utm') ||
              lowerHeader.includes('campaign') ||
              lowerHeader.includes('medium') ||
              lowerHeader.includes('channel') ||
              lowerHeader.includes('how') ||
              lowerHeader.includes('where') ||
              lowerHeader.includes('heard') ||
              lowerHeader.includes('found') ||
              lowerHeader.includes('discovered')
            ) {
              potentialSourceColumns.push({ index, header });
            }
          }
        });
        
        if (potentialSourceColumns.length > 0) {
          console.log(`✅ FOUND POTENTIAL LEAD SOURCE COLUMNS:`);
          potentialSourceColumns.forEach(col => {
            console.log(`   Column ${col.index + 1}: "${col.header}"`);
          });
        } else {
          console.log(`⚠️  NO OBVIOUS LEAD SOURCE COLUMNS FOUND`);
          console.log(`   This spreadsheet appears to contain student data, not lead data`);
        }
        
        // Show sample data for all columns
        console.log(`\n📊 SAMPLE DATA FROM ALL COLUMNS:`);
        for (let i = 1; i <= Math.min(5, values.length - 1); i++) {
          const row = values[i];
          console.log(`\n   Row ${i}:`);
          headers.forEach((header, index) => {
            const value = row[index] || 'N/A';
            console.log(`     ${header}: ${value}`);
          });
        }
        
        // Show data structure analysis
        console.log(`\n📈 DATA STRUCTURE ANALYSIS:`);
        console.log(`   - This appears to be a student/education dataset`);
        console.log(`   - Columns: ${headers.join(', ')}`);
        console.log(`   - No lead source tracking columns detected`);
        console.log(`   - To test lead source data, use a spreadsheet with contact/lead information`);
        
      }
    } else {
      console.log('❌ Failed to fetch data:', data.error || 'Unknown error');
    }
    
  } catch (error) {
    console.error('❌ Error testing Google Sheets:', error.message);
  }
}

// Run the test
checkAllColumns().then(() => {
  console.log('\n🏁 Column analysis completed');
  console.log('\n💡 TO TEST WITH YOUR ACTUAL LEAD DATA:');
  console.log('   1. Get your lead spreadsheet ID from the URL');
  console.log('   2. Update TEST_SPREADSHEET_ID in this script');
  console.log('   3. Run the test to see your actual column structure');
}).catch(error => {
  console.error('💥 Test failed:', error);
});
