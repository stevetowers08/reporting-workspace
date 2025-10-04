// Test script to fetch Google Sheets data
import { GoogleSheetsService } from './src/services/api/googleSheetsService.js';

async function testGoogleSheetsData() {
  try {
    console.log('Testing Google Sheets connection...');
    
    // Test connection first
    const isConnected = await GoogleSheetsService.testConnection();
    console.log('Connection test result:', isConnected);
    
    if (!isConnected) {
      console.log('❌ Google Sheets not connected');
      return;
    }
    
    // Get the Magnolia Terrace client's spreadsheet ID and sheet name
    const spreadsheetId = '1V0C4jLBvUfrnBK8wMQaAQ_Ly2C6681e0JyNcmzrUKn4';
    const sheetName = 'Wedding Leads';
    
    console.log(`\n📊 Fetching data from spreadsheet: ${spreadsheetId}`);
    console.log(`📋 Sheet name: ${sheetName}`);
    
    // Fetch the data
    const data = await GoogleSheetsService.getSpreadsheetData(spreadsheetId, `${sheetName}!A:Z`);
    
    if (!data || !data.values) {
      console.log('❌ No data found in the sheet');
      return;
    }
    
    console.log(`\n✅ Found ${data.values.length} rows of data`);
    
    // Show headers (first row)
    if (data.values.length > 0) {
      console.log('\n📋 Headers:');
      data.values[0].forEach((header, index) => {
        console.log(`  ${index + 1}. ${header}`);
      });
    }
    
    // Show first few data rows
    if (data.values.length > 1) {
      console.log('\n📄 Sample data rows:');
      const sampleRows = data.values.slice(1, Math.min(6, data.values.length));
      sampleRows.forEach((row, index) => {
        console.log(`\n  Row ${index + 2}:`);
        row.forEach((cell, cellIndex) => {
          const header = data.values[0][cellIndex] || `Column ${cellIndex + 1}`;
          console.log(`    ${header}: ${cell}`);
        });
      });
    }
    
    // Show data summary
    console.log(`\n📈 Data Summary:`);
    console.log(`  Total rows: ${data.values.length}`);
    console.log(`  Total columns: ${data.values[0]?.length || 0}`);
    console.log(`  Data rows: ${data.values.length - 1}`);
    
  } catch (error) {
    console.error('❌ Error fetching Google Sheets data:', error);
  }
}

testGoogleSheetsData();
