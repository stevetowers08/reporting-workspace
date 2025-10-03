import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup...');
  
  // Start the development server if not already running
  const { spawn } = await import('child_process');
  const devServer = spawn('npm', ['run', 'dev'], {
    stdio: 'pipe',
    shell: true,
  });
  
  // Wait for server to be ready
  await new Promise<void>((resolve) => {
    devServer.stdout?.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Local:') || output.includes('localhost')) {
        console.log('✅ Development server is ready');
        resolve();
      }
    });
    
    // Timeout after 30 seconds
    setTimeout(() => {
      console.log('⚠️ Server startup timeout, continuing anyway');
      resolve();
    }, 30000);
  });
  
  // Store server process for cleanup
  (global as any).__devServer = devServer;
  
  console.log('✅ Global setup completed');
}

export default globalSetup;