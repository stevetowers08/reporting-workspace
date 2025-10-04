// Direct call to fetch Google Sheets data
import { GoogleSheetsService } from './src/services/api/googleSheetsService.js';

const spreadsheetId = '1V0C4jLBvUfrnBK8wMQaAQ_Ly2C6681e0JyNcmzrUKn4';
const sheetName = 'Wedding Leads';

console.log('Fetching Google Sheets data...');
console.log('Spreadsheet ID:', spreadsheetId);
console.log('Sheet Name:', sheetName);

try {
  const data = await GoogleSheetsService.getSpreadsheetData(spreadsheetId, `${sheetName}!A:Z`);
  
  if (data && data.values) {
    console.log('\n✅ Data fetched successfully!');
    console.log('Total rows:', data.values.length);
    console.log('Total columns:', data.values[0]?.length || 0);
    
    console.log('\n📋 Headers:');
    data.values[0].forEach((header, index) => {
      console.log(`${index + 1}. ${header}`);
    });
    
    console.log('\n📄 Sample data:');
    data.values.slice(1, 4).forEach((row, index) => {
      console.log(`\nRow ${index + 2}:`);
      row.forEach((cell, cellIndex) => {
        const header = data.values[0][cellIndex];
        console.log(`  ${header}: ${cell}`);
      });
    });
  } else {
    console.log('❌ No data found');
  }
} catch (error) {
  console.error('❌ Error:', error.message);
}
