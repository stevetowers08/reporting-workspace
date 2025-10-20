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
        // Ensure recharts dependency is optimized and available during build
        'react-is',
      ],
      exclude: ['@vite/client', '@vite/env'],
      // Force optimization to prevent React conflicts
      force: true,
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
      // Ensure React is always resolved consistently
      'react/jsx-runtime': path.resolve('./node_modules/react/jsx-runtime'),
      'react/jsx-dev-runtime': path.resolve('./node_modules/react/jsx-dev-runtime'),
      // Help Rollup/Vite resolve transitive dependency from recharts
      'react-is': path.resolve('./node_modules/react-is'),
    },
    mainFields: ['browser', 'module', 'jsnext:main', 'main'],
    dedupe: ['react', 'react-dom', 'react-is'],
    // Prevent circular dependencies
    preserveSymlinks: false,
    // Ensure consistent module resolution
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
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
      minify: 'esbuild', // Use esbuild for faster builds
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
          // Suppress TDZ warnings that can cause production issues
          if (warning.code === 'CIRCULAR_DEPENDENCY') {
            return;
          }
          warn(warning);
        },
        output: {
          // Aggressive chunking to reduce individual chunk sizes
          manualChunks: (id) => {
            // Split large vendor libraries
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom')) {
                return 'react';
              }
              if (id.includes('@supabase')) {
                return 'supabase';
              }
              if (id.includes('chart.js') || id.includes('recharts')) {
                return 'charts';
              }
              if (id.includes('@radix-ui')) {
                return 'radix';
              }
              if (id.includes('@tanstack')) {
                return 'tanstack';
              }
              if (id.includes('axios') || id.includes('lodash')) {
                return 'utils';
              }
              return 'vendor';
            }
            // Split app code into smaller chunks
            if (id.includes('src/pages/')) {
              const pageName = id.split('/').pop()?.replace('.tsx', '') || 'page';
              return `page-${pageName}`;
            }
            if (id.includes('src/components/dashboard/')) {
              return 'dashboard';
            }
            if (id.includes('src/components/agency/')) {
              return 'agency';
            }
            if (id.includes('src/services/api/')) {
              return 'api-services';
            }
            if (id.includes('src/services/auth/')) {
              return 'auth-services';
            }
            return 'app';
          },
          // Prevent variable name conflicts in minified code
          format: 'es',
          // Ensure proper initialization order
          hoistTransitiveImports: false,
          // Prevent TDZ by ensuring proper module order
          preserveModules: false,
          // Use consistent chunk naming
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
        },
      },
      // Reduce chunk size warning limit to force optimization
      chunkSizeWarningLimit: 1000,
      // Prevent TDZ issues in production
      commonjsOptions: {
        include: [/node_modules/],
        transformMixedEsModules: true,
      },
    },
  };
});