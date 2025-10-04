// Mock environment for tests
export default async function globalSetup() {
  if (typeof import.meta === 'undefined') {
    global.import = global.import || {};
    global.import.meta = global.import.meta || {};
    global.import.meta.env = global.import.meta.env || {};
    global.import.meta.env.VITE_SUPABASE_URL = 'https://bdmcdyxjdkgitphieklb.supabase.co';
    global.import.meta.env.VITE_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbWNkeXhqZGtnaXRwaGlla2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0Mzk3MDYsImV4cCI6MjA3NTAxNTcwNn0.QwmjIXs7PbTi21GGDNd1Z0EQR2R6B_fwYWCXDFeOCPw';
    global.import.meta.env.DEV = false;
  }
}
