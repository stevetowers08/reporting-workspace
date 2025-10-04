import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  server: {
    host: "localhost",
    port: 8080,
    strictPort: true,
    open: true,
  },
  plugins: [react({
    jsxRuntime: 'automatic'
  })],
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      '@radix-ui/react-tabs',
      '@tanstack/react-query',
      '@supabase/supabase-js',
      'chart.js',
      'react-chartjs-2'
    ],
    exclude: ['@vite/client', '@vite/env'],
    force: true,
    esbuildOptions: {
      target: 'es2020'
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: 'es2020',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // More granular chunking for better caching and loading performance
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': [
            '@radix-ui/react-tabs', 
            '@radix-ui/react-dialog', 
            '@radix-ui/react-popover', 
            '@radix-ui/react-select',
            '@radix-ui/react-toast',
            '@radix-ui/react-dropdown-menu'
          ],
          'chart-vendor': ['chart.js', 'react-chartjs-2'],
          'api-vendor': ['@supabase/supabase-js', '@tanstack/react-query'],
          'router-vendor': ['react-router-dom'],
          'utils-vendor': ['clsx', 'tailwind-merge', 'class-variance-authority'],
          'icons-vendor': ['lucide-react'],
          'pdf-vendor': ['jspdf', 'html2canvas'],
          'sentry-vendor': ['@sentry/react', '@sentry/tracing']
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
