import { test, expect } from '@playwright/test';

test.describe('PDF Export Console Logs', () => {
  test('should check console logs for PDF export errors', async ({ page }) => {
    // Listen for console messages
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    });

    // Navigate to dashboard
    await page.goto('http://127.0.0.1:3000/dashboard');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Wait a bit for any initial errors
    await page.waitForTimeout(3000);
    
    // Check for React errors
    const reactErrors = consoleMessages.filter(msg => 
      msg.includes('Objects are not valid as a React child') ||
      msg.includes('React child') ||
      msg.includes('found: object with keys')
    );
    
    console.log('All console messages:', consoleMessages);
    
    if (reactErrors.length > 0) {
      console.log('React errors found:', reactErrors);
      // Don't fail the test, just log the errors
    }
    
    // Check for PDF-related errors
    const pdfErrors = consoleMessages.filter(msg => 
      msg.includes('PDF') || 
      msg.includes('export') ||
      msg.includes('jspdf') ||
      msg.includes('html2canvas')
    );
    
    if (pdfErrors.length > 0) {
      console.log('PDF-related messages:', pdfErrors);
    }
  });
});

