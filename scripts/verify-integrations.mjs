import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

function env(name) {
  const val = process.env[name];
  if (!val) throw new Error(`Missing env: ${name}`);
  return val;
}

const url = env('SUPABASE_URL');
const anon = env('SUPABASE_ANON_KEY');

const supabase = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function checkDb() {
  const { data, error } = await supabase.from('clients').select('*').limit(1);
  if (error) throw new Error(`DB query failed: ${error.message}`);
  console.log('DB OK. clients sample count:', Array.isArray(data) ? data.length : 0);
}

async function checkAuth() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(`auth.getSession error: ${error.message}`);
  console.log('Auth OK. Has session?', !!data?.session);
}

async function checkFunction() {
  const { data, error } = await supabase.functions.invoke('integrations', { body: { method: 'GET' } });
  if (error) throw new Error(`Function invoke failed: ${error.message}`);
  console.log('Edge Function OK. Keys:', data ? Object.keys(data) : []);
}

async function checkRealtime() {
  const channel = supabase.channel('verify');
  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log('Realtime OK (subscribed)');
      channel.unsubscribe();
    }
  });
  await new Promise((res) => setTimeout(res, 3000));
}

async function main() {
  await checkDb();
  await checkAuth();
  await checkFunction();
  await checkRealtime();
  console.log('All checks completed.');
}

main().catch((e) => {
  console.error('Verification failed:', e);
  process.exit(1);
});


