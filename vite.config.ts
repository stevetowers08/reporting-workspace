import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from 'node:url';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from "vite";

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
export default defineConfig({
  base: '/',
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    open: true,
  },
  plugins: [
    react({
      jsxRuntime: 'automatic'
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
    force: false,
    esbuildOptions: {
      target: 'es2020'
    }
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  define: {
    global: 'globalThis',
    'process.env': JSON.stringify(process.env),
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  build: {
    target: 'es2020',
    sourcemap: true,
    rollupOptions: {
      external: [],
      output: {
        globals: {
          'react': 'React',
          'react-dom': 'ReactDOM'
        },
        manualChunks: (id) => {
          // Core React libraries
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react-vendor';
          }
          
          // UI Components - keep together for better caching
          if (id.includes('@radix-ui')) {
            return 'ui-vendor';
          }
          
          // Chart libraries - separate for lazy loading
          if (id.includes('chart.js') || id.includes('react-chartjs-2')) {
            return 'chart-vendor';
          }
          
          // PDF export - only load when needed
          if (id.includes('jspdf') || id.includes('html2canvas')) {
            return 'pdf-vendor';
          }
          
          // API and data libraries
          if (id.includes('@supabase') || id.includes('@tanstack/react-query')) {
            return 'api-vendor';
          }
          
          // Router
          if (id.includes('react-router')) {
            return 'router-vendor';
          }
          
          // Utility libraries
          if (id.includes('clsx') || id.includes('tailwind-merge') || id.includes('class-variance-authority')) {
            return 'utils-vendor';
          }
          
          // Icons
          if (id.includes('lucide-react')) {
            return 'icons-vendor';
          }
          
          // Sentry monitoring
          if (id.includes('@sentry')) {
            return 'sentry-vendor';
          }
          
          // Large vendor libraries
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    chunkSizeWarningLimit: 1000,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'], // Remove console logs in production
      },
    },
    // Enable gzip compression
    reportCompressedSize: true,
    // Optimize for production
    cssCodeSplit: true,
    assetsInlineLimit: 4096, // Inline assets smaller than 4kb
  },
});
