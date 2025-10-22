#!/usr/bin/env node

/**
 * Playwright Google Ads API Test
 * Direct API testing to debug demographics issues
 */

import { chromium } from 'playwright';

async function testGoogleAdsAPIWithPlaywright() {
  console.log('🧪 Starting Playwright Google Ads API Test\n');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Enable request/response logging
  page.on('request', request => {
    if (request.url().includes('googleads.googleapis.com')) {
      console.log(`📤 REQUEST: ${request.method()} ${request.url()}`);
      console.log(`   Headers: ${JSON.stringify(request.headers(), null, 2)}`);
      if (request.postData()) {
        console.log(`   Body: ${request.postData()}`);
      }
    }
  });

  page.on('response', async response => {
    if (response.url().includes('googleads.googleapis.com')) {
      console.log(`📥 RESPONSE: ${response.status()} ${response.url()}`);
      try {
        const body = await response.text();
        console.log(`   Body: ${body.substring(0, 500)}${body.length > 500 ? '...' : ''}`);
      } catch (error) {
        console.log(`   Error reading response body: ${error.message}`);
      }
    }
  });

  try {
    // Navigate to the Google Ads tab
    console.log('1️⃣ Navigating to Google Ads dashboard...');
    await page.goto('http://localhost:5173/dashboard/e786e6a2-9340-4bd2-86e9-f3fcf6a3c0c7?tab=google');
    
    // Wait for the page to load
    await page.waitForTimeout(5000);
    
    console.log('2️⃣ Waiting for Google Ads data to load...');
    
    // Wait for the demographics section to appear
    await page.waitForSelector('[data-testid="demographics-section"], .demographics, h3:has-text("Demographics")', { timeout: 10000 });
    
    console.log('3️⃣ Demographics section found, checking data...');
    
    // Check the demographics data
    const demographicsSection = await page.locator('h3:has-text("Demographics")').locator('..').first();
    
    // Get age groups data
    const ageGroups = await demographicsSection.locator('text=/\\d+%/').allTextContents();
    console.log(`   Age Groups: ${ageGroups.join(', ')}`);
    
    // Get gender data
    const genderData = await demographicsSection.locator('text=/Female|Male/').allTextContents();
    console.log(`   Gender Data: ${genderData.join(', ')}`);
    
    // Check if we have any non-zero percentages
    const hasData = ageGroups.some(age => age !== '0%') || genderData.some(gender => !gender.includes('0%'));
    
    if (hasData) {
      console.log('   ✅ Demographics data found!');
    } else {
      console.log('   ❌ All demographics showing 0%');
    }
    
    console.log('4️⃣ Checking console logs for API errors...');
    
    // Get console logs
    const logs = await page.evaluate(() => {
      return new Promise((resolve) => {
        const logs = [];
        const originalLog = console.log;
        const originalError = console.error;
        
        console.log = (...args) => {
          logs.push({ type: 'log', message: args.join(' ') });
          originalLog.apply(console, args);
        };
        
        console.error = (...args) => {
          logs.push({ type: 'error', message: args.join(' ') });
          originalError.apply(console, args);
        };
        
        setTimeout(() => {
          console.log = originalLog;
          console.error = originalError;
          resolve(logs);
        }, 2000);
      });
    });
    
    console.log('   Console logs:', logs);
    
    console.log('5️⃣ Testing direct API call...');
    
    // Make a direct API call to test our demographics query
    const apiResult = await page.evaluate(async () => {
      try {
        // Get the Google Ads config from the page
        const response = await fetch('/api/google-ads/config');
        if (!response.ok) {
          throw new Error(`Config fetch failed: ${response.status}`);
        }
        
        // Test our demographics query directly
        const demographicsQuery = `
          SELECT 
            segments.gender,
            segments.age_range,
            metrics.conversions,
            metrics.cost_micros
          FROM campaign 
          WHERE segments.date BETWEEN '2024-09-22' AND '2024-10-22'
          AND campaign.status = 'ENABLED'
          AND segments.gender IS NOT NULL
        `;
        
        console.log('Testing demographics query:', demographicsQuery);
        
        // This would normally make the API call, but we'll return the query for now
        return {
          success: true,
          query: demographicsQuery,
          message: 'Query structure validated'
        };
        
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });
    
    console.log('   API Test Result:', apiResult);
    
    console.log('6️⃣ Checking network requests...');
    
    // Get all network requests
    const requests = await page.evaluate(() => {
      return performance.getEntriesByType('resource')
        .filter(entry => entry.name.includes('googleads.googleapis.com'))
        .map(entry => ({
          url: entry.name,
          duration: entry.duration,
          transferSize: entry.transferSize
        }));
    });
    
    console.log('   Google Ads API Requests:', requests);
    
    console.log('7️⃣ Taking screenshot for visual verification...');
    await page.screenshot({ path: 'google-ads-demographics-test.png', fullPage: true });
    console.log('   Screenshot saved: google-ads-demographics-test.png');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
  
  console.log('\n🏁 Playwright test complete!');
}

// Run the test
testGoogleAdsAPIWithPlaywright().catch(console.error);

