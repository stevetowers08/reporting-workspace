// Test setup for GHL services

import { vi } from 'vitest';

// Mock global fetch
global.fetch = vi.fn();

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

// Mock environment variables
vi.stubEnv('VITE_GHL_CLIENT_ID', 'test-client-id');
vi.stubEnv('VITE_GHL_CLIENT_SECRET', 'test-client-secret');
vi.stubEnv('VITE_APP_URL', 'https://test.example.com');
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('SUPABASE_ANON_KEY', 'test-anon-key');

// Mock URLSearchParams for older environments
if (!global.URLSearchParams) {
  global.URLSearchParams = class URLSearchParams {
    private params: Map<string, string> = new Map();

    constructor(init?: string | Record<string, string>) {
      if (typeof init === 'string') {
        // Parse query string
        init.split('&').forEach(pair => {
          const [key, value] = pair.split('=');
          if (key) {
            this.params.set(decodeURIComponent(key), decodeURIComponent(value || ''));
          }
        });
      } else if (init) {
        Object.entries(init).forEach(([key, value]) => {
          this.params.set(key, value);
        });
      }
    }

    append(name: string, value: string) {
      this.params.set(name, value);
    }

    toString() {
      return Array.from(this.params.entries())
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
    }
  };
}