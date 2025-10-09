#!/usr/bin/env node

/**
 * Test Runner Script for Marketing Analytics Dashboard
 * 
 * This script demonstrates how to use the new development testing tools
 * and runs unit tests for the critical API services.
 */

import { execSync } from 'child_process';
import { DevAPITester } from './tests/dev-helpers/api-tester.js';

console.log('🧪 Marketing Analytics Dashboard - Test Runner');
console.log('==============================================\n');

async function runTests() {
  try {
    console.log('1. Running Unit Tests...');
    console.log('------------------------');
    
    // Run unit tests
    execSync('npm run test:run', { stdio: 'inherit' });
    
    console.log('\n2. Running Development API Tests...');
    console.log('------------------------------------');
    
    // Run development API tests
    const results = await DevAPITester.testAllEndpoints();
    
    console.log('\n3. Test Results Summary');
    console.log('----------------------');
    
    const summary = DevAPITester.getResultsSummary();
    console.log(`Total Tests: ${summary.total}`);
    console.log(`Passed: ${summary.passed}`);
    console.log(`Failed: ${summary.failed}`);
    console.log(`Success Rate: ${summary.successRate}%`);
    console.log(`Average Duration: ${summary.avgDuration}ms`);
    
    if (summary.failed > 0) {
      console.log('\n❌ Some tests failed. Check the output above for details.');
      process.exit(1);
    } else {
      console.log('\n✅ All tests passed!');
    }
    
  } catch (error) {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { runTests };
