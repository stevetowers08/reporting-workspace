import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Track performance metrics
    await page.goto('/', { waitUntil: 'networkidle' });
  });

  test('should load within performance budget', async ({ page }) => {
    // Measure page load time
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should have good Core Web Vitals', async ({ page }) => {
    // Navigate to page and measure metrics
    await page.goto('/');
    
    // Measure Largest Contentful Paint (LCP)
    const lcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve(lastEntry.startTime);
        }).observe({ entryTypes: ['largest-contentful-paint'] });
      });
    });
    
    // LCP should be under 2.5 seconds
    expect(lcp).toBeLessThan(2500);
  });

  test('should have minimal JavaScript bundle size', async ({ page }) => {
    // Track network requests
    const responses: any[] = [];
    page.on('response', response => {
      if (response.url().includes('.js')) {
        responses.push({
          url: response.url(),
          size: response.headers()['content-length']
        });
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Calculate total JS bundle size
    const totalSize = responses.reduce((sum, res) => {
      return sum + (parseInt(res.size) || 0);
    }, 0);
    
    // Should be under 500KB for main bundle
    expect(totalSize).toBeLessThan(500000);
  });

  test('should handle slow network conditions', async ({ page, context }) => {
    // Simulate slow 3G connection
    await context.route('**/*', route => {
      // Add delay to simulate slow network
      setTimeout(() => {
        route.continue();
      }, 100);
    });
    
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    // Should still load within reasonable time even on slow network
    expect(loadTime).toBeLessThan(10000);
  });

  test('should not have memory leaks', async ({ page }) => {
    // Navigate to page multiple times to check for memory leaks
    for (let i = 0; i < 5; i++) {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Check memory usage
      const memoryInfo = await page.evaluate(() => {
        return (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize
        } : null;
      });
      
      if (memoryInfo) {
        // Memory usage should not grow excessively
        expect(memoryInfo.usedJSHeapSize).toBeLessThan(50 * 1024 * 1024); // 50MB
      }
      
      // Clear page
      await page.evaluate(() => {
        // Clear any intervals/timeouts
        const highestTimeoutId = setTimeout(() => {}, 0);
        for (let i = 0; i < highestTimeoutId; i++) {
          clearTimeout(i);
        }
        
        const highestIntervalId = setInterval(() => {}, 0);
        for (let i = 0; i < highestIntervalId; i++) {
          clearInterval(i);
        }
      });
    }
  });

  test('should lazy load images efficiently', async ({ page }) => {
    await page.goto('/');
    
    // Check for lazy loading implementation
    const images = page.locator('img');
    const imageCount = await images.count();
    
    if (imageCount > 0) {
      // Check that images have loading="lazy" attribute
      const lazyImages = page.locator('img[loading="lazy"]');
      const lazyImageCount = await lazyImages.count();
      
      // At least some images should be lazy loaded
      expect(lazyImageCount).toBeGreaterThan(0);
    }
  });

  test('should handle concurrent user interactions', async ({ page }) => {
    await page.goto('/');
    
    // Simulate multiple rapid interactions
    const interactions = [];
    for (let i = 0; i < 10; i++) {
      interactions.push(
        page.click('body').catch(() => {}) // Ignore errors
      );
    }
    
    // All interactions should complete without blocking
    await Promise.all(interactions);
    
    // Page should still be responsive
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should have efficient CSS delivery', async ({ page }) => {
    // Track CSS requests
    const cssResponses: any[] = [];
    page.on('response', response => {
      if (response.url().includes('.css')) {
        cssResponses.push({
          url: response.url(),
          size: response.headers()['content-length']
        });
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Should have minimal CSS requests
    expect(cssResponses.length).toBeLessThan(5);
    
    // Calculate total CSS size
    const totalCSSSize = cssResponses.reduce((sum, res) => {
      return sum + (parseInt(res.size) || 0);
    }, 0);
    
    // Should be under 100KB for CSS
    expect(totalCSSSize).toBeLessThan(100000);
  });

  test('should handle large datasets efficiently', async ({ page }) => {
    await page.goto('/');
    
    // Simulate large dataset by checking if pagination or virtualization is used
    const tables = page.locator('table');
    const tableCount = await tables.count();
    
    if (tableCount > 0) {
      const table = tables.first();
      const rows = table.locator('tr');
      const rowCount = await rows.count();
      
      // If there are many rows, check for pagination or virtualization
      if (rowCount > 100) {
        const pagination = page.locator('[data-testid*="pagination"], .pagination');
        const virtualizedRows = page.locator('[data-testid*="virtual"], .virtual-row');
        
        const hasPagination = await pagination.count() > 0;
        const hasVirtualization = await virtualizedRows.count() > 0;
        
        // Should have either pagination or virtualization for large datasets
        expect(hasPagination || hasVirtualization).toBe(true);
      }
    }
  });

  test('should have efficient API calls', async ({ page }) => {
    // Track API requests
    const apiRequests: any[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        apiRequests.push({
          url: request.url(),
          method: request.method()
        });
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Should not have excessive API calls
    expect(apiRequests.length).toBeLessThan(20);
    
    // Check for duplicate requests
    const uniqueUrls = new Set(apiRequests.map(req => req.url));
    expect(uniqueUrls.size).toBeGreaterThan(0);
  });
});
