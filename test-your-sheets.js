#!/usr/bin/env node

/**
 * Test YOUR actual Google Sheets using Supabase MCP
 */

import fetch from 'node-fetch';

const SUPABASE_URL = 'https://bdmcdyxjdkgitphieklb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbWNkeXhqZGtnaXRwaGlla2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0Mzk3MDYsImV4cCI6MjA3NTAxNTcwNn0.QwmjIXs7PbTi21GGDNd1Z0EQR2R6B_fwYWCXDFeOCPw';

async function testYourSheets() {
  console.log('🔍 Testing YOUR actual Google Sheets for lead source data...\n');

  try {
    // First, let's try to get your actual spreadsheets
    console.log('1️⃣ Attempting to list your spreadsheets...');
    
    // Try different approaches to get your spreadsheets
    const approaches = [
      // Approach 1: Try to get spreadsheet list
      {
        name: 'List spreadsheets',
        body: { operation: 'list' }
      },
      // Approach 2: Try to get sheets accounts
      {
        name: 'Get sheets accounts', 
        body: { operation: 'accounts' }
      },
      // Approach 3: Try with a common spreadsheet ID pattern
      {
        name: 'Test common ID pattern',
        body: { 
          spreadsheetId: '1', // This will fail but might give us info
          range: 'A1:Z1'
        }
      }
    ];

    for (const approach of approaches) {
      console.log(`\n🔍 Trying: ${approach.name}`);
      
      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/google-sheets-data`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(approach.body)
        });

        const data = await response.json();
        
        if (response.ok) {
          console.log(`✅ ${approach.name} succeeded:`);
          console.log(JSON.stringify(data, null, 2));
          
          // If we got spreadsheet data, analyze it
          if (data.success && data.data?.values) {
            await analyzeSpreadsheetData(data.data.values);
          }
        } else {
          console.log(`❌ ${approach.name} failed: ${response.status}`);
          console.log(JSON.stringify(data, null, 2));
        }
      } catch (error) {
        console.log(`❌ ${approach.name} error: ${error.message}`);
      }
    }

    // Approach 4: Try to get user's Google Drive files
    console.log('\n🔍 Trying to get Google Drive files...');
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/google-sheets-data`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          operation: 'drive_files',
          mimeType: 'application/vnd.google-apps.spreadsheet'
        })
      });

      const data = await response.json();
      console.log('Drive files response:', JSON.stringify(data, null, 2));
    } catch (error) {
      console.log('Drive files error:', error.message);
    }

  } catch (error) {
    console.error('❌ Error testing your sheets:', error.message);
  }
}

async function analyzeSpreadsheetData(values) {
  console.log('\n📊 ANALYZING SPREADSHEET DATA:');
  console.log(`   Total rows: ${values.length}`);
  
  if (values.length > 0) {
    const headers = values[0];
    console.log(`   Total columns: ${headers.length}`);
    console.log(`   Headers: ${headers.join(', ')}`);
    
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
             lower.includes('channel');
    });
    
    if (sourceColumns.length > 0) {
      console.log(`✅ FOUND LEAD SOURCE COLUMNS: ${sourceColumns.join(', ')}`);
    } else {
      console.log('⚠️  No obvious lead source columns found');
    }
    
    // Show sample data
    console.log('\n📋 Sample data:');
    for (let i = 0; i < Math.min(3, values.length); i++) {
      console.log(`   Row ${i + 1}: ${values[i].join(' | ')}`);
    }
  }
}

// Run the test
testYourSheets().then(() => {
  console.log('\n🏁 Test completed');
}).catch(error => {
  console.error('💥 Test failed:', error);
});
