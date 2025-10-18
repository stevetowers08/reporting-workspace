/**
 * Global Setup for API Tests
 * Runs once before all tests
 */

export default async function globalSetup() {
  console.log('API-TESTS: Setting up global test environment');
  
  try {
    // Verify Supabase connection
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.warn('API-TESTS: Missing Supabase configuration, using defaults');
      process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
      process.env.VITE_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'test-anon-key';
    }
    
    console.log('API-TESTS: Global setup completed successfully');
    
  } catch (error) {
    console.error('API-TESTS: Global setup failed:', error);
    throw error;
  }
}
