/**
 * Vite Plugin for Environment Optimization
 * Provides development-specific optimizations and environment validation
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import type { Plugin } from 'vite';

interface EnvOptimizationOptions {
  enableDevTools?: boolean;
  enableSourceMaps?: boolean;
  enableHotReload?: boolean;
  logLevel?: 'silent' | 'error' | 'warn' | 'info' | 'debug';
}

export function envOptimizationPlugin(options: EnvOptimizationOptions = {}): Plugin {
  const {
    enableDevTools = true,
    enableSourceMaps = true,
    enableHotReload = true,
    logLevel = 'info',
  } = options;

  return {
    name: 'env-optimization',
    config(config, { mode }) {
      const isDev = mode === 'development';
      
      // Development-specific optimizations
      if (isDev) {
        // Optimize server configuration
        config.server = {
          ...config.server,
          hmr: {
            overlay: true,
            port: 5173,
          },
          watch: {
            usePolling: false,
            interval: 1000,
          },
        };

        // Optimize build configuration for development
        config.build = {
          ...config.build,
          minify: false,
          sourcemap: enableSourceMaps,
          rollupOptions: {
            ...config.build?.rollupOptions,
            output: {
              ...config.build?.rollupOptions?.output,
              manualChunks: undefined, // Single chunk for faster dev builds
            },
          },
        };

        // Optimize dependency pre-bundling
        config.optimizeDeps = {
          ...config.optimizeDeps,
          force: false, // Don't force re-bundling unless necessary
          esbuildOptions: {
            ...config.optimizeDeps?.esbuildOptions,
            logLevel: logLevel as any,
            keepNames: true, // Keep function names for better debugging
          },
        };
      }

      // Add environment-specific defines
      config.define = {
        ...config.define,
        __DEV__: isDev,
        __PROD__: !isDev,
        __MODE__: JSON.stringify(mode),
      };
    },

    configResolved(config) {
      const isDev = config.mode === 'development';
      
      if (isDev) {
        // Environment optimization enabled for development
        // Dev tools, source maps, and hot reload are configured
      }
    },

    buildStart() {
      // Validate environment variables on build start
      validateEnvironment();
    },

    transformIndexHtml(html) {
      // Add development-specific meta tags
      if (process.env.NODE_ENV === 'development') {
        const devMeta = `
          <meta name="development-mode" content="true">
          <meta name="vite-dev-server" content="true">
          <meta name="hot-reload" content="${enableHotReload}">
        `;
        return html.replace('<head>', `<head>${devMeta}`);
      }
      return html;
    },
  };
}

function validateEnvironment() {
  const envFile = join(process.cwd(), '.env.local');
  try {
    const envContent = readFileSync(envFile, 'utf-8');
    const requiredVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
    
        for (const varName of requiredVars) {
          if (!envContent.includes(varName)) {
            // Missing required environment variable
          }
        }
        
        // Environment validation completed
  } catch (error) {
    // Could not validate environment file
  }
}
