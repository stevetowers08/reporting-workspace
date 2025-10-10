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
    },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL('./src', import.meta.url)),
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
      // Development optimizations
      minify: isDev ? false : 'esbuild',
      rollupOptions: {
        external: [],
        output: {
          // Bundle everything together to ensure proper loading order
          manualChunks: isDev ? undefined : {
            vendor: ['react', 'react-dom'],
            supabase: ['@supabase/supabase-js'],
            charts: ['chart.js', 'react-chartjs-2'],
            ui: ['@radix-ui/react-slot', '@radix-ui/react-primitive', 'lucide-react'],
          },
        },
      },
      // Increase chunk size warning limit since we're bundling everything together
      chunkSizeWarningLimit: 2000,
      // Development optimizations
      ...(isDev && {
        rollupOptions: {
          output: {
            manualChunks: undefined,
          },
        },
      }),
    },
  };
});