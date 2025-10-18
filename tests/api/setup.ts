/**
 * API Testing Setup
 * Configures Jest environment for API testing
 */

import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.test' });
config({ path: '.env.local' });
config({ path: '.env' });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
process.env.VITE_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'test-anon-key';

// Global test configuration
beforeAll(async () => {
  console.log('API-TESTS: Starting API test suite');
  
  // Verify required environment variables
  const requiredEnvVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn(`API-TESTS: Missing environment variables: ${missingVars.join(', ')}`);
    console.warn('API-TESTS: Some tests may fail or use default values');
  }
});

afterAll(async () => {
  console.log('API-TESTS: API test suite completed');
});

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('API-TESTS: Unhandled Rejection at:', promise, 'reason:', reason);
});

// Increase timeout for integration tests
jest.setTimeout(30000);
