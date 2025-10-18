/**
 * Global Teardown for API Tests
 * Runs once after all tests
 */

export default async function globalTeardown() {
  console.log('API-TESTS: Cleaning up global test environment');
  
  try {
    // Clean up any global resources
    console.log('API-TESTS: Global teardown completed successfully');
    
  } catch (error) {
    console.error('API-TESTS: Global teardown failed:', error);
  }
}
