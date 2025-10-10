// Test configuration for GHL services

import { resolve } from 'path';
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: [
      'tests/unit/services/ghl/**/*.test.ts',
      'tests/integration/ghl/**/*.test.ts'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/services/ghl/**/*.ts'
      ],
      exclude: [
        'src/services/ghl/**/*.test.ts',
        'src/services/ghl/**/*.spec.ts'
      ]
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  }
});
