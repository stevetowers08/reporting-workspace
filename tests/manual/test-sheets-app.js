// Test script using the app's GoogleSheetsService
import { GoogleSheetsService } from './src/services/api/googleSheetsService.js';

async function testGoogleSheetsWithAppAuth() {
  try {
    console.log('🔍 Testing Google Sheets data fetch with app authentication...');
    
    // Test connection first
    console.log('\n1️⃣ Testing connection...');
    const isConnected = await GoogleSheetsService.testConnection();
    console.log('Connection result:', isConnected);
    
    if (!isConnected) {
      console.log('❌ Google Sheets not connected. Please connect it first in the admin panel.');
      return;
    }
    
    // Get the Magnolia Terrace client's spreadsheet configuration
    const spreadsheetId = '1V0C4jLBvUfrnBK8wMQaAQ_Ly2C6681e0JyNcmzrUKn4';
    const sheetName = 'Wedding Leads';
    
    console.log(`\n2️⃣ Fetching data from spreadsheet: ${spreadsheetId}`);
    console.log(`📋 Sheet name: ${sheetName}`);
    
    // Fetch the spreadsheet data
    const data = await GoogleSheetsService.getSpreadsheetData(spreadsheetId, `${sheetName}!A:Z`);
    
    if (!data || !data.values) {
      console.log('❌ No data found in the sheet');
      return;
    }
    
    console.log(`\n✅ Successfully fetched ${data.values.length} rows of data`);
    
    // Display headers
    if (data.values.length > 0) {
      console.log('\n📋 Headers:');
      data.values[0].forEach((header, index) => {
        console.log(`  ${index + 1}. ${header}`);
      });
    }
    
    // Display sample data rows
    if (data.values.length > 1) {
      console.log('\n📄 Sample data rows:');
      const sampleRows = data.values.slice(1, Math.min(5, data.values.length));
      
      sampleRows.forEach((row, index) => {
        console.log(`\n  Row ${index + 2}:`);
        row.forEach((cell, cellIndex) => {
          const header = data.values[0][cellIndex] || `Column ${cellIndex + 1}`;
          console.log(`    ${header}: ${cell}`);
        });
      });
    }
    
    // Data summary
    console.log(`\n📈 Data Summary:`);
    console.log(`  Total rows: ${data.values.length}`);
    console.log(`  Total columns: ${data.values[0]?.length || 0}`);
    console.log(`  Data rows: ${data.values.length - 1}`);
    
    // Analyze the data structure
    console.log(`\n🔍 Data Analysis:`);
    if (data.values.length > 1) {
      const headers = data.values[0];
      const dataRows = data.values.slice(1);
      
      console.log(`  Potential lead fields found:`);
      headers.forEach((header, index) => {
        const sampleValues = dataRows.slice(0, 3).map(row => row[index]).filter(val => val && val.trim());
        if (sampleValues.length > 0) {
          console.log(`    - ${header}: ${sampleValues.join(', ')}`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testGoogleSheetsWithAppAuth();
