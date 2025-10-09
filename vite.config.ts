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
        // Bundle everything together to ensure proper loading order
        manualChunks: undefined,
      },
    },
    // Increase chunk size warning limit since we're bundling everything together
    chunkSizeWarningLimit: 2000,
  },
});