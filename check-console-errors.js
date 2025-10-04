// Simple console error checker
const puppeteer = require('puppeteer');

async function checkConsoleErrors() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  const errors = [];
  const warnings = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    } else if (msg.type() === 'warning') {
      warnings.push(msg.text());
    }
  });
  
  page.on('pageerror', error => {
    errors.push(`Page Error: ${error.message}`);
  });
  
  try {
    console.log('Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
    
    // Wait a bit for any async operations
    await page.waitForTimeout(3000);
    
    console.log('\n=== CONSOLE ERRORS ===');
    if (errors.length === 0) {
      console.log('✅ No console errors found!');
    } else {
      errors.forEach(error => console.log('❌', error));
    }
    
    console.log('\n=== CONSOLE WARNINGS ===');
    if (warnings.length === 0) {
      console.log('✅ No console warnings found!');
    } else {
      warnings.forEach(warning => console.log('⚠️', warning));
    }
    
  } catch (error) {
    console.error('Error during testing:', error.message);
  } finally {
    await browser.close();
  }
}

checkConsoleErrors().catch(console.error);
