// Comprehensive Google Sheets Saving Test
// Copy and paste this into the browser console on localhost:5173

console.log('🔍 Comprehensive Google Sheets Saving Test');
console.log('==========================================');

// Test 1: Check if we're on the right page
function checkPageContext() {
  console.log('📋 Checking page context...');
  
  const currentUrl = window.location.href;
  console.log('Current URL:', currentUrl);
  
  if (currentUrl.includes('localhost:5173')) {
    console.log('✅ On development server');
  } else {
    console.log('❌ Not on development server');
  }
  
  // Check if we're on a page with client management
  const hasClientForm = document.querySelector('form') !== null;
  const hasEditModal = document.querySelector('[role="dialog"]') !== null;
  
  console.log('Has form:', hasClientForm);
  console.log('Has modal:', hasEditModal);
}

// Test 2: Check Google Sheets integration status
async function checkGoogleSheetsIntegration() {
  console.log('📋 Checking Google Sheets integration...');
  
  try {
    // Check if supabase is available
    if (typeof supabase !== 'undefined') {
      console.log('✅ Supabase client available');
      
      const { data: integrations, error } = await supabase
        .from('integrations')
        .select('platform, connected')
        .eq('platform', 'googleSheets');
      
      if (error) {
        console.error('❌ Error checking integrations:', error);
      } else {
        console.log('Google Sheets integrations:', integrations);
        if (integrations && integrations.length > 0) {
          console.log('✅ Google Sheets integration found');
        } else {
          console.log('❌ No Google Sheets integration found');
        }
      }
    } else {
      console.log('❌ Supabase client not available');
    }
  } catch (error) {
    console.error('❌ Error checking Google Sheets integration:', error);
  }
}

// Test 3: Simulate Google Sheets selection flow
function simulateGoogleSheetsFlow() {
  console.log('📋 Simulating Google Sheets selection flow...');
  
  // Look for Google Sheets section
  const googleSheetsSection = document.querySelector('div:has(> div:contains("Google Sheets"))') ||
                             document.querySelector('[data-testid="google-sheets-section"]');
  
  if (googleSheetsSection) {
    console.log('✅ Found Google Sheets section');
    
    // Look for edit button
    const editButton = googleSheetsSection.querySelector('button:contains("Edit")');
    if (editButton) {
      console.log('✅ Found edit button');
      
      // Click edit button
      console.log('🔄 Clicking edit button...');
      editButton.click();
      
      // Wait for the selector to load
      setTimeout(() => {
        console.log('📋 Checking if GoogleSheetsSelector loaded...');
        
        // Look for spreadsheet selector
        const spreadsheetButtons = document.querySelectorAll('button[type="button"]');
        let foundSpreadsheetButton = false;
        
        spreadsheetButtons.forEach(button => {
          const text = button.textContent || '';
          if (text.includes('spreadsheet') || text.includes('Sheet')) {
            foundSpreadsheetButton = true;
            console.log('✅ Found spreadsheet button:', text);
          }
        });
        
        if (!foundSpreadsheetButton) {
          console.log('❌ No spreadsheet buttons found');
        }
        
        // Look for sheet selector
        const sheetSelector = document.querySelector('select, [role="combobox"]');
        if (sheetSelector) {
          console.log('✅ Found sheet selector');
        } else {
          console.log('❌ No sheet selector found');
        }
        
      }, 2000);
      
    } else {
      console.log('❌ Edit button not found');
    }
  } else {
    console.log('❌ Google Sheets section not found');
  }
}

// Test 4: Check form state
function checkFormState() {
  console.log('📋 Checking form state...');
  
  const form = document.querySelector('form');
  if (form) {
    console.log('✅ Form found');
    
    // Check for Google Sheets related inputs
    const inputs = form.querySelectorAll('input, select, textarea');
    console.log('Form inputs count:', inputs.length);
    
    // Look for any Google Sheets related elements
    const googleSheetsElements = form.querySelectorAll('*');
    let foundGoogleSheetsElements = false;
    
    googleSheetsElements.forEach(element => {
      const text = element.textContent || '';
      if (text.toLowerCase().includes('google') && text.toLowerCase().includes('sheet')) {
        foundGoogleSheetsElements = true;
        console.log('Found Google Sheets element:', text);
      }
    });
    
    if (!foundGoogleSheetsElements) {
      console.log('❌ No Google Sheets elements found in form');
    }
    
  } else {
    console.log('❌ Form not found');
  }
}

// Test 5: Check console logs
function checkConsoleLogs() {
  console.log('📋 Checking for Google Sheets related console logs...');
  
  // This is a bit tricky in the browser console, but we can check if our debug logs are working
  console.log('🔍 This is a test log to verify console is working');
  
  // Check if we can see any existing logs
  console.log('📋 Look for logs starting with "🔍 ClientForm:" or "🔍 GoogleSheetsSelector:"');
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Running comprehensive Google Sheets saving tests...');
  
  checkPageContext();
  
  setTimeout(() => {
    checkGoogleSheetsIntegration();
  }, 1000);
  
  setTimeout(() => {
    simulateGoogleSheetsFlow();
  }, 2000);
  
  setTimeout(() => {
    checkFormState();
  }, 4000);
  
  setTimeout(() => {
    checkConsoleLogs();
  }, 5000);
  
  setTimeout(() => {
    console.log('\n📊 Test Summary:');
    console.log('1. Check the console logs above for any errors');
    console.log('2. Look for "🔍" prefixed logs from ClientForm and GoogleSheetsSelector');
    console.log('3. Try manually editing a client and selecting Google Sheets');
    console.log('4. Check if the save button works and data persists');
    console.log('\n🎯 Next Steps:');
    console.log('- If you see errors, check the specific error messages');
    console.log('- If no errors but saving doesn\'t work, check the network tab');
    console.log('- If everything looks good, try the actual flow in the UI');
  }, 6000);
}

// Start the tests
runAllTests();

console.log('🔍 Comprehensive test started. Check the results above.');
