import { expect, test } from '@playwright/test';

test.describe('AI Insights System', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('should display AI Insights tab in admin panel', async ({ page }) => {
    // Navigate directly to admin panel
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Check if AI Insights tab exists
    const aiInsightsTab = page.locator('[data-testid="ai-insights-tab"]');
    await expect(aiInsightsTab).toBeVisible();

    // Click on AI Insights tab
    await aiInsightsTab.click();

    // Verify AI Insights admin content is displayed
    await expect(page.locator('text=AI Insights Configuration')).toBeVisible();
    await expect(page.locator('text=System Prompt Configuration')).toBeVisible();
  });

  test('should allow creating and managing system prompts', async ({ page }) => {
    // Navigate to admin panel and AI Insights tab
    await page.click('text=Admin');
    await page.waitForLoadState('networkidle');
    await page.click('[data-testid="ai-insights-tab"]');

    // Click "Create New Prompt" button
    await page.click('text=Create New Prompt');

    // Fill in the prompt form
    await page.fill('[data-testid="prompt-name"]', 'Marketing Analytics Prompt');
    await page.fill('[data-testid="prompt-text"]', 'You are a marketing analytics expert. Analyze the provided data and generate actionable insights.');

    // Save the prompt
    await page.click('text=Save Prompt');

    // Verify the prompt was created
    await expect(page.locator('text=Marketing Analytics Prompt')).toBeVisible();
  });

  test('should test AI connection', async ({ page }) => {
    // Navigate to admin panel and AI Insights tab
    await page.click('text=Admin');
    await page.waitForLoadState('networkidle');
    await page.click('[data-testid="ai-insights-tab"]');

    // Click "Test Connection" button
    await page.click('text=Test Connection');

    // Wait for connection test result
    await page.waitForSelector('[data-testid="connection-status"]', { timeout: 10000 });

    // Verify connection is successful
    const connectionStatus = page.locator('[data-testid="connection-status"]');
    await expect(connectionStatus).toContainText('Connected');
  });

  test('should configure AI insights for clients', async ({ page }) => {
    // Navigate to admin panel
    await page.click('text=Admin');
    await page.waitForLoadState('networkidle');

    // Click on a client to edit
    const firstClient = page.locator('[data-testid="client-card"]').first();
    await firstClient.click();

    // Click edit button
    await page.click('text=Edit');

    // Scroll to AI Insights Configuration section
    await page.locator('text=AI Insights Configuration').scrollIntoViewIfNeeded();

    // Enable AI insights
    await page.click('[data-testid="ai-insights-enabled"]');

    // Set frequency to weekly
    await page.selectOption('[data-testid="ai-frequency"]', 'weekly');

    // Save changes
    await page.click('text=Save Changes');

    // Verify success message
    await expect(page.locator('text=Client updated successfully')).toBeVisible();
  });

  test('should display AI Insights in client dashboard', async ({ page }) => {
    // Navigate to admin panel first to see clients
    await page.click('text=Admin');
    await page.waitForLoadState('networkidle');

    // Check if there are any clients
    const clientCards = page.locator('[data-testid="client-card"]');
    const clientCount = await clientCards.count();
    
    if (clientCount > 0) {
      // Click on the first client to go to dashboard
      await clientCards.first().click();
      await page.waitForLoadState('networkidle');

      // Check if AI Insights tab exists
      const aiInsightsTab = page.locator('text=AI Insights');
      await expect(aiInsightsTab).toBeVisible();

      // Click on AI Insights tab
      await aiInsightsTab.click();

      // Verify AI insights content is displayed
      await expect(page.locator('text=AI-Generated Insights')).toBeVisible();
      await expect(page.locator('text=Refresh Insights')).toBeVisible();
    } else {
      // Skip test if no clients exist
      test.skip();
    }
  });

  test('should generate AI insights manually', async ({ page }) => {
    // Navigate to admin panel first to see clients
    await page.click('text=Admin');
    await page.waitForLoadState('networkidle');

    // Check if there are any clients
    const clientCards = page.locator('[data-testid="client-card"]');
    const clientCount = await clientCards.count();
    
    if (clientCount > 0) {
      // Click on the first client to go to dashboard
      await clientCards.first().click();
      await page.waitForLoadState('networkidle');
      await page.click('text=AI Insights');

      // Click "Refresh Insights" button
      await page.click('[data-testid="refresh-insights-btn"]');

      // Wait for insights to generate
      await page.waitForSelector('[data-testid="insights-loading"]', { timeout: 5000 });
      await page.waitForSelector('[data-testid="insights-content"]', { timeout: 30000 });

      // Verify insights are displayed
      const insightsContent = page.locator('[data-testid="insights-content"]');
      await expect(insightsContent).toBeVisible();
      await expect(insightsContent).toContainText('Summary');
      await expect(insightsContent).toContainText('Recommendations');
    } else {
      // Skip test if no clients exist
      test.skip();
    }
  });

  test('should handle AI connection errors gracefully', async ({ page }) => {
    // Navigate to admin panel and AI Insights tab
    await page.click('text=Admin');
    await page.waitForLoadState('networkidle');
    await page.click('[data-testid="ai-insights-tab"]');

    // Mock API failure by intercepting the request
    await page.route('**/generativelanguage.googleapis.com/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'API Error' })
      });
    });

    // Click "Test Connection" button
    await page.click('text=Test Connection');

    // Wait for error message
    await page.waitForSelector('[data-testid="connection-error"]', { timeout: 10000 });

    // Verify error is displayed
    const errorMessage = page.locator('[data-testid="connection-error"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('Failed to connect');
  });

  test('should validate system prompt form', async ({ page }) => {
    // Navigate to admin panel and AI Insights tab
    await page.click('text=Admin');
    await page.waitForLoadState('networkidle');
    await page.click('[data-testid="ai-insights-tab"]');

    // Click "Create New Prompt" button
    await page.click('text=Create New Prompt');

    // Try to save without filling required fields
    await page.click('text=Save Prompt');

    // Verify validation errors
    await expect(page.locator('text=Name is required')).toBeVisible();
    await expect(page.locator('text=Prompt text is required')).toBeVisible();
  });

  test('should display AI insights history', async ({ page }) => {
    // Navigate to admin panel first to see clients
    await page.click('text=Admin');
    await page.waitForLoadState('networkidle');

    // Check if there are any clients
    const clientCards = page.locator('[data-testid="client-card"]');
    const clientCount = await clientCards.count();
    
    if (clientCount > 0) {
      // Click on the first client to go to dashboard
      await clientCards.first().click();
      await page.waitForLoadState('networkidle');
      await page.click('text=AI Insights');

      // Check if insights history is displayed
      const historySection = page.locator('[data-testid="insights-history"]');
      await expect(historySection).toBeVisible();

      // Verify history items have proper structure
      const historyItems = page.locator('[data-testid="history-item"]');
      const count = await historyItems.count();
      
      if (count > 0) {
        const firstItem = historyItems.first();
        await expect(firstItem).toContainText('Generated');
        await expect(firstItem).toContainText('Period');
      }
    } else {
      // Skip test if no clients exist
      test.skip();
    }
  });

  test('should handle empty AI insights state', async ({ page }) => {
    // Navigate to admin panel first to see clients
    await page.click('text=Admin');
    await page.waitForLoadState('networkidle');

    // Check if there are any clients
    const clientCards = page.locator('[data-testid="client-card"]');
    const clientCount = await clientCards.count();
    
    if (clientCount > 0) {
      // Click on the first client to go to dashboard
      await clientCards.first().click();
      await page.waitForLoadState('networkidle');
      await page.click('text=AI Insights');

      // Check if empty state is handled properly
      const emptyState = page.locator('[data-testid="empty-insights"]');
      if (await emptyState.isVisible()) {
        await expect(emptyState).toContainText('No insights generated yet');
        await expect(emptyState).toContainText('Generate your first insights');
      }
    } else {
      // Skip test if no clients exist
      test.skip();
    }
  });
});
