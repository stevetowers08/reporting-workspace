import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from 'node:url';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, loadEnv } from "vite";
import { envOptimizationPlugin } from './src/plugins/envOptimization';

// Extend NodeJS.ProcessEnv to include ANALYZE
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      ANALYZE?: string;
    }
  }
}

// Define process for Vite config
// eslint-disable-next-line no-undef
declare const process: NodeJS.Process;

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables
  const _env = loadEnv(mode, process.cwd(), '');
  
  // Development optimizations
  const isDev = mode === 'development';
  
  return {
    base: '/',
    server: {
      host: "0.0.0.0",
      port: 5173,
      strictPort: true,
      open: true,
      // Optimize for development
      hmr: {
        overlay: true,
        port: 5173,
      },
      // Faster file watching
      watch: {
        usePolling: false,
        interval: 1000,
      },
    },
    plugins: [
      // Environment optimization plugin
      envOptimizationPlugin({
        enableDevTools: isDev,
        enableSourceMaps: isDev,
        enableHotReload: isDev,
        logLevel: isDev ? 'info' : 'warn',
      }),
      react({
        jsxRuntime: 'automatic',
        jsxImportSource: 'react',
        // Development optimizations
        ...(isDev && {
          fastRefresh: true,
          babel: {
            plugins: [
              // Add development-specific babel plugins if needed
            ],
          },
        }),
      }),
      // Bundle analyzer - only in analyze mode
      process.env.ANALYZE && visualizer({
        filename: 'dist/bundle-analysis.html',
        open: true,
        gzipSize: true,
        brotliSize: true,
      })
    ].filter(Boolean),
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        '@tanstack/react-query',
        '@supabase/supabase-js',
        'chart.js',
        'react-chartjs-2',
        'react-router-dom',
        '@sentry/react',
        'clsx',
        'tailwind-merge',
        'class-variance-authority',
        'lucide-react',
        '@radix-ui/react-slot',
        '@radix-ui/react-primitive',
      ],
      exclude: ['@vite/client', '@vite/env'],
      // Force optimization to prevent React conflicts
      force: isDev ? false : false,
      esbuildOptions: {
        target: 'es2020',
        // Development-specific optimizations
        ...(isDev && {
          logLevel: 'info',
          keepNames: true,
        }),
      },
      // Aggressive deduplication to prevent multiple React instances
      dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
    },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL('./src', import.meta.url)),
      'react': path.resolve('./node_modules/react'),
      'react-dom': path.resolve('./node_modules/react-dom'),
    },
    mainFields: ['browser', 'module', 'jsnext:main', 'main'],
    dedupe: ['react', 'react-dom']
  },
    define: {
      global: 'globalThis',
      'process.env': JSON.stringify(process.env),
      'process.env.NODE_ENV': JSON.stringify('production'),
      // Environment-specific defines
      __DEV__: isDev,
      __PROD__: !isDev,
    },
    build: {
      target: 'es2020',
      sourcemap: isDev ? true : 'hidden',
      minify: isDev ? false : 'esbuild',
        rollupOptions: {
        // Ensure React is NOT externalized - it must be bundled
        external: [],
        onwarn(warning, warn) {
          // Suppress unreachable code warnings from react-router-dom
          if (warning.code === 'UNREACHABLE_CODE' && warning.message.includes('react-router-dom')) {                                                            
            return;
          }
          // Suppress React warnings
          if (warning.code === 'CIRCULAR_DEPENDENCY' && warning.message.includes('react')) {
            return;
          }
          warn(warning);
        },
        output: {
          // ✅ SIMPLEST FIX: Let Vite handle chunking automatically
          // This prevents React-dependent libraries from being split into separate chunks
          manualChunks: undefined
        },
      },
      // Increase chunk size warning limit
      chunkSizeWarningLimit: 2000,
    },
  };
});