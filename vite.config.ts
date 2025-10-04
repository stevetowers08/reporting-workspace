import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  server: {
    host: "127.0.0.1",
    port: 8086,
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
          vendor: ['react', 'react-dom'],
          charts: ['chart.js', 'react-chartjs-2'],
          ui: ['@radix-ui/react-tabs', '@radix-ui/react-dialog', '@radix-ui/react-popover', '@radix-ui/react-select'],
          supabase: ['@supabase/supabase-js'],
          router: ['react-router-dom'],
          utils: ['clsx', 'tailwind-merge', 'class-variance-authority']
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
      },
    },
  },
});
