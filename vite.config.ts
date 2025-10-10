import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from 'node:url';
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
      // Development optimizations
      force: isDev ? false : false,
      esbuildOptions: {
        target: 'es2020',
        // Development-specific optimizations
        ...(isDev && {
          logLevel: 'info',
          keepNames: true,
        }),
      },
      // Prevent React duplication
      dedupe: ['react', 'react-dom'],
    },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL('./src', import.meta.url)),
      // Ensure React is resolved consistently
      'react': 'react',
      'react-dom': 'react-dom',
    },
  },
    define: {
      global: 'globalThis',
      'process.env': JSON.stringify(process.env),
      'process.env.NODE_ENV': JSON.stringify(mode),
      // Environment-specific defines
      __DEV__: isDev,
      __PROD__: !isDev,
    },
    build: {
      target: 'es2020',
      sourcemap: isDev ? true : 'hidden',
      minify: isDev ? false : 'esbuild',
      rollupOptions: {
        external: [],
        onwarn(warning, warn) {
          // Suppress unreachable code warnings from react-router-dom
          if (warning.code === 'UNREACHABLE_CODE' && warning.message.includes('react-router-dom')) {
            return;
          }
          warn(warning);
        },
        output: {
          // Improved chunking strategy to resolve dynamic import conflicts     
          manualChunks: isDev ? undefined : (id) => {
            // Handle node_modules dependencies
            if (id.includes('node_modules')) {
              // React core - keep React and React-DOM together and ensure single instance
              if (id.includes('react') && !id.includes('react-router')) {
                return 'react-vendor';
              }
              // React Router - separate chunk to avoid conflicts
              if (id.includes('react-router')) {
                return 'router-vendor';
              }
              // Supabase
              if (id.includes('@supabase')) {
                return 'supabase-vendor';
              }
              // Chart libraries
              if (id.includes('chart.js') || id.includes('react-chartjs-2') || id.includes('recharts')) {                                                       
                return 'chart-vendor';
              }
              // PDF libraries (lazy loaded)
              if (id.includes('jspdf') || id.includes('html2canvas')) {
                return 'pdf-vendor';
              }
              // UI libraries
              if (id.includes('@radix-ui') || id.includes('lucide-react')) {    
                return 'ui-vendor';
              }
              // Utility libraries
              if (id.includes('clsx') || id.includes('tailwind-merge') || id.includes('class-variance-authority')) {                                            
                return 'utils-vendor';
              }
              // Monitoring
              if (id.includes('@sentry')) {
                return 'sentry-vendor';
              }
              // Everything else
              return 'vendor';
            }
            
            // Handle source files - group by feature
            if (id.includes('/src/')) {
              // Services
              if (id.includes('/services/')) {
                return 'services';
              }
              // Components
              if (id.includes('/components/')) {
                return 'components';
              }
              // Pages
              if (id.includes('/pages/')) {
                return 'pages';
              }
              // Hooks
              if (id.includes('/hooks/')) {
                return 'hooks';
              }
            }
            
            return null;
          },
        },
      },
      // Increase chunk size warning limit
      chunkSizeWarningLimit: 2000,
    },
  };
});