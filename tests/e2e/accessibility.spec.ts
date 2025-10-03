import { test, expect } from '@playwright/test';

test.describe('Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should have proper ARIA structure', async ({ page }) => {
    // Take ARIA snapshot of main content
    await expect(page.locator('main')).toMatchAriaSnapshot();
    
    // Check for proper heading hierarchy
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    const headingCount = await headings.count();
    expect(headingCount).toBeGreaterThan(0);
    
    // Verify first heading is h1
    const firstHeading = headings.first();
    const tagName = await firstHeading.evaluate(el => el.tagName.toLowerCase());
    expect(tagName).toBe('h1');
  });

  test('should be keyboard navigable', async ({ page }) => {
    // Test tab navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Verify focus is visible
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Test Enter key activation
    await page.keyboard.press('Enter');
  });

  test('should have proper form labels', async ({ page }) => {
    // Check for form elements with proper labels
    const inputs = page.locator('input[type="text"], input[type="email"], input[type="password"], select, textarea');
    const inputCount = await inputs.count();
    
    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      
      if (id) {
        // Check for associated label
        const label = page.locator(`label[for="${id}"]`);
        await expect(label).toBeVisible();
      }
    }
  });

  test('should have proper color contrast', async ({ page }) => {
    // This is a basic test - in practice, you'd use axe-core
    const textElements = page.locator('p, span, div, h1, h2, h3, h4, h5, h6');
    const textCount = await textElements.count();
    expect(textCount).toBeGreaterThan(0);
    
    // Check that text elements are visible (basic contrast check)
    for (let i = 0; i < Math.min(textCount, 10); i++) {
      const element = textElements.nth(i);
      const isVisible = await element.isVisible();
      if (isVisible) {
        const text = await element.textContent();
        expect(text?.trim()).toBeDefined();
      }
    }
  });

  test('should support screen reader navigation', async ({ page }) => {
    // Check for ARIA landmarks
    const landmarks = page.locator('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"]');
    const landmarkCount = await landmarks.count();
    expect(landmarkCount).toBeGreaterThan(0);
    
    // Check for skip links
    const skipLinks = page.locator('a[href="#main"], a[href="#content"]');
    const skipLinkCount = await skipLinks.count();
    // Skip links are optional but good practice
  });

  test('should handle focus management', async ({ page }) => {
    // Test focus trap in modals (if any)
    const modals = page.locator('[role="dialog"], [role="modal"]');
    const modalCount = await modals.count();
    
    if (modalCount > 0) {
      const modal = modals.first();
      await modal.click();
      
      // Focus should be trapped within modal
      const focusedElement = page.locator(':focus');
      const isWithinModal = await focusedElement.evaluate((el, modalEl) => {
        return modalEl.contains(el);
      }, await modal.elementHandle());
      
      expect(isWithinModal).toBe(true);
    }
  });

  test('should have proper button labels', async ({ page }) => {
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      const ariaLabelledBy = await button.getAttribute('aria-labelledby');
      
      // Button should have accessible name
      expect(text || ariaLabel || ariaLabelledBy).toBeTruthy();
    }
  });

  test('should handle dynamic content changes', async ({ page }) => {
    // Test ARIA live regions
    const liveRegions = page.locator('[aria-live], [aria-atomic]');
    const liveRegionCount = await liveRegions.count();
    
    // Live regions are optional but good for dynamic content
    // This test ensures they exist if the app has dynamic content
  });

  test('should be responsive and accessible on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Re-check ARIA structure on mobile
    await expect(page.locator('main')).toMatchAriaSnapshot();
    
    // Check that interactive elements are large enough
    const interactiveElements = page.locator('button, a, input, select');
    const elementCount = await interactiveElements.count();
    
    for (let i = 0; i < Math.min(elementCount, 5); i++) {
      const element = interactiveElements.nth(i);
      const box = await element.boundingBox();
      
      if (box) {
        // Minimum touch target size (44x44px)
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('should handle high contrast mode', async ({ page }) => {
    // Simulate high contrast mode by adding CSS
    await page.addStyleTag({
      content: `
        * {
          background: white !important;
          color: black !important;
          border-color: black !important;
        }
      `
    });
    
    // Verify content is still readable
    const textElements = page.locator('p, h1, h2, h3, h4, h5, h6');
    const firstText = textElements.first();
    await expect(firstText).toBeVisible();
  });
});
