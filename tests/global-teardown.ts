import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown...');
  
  // Clean up development server
  const devServer = (global as any).__devServer;
  if (devServer) {
    devServer.kill();
    console.log('✅ Development server stopped');
  }
  
  // Clean up any other global resources
  // Add cleanup logic here as needed
  
  console.log('✅ Global teardown completed');
}

export default globalTeardown;