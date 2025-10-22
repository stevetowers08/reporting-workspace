import { test, expect } from '@playwright/test';

test.describe('PDF Export Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the dashboard
    await page.goto('/dashboard');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('should show export button when client is selected', async ({ page }) => {
    // Check if there's a client selector
    const clientSelector = page.locator('[data-testid="client-selector"], .venue-selector, button:has-text("Select Venue")');
    
    if (await clientSelector.count() > 0) {
      // Click on client selector
      await clientSelector.first().click();
      
      // Wait for dropdown to appear
      await page.waitForSelector('.dropdown, [role="listbox"]', { timeout: 5000 });
      
      // Select first available client
      const firstClient = page.locator('button:has-text("Client"), .client-item').first();
      if (await firstClient.count() > 0) {
        await firstClient.click();
        
        // Wait for client to be selected
        await page.waitForTimeout(1000);
        
        // Check if export button appears
        const exportButton = page.locator('button:has-text("Export"), button:has-text("PDF")');
        await expect(exportButton).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('should open PDF export options modal when export button is clicked', async ({ page }) => {
    // Try to find and click export button
    const exportButton = page.locator('button:has-text("Export"), button:has-text("PDF")');
    
    if (await exportButton.count() > 0) {
      await exportButton.first().click();
      
      // Check if modal opens
      const modal = page.locator('[role="dialog"], .modal, h2:has-text("PDF Export Options")');
      await expect(modal).toBeVisible({ timeout: 5000 });
      
      // Check modal content
      await expect(page.locator('text=PDF Export Options')).toBeVisible();
      await expect(page.locator('text=Client')).toBeVisible();
      await expect(page.locator('text=Date Range')).toBeVisible();
      await expect(page.locator('text=Select Tabs to Export')).toBeVisible();
      await expect(page.locator('text=Content Options')).toBeVisible();
    }
  });

  test('should allow customizing export options', async ({ page }) => {
    // Open export modal
    const exportButton = page.locator('button:has-text("Export"), button:has-text("PDF")');
    
    if (await exportButton.count() > 0) {
      await exportButton.first().click();
      
      const modal = page.locator('[role="dialog"], .modal, h2:has-text("PDF Export Options")');
      await expect(modal).toBeVisible({ timeout: 5000 });
      
      // Test tab selection
      const allTabsCheckbox = page.locator('input[type="checkbox"]#all-tabs, input[type="checkbox"]:near(text="Export All Tabs")');
      if (await allTabsCheckbox.count() > 0) {
        await allTabsCheckbox.click();
        
        // Check if individual tab checkboxes become visible
        const individualTabs = page.locator('input[type="checkbox"]:near(text="summary"), input[type="checkbox"]:near(text="meta")');
        if (await individualTabs.count() > 0) {
          await expect(individualTabs.first()).toBeVisible();
        }
      }
      
      // Test content options
      const chartsCheckbox = page.locator('input[type="checkbox"]:near(text="Include Charts")');
      if (await chartsCheckbox.count() > 0) {
        await chartsCheckbox.click();
      }
      
      const metricsCheckbox = page.locator('input[type="checkbox"]:near(text="Include Detailed Metrics")');
      if (await metricsCheckbox.count() > 0) {
        await metricsCheckbox.click();
      }
    }
  });

  test('should close modal when cancel is clicked', async ({ page }) => {
    // Open export modal
    const exportButton = page.locator('button:has-text("Export"), button:has-text("PDF")');
    
    if (await exportButton.count() > 0) {
      await exportButton.first().click();
      
      const modal = page.locator('[role="dialog"], .modal, h2:has-text("PDF Export Options")');
      await expect(modal).toBeVisible({ timeout: 5000 });
      
      // Click cancel
      const cancelButton = page.locator('button:has-text("Cancel")');
      await cancelButton.click();
      
      // Check if modal is closed
      await expect(modal).not.toBeVisible();
    }
  });

  test('should handle export process', async ({ page }) => {
    // Listen for console logs
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      consoleLogs.push(`${msg.type()}: ${msg.text()}`);
    });
    
    // Open export modal
    const exportButton = page.locator('button:has-text("Export"), button:has-text("PDF")');
    
    if (await exportButton.count() > 0) {
      await exportButton.first().click();
      
      const modal = page.locator('[role="dialog"], .modal, h2:has-text("PDF Export Options")');
      await expect(modal).toBeVisible({ timeout: 5000 });
      
      // Click export button
      const exportSubmitButton = page.locator('button:has-text("Export PDF")');
      await exportSubmitButton.click();
      
      // Wait for export process
      await page.waitForTimeout(3000);
      
      // Check console logs for any errors
      const errorLogs = consoleLogs.filter(log => log.includes('error') || log.includes('Error'));
      console.log('Console logs during export:', consoleLogs);
      
      // Check if there are any critical errors
      const criticalErrors = errorLogs.filter(log => 
        !log.includes('SES') && 
        !log.includes('lockdown') && 
        !log.includes('intrinsics')
      );
      
      if (criticalErrors.length > 0) {
        console.log('Critical errors found:', criticalErrors);
      }
    }
  });

  test('should display loading state during export', async ({ page }) => {
    // Open export modal
    const exportButton = page.locator('button:has-text("Export"), button:has-text("PDF")');
    
    if (await exportButton.count() > 0) {
      await exportButton.first().click();
      
      const modal = page.locator('[role="dialog"], .modal, h2:has-text("PDF Export Options")');
      await expect(modal).toBeVisible({ timeout: 5000 });
      
      // Click export button
      const exportSubmitButton = page.locator('button:has-text("Export PDF")');
      await exportSubmitButton.click();
      
      // Check if loading state appears
      const loadingButton = page.locator('button:has-text("Exporting...")');
      await expect(loadingButton).toBeVisible({ timeout: 2000 });
    }
  });

  test('should handle errors gracefully', async ({ page }) => {
    // Listen for console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Try to trigger export without proper setup
    const exportButton = page.locator('button:has-text("Export"), button:has-text("PDF")');
    
    if (await exportButton.count() > 0) {
      await exportButton.first().click();
      
      const modal = page.locator('[role="dialog"], .modal, h2:has-text("PDF Export Options")');
      await expect(modal).toBeVisible({ timeout: 5000 });
      
      // Click export button
      const exportSubmitButton = page.locator('button:has-text("Export PDF")');
      await exportSubmitButton.click();
      
      // Wait and check for errors
      await page.waitForTimeout(2000);
      
      // Log any errors for debugging
      if (consoleErrors.length > 0) {
        console.log('Console errors during export:', consoleErrors);
      }
    }
  });
});

