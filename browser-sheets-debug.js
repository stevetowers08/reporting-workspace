// Browser console test for Google Sheets saving
// Copy and paste this into the browser console on localhost:5173

console.log('🔍 Google Sheets Saving Debug Test');
console.log('==================================');

// Test 1: Check if GoogleSheetsSelector is working
console.log('📋 Testing GoogleSheetsSelector...');

// Test 2: Check form state
function checkFormState() {
  console.log('📋 Checking form state...');
  
  // Check if we can find the form elements
  const form = document.querySelector('form');
  if (form) {
    console.log('✅ Form found');
    
    // Check for Google Sheets section
    const googleSheetsSection = document.querySelector('[data-testid="google-sheets-section"]') || 
                               document.querySelector('div:has(> div:contains("Google Sheets"))');
    
    if (googleSheetsSection) {
      console.log('✅ Google Sheets section found');
      
      // Check for GoogleSheetsSelector
      const sheetsSelector = googleSheetsSection.querySelector('[data-testid="google-sheets-selector"]') ||
                            googleSheetsSection.querySelector('div:has(> select)');
      
      if (sheetsSelector) {
        console.log('✅ GoogleSheetsSelector found');
      } else {
        console.log('❌ GoogleSheetsSelector not found');
      }
      
      // Check for save button
      const saveButton = googleSheetsSection.querySelector('button:contains("Save")');
      if (saveButton) {
        console.log('✅ Save button found');
      } else {
        console.log('❌ Save button not found');
      }
      
    } else {
      console.log('❌ Google Sheets section not found');
    }
  } else {
    console.log('❌ Form not found');
  }
}

// Test 3: Simulate Google Sheets selection
function simulateSheetsSelection() {
  console.log('📋 Simulating Google Sheets selection...');
  
  // Try to find and interact with the GoogleSheetsSelector
  const sheetsSection = document.querySelector('div:has(> div:contains("Google Sheets"))');
  if (sheetsSection) {
    console.log('✅ Found Google Sheets section');
    
    // Look for edit button
    const editButton = sheetsSection.querySelector('button:contains("Edit")');
    if (editButton) {
      console.log('✅ Found edit button, clicking...');
      editButton.click();
      
      // Wait a bit for the selector to load
      setTimeout(() => {
        console.log('📋 Checking if GoogleSheetsSelector loaded...');
        
        // Look for the selector
        const selector = document.querySelector('select, [role="combobox"]');
        if (selector) {
          console.log('✅ GoogleSheetsSelector found after edit');
        } else {
          console.log('❌ GoogleSheetsSelector not found after edit');
        }
      }, 1000);
      
    } else {
      console.log('❌ Edit button not found');
    }
  } else {
    console.log('❌ Google Sheets section not found');
  }
}

// Test 4: Check form data
function checkFormData() {
  console.log('📋 Checking form data...');
  
  // Try to access React state (this might not work depending on React version)
  try {
    // This is a hack to try to access React state
    const reactRoot = document.querySelector('#root');
    if (reactRoot && reactRoot._reactInternalFiber) {
      console.log('✅ React root found');
      // Try to find the form component
      console.log('📋 React root:', reactRoot._reactInternalFiber);
    }
  } catch (error) {
    console.log('❌ Could not access React state:', error.message);
  }
}

// Run all tests
function runAllTests() {
  console.log('🚀 Running Google Sheets debug tests...');
  
  checkFormState();
  
  setTimeout(() => {
    simulateSheetsSelection();
  }, 1000);
  
  setTimeout(() => {
    checkFormData();
  }, 2000);
}

// Start the tests
runAllTests();

console.log('🔍 Debug test completed. Check the results above.');
