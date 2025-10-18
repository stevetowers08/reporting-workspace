// Playwright-specific test setup
// This avoids conflicts with Vitest/Jest expect matchers

export default async function globalSetup() {
  // Mock global fetch for Playwright tests
  if (typeof globalThis.fetch === 'undefined') {
    globalThis.fetch = async (url: string | URL | Request, init?: RequestInit) => {
      // Simple mock implementation
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    };
  }

  // Mock console methods to reduce noise in tests
  const originalConsole = { ...console };
  globalThis.console = {
    ...originalConsole,
    log: () => {},
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {}
  };

  // Mock environment variables for Playwright
  process.env.VITE_GHL_CLIENT_ID = 'test-client-id';
  process.env.VITE_GHL_CLIENT_SECRET = 'test-client-secret';
  process.env.VITE_APP_URL = 'https://test.example.com';
  process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
  process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key';

  // Mock URLSearchParams for older environments
  if (!globalThis.URLSearchParams) {
    globalThis.URLSearchParams = class URLSearchParams {
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
}
