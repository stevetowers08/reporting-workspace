/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_FACEBOOK_ACCESS_TOKEN: string
  readonly VITE_FACEBOOK_CLIENT_ID: string
  readonly VITE_FACEBOOK_CLIENT_SECRET: string
  readonly VITE_GOOGLE_ADS_DEVELOPER_TOKEN: string
  readonly VITE_GOOGLE_CLIENT_ID: string
  readonly VITE_GOOGLE_CLIENT_SECRET: string
  readonly VITE_GHL_CLIENT_ID: string
  readonly VITE_GHL_CLIENT_SECRET: string
  readonly DEV: boolean
  readonly PROD: boolean
  readonly SSR: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Global type declarations
declare global {
  const fetch: typeof globalThis.fetch;
  const setTimeout: typeof globalThis.setTimeout;
  const clearTimeout: typeof globalThis.clearTimeout;
  const setInterval: typeof globalThis.setInterval;
  const clearInterval: typeof globalThis.clearInterval;
}
