import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load environment variables from .env file
const envContent = readFileSync('.env', 'utf8');
const envLines = envContent.split('\n');
envLines.forEach(line => {
  if (line.trim() && !line.startsWith('#')) {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  }
});

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkGoogleSheetsIntegration() {
  console.log('🔍 Checking Google Sheets integration...');
  
  const { data: integrations, error } = await supabase
    .from('integrations')
    .select('*')
    .eq('platform', 'googleSheets');
    
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log('✅ Google Sheets integrations:', integrations?.length || 0);
  integrations?.forEach(integration => {
    console.log('- Platform:', integration.platform);
    console.log('- Account ID:', integration.account_id);
    console.log('- Connected:', integration.connected);
    console.log('- Has Config:', !!integration.config);
    console.log('- Has Tokens:', !!(integration.config?.tokens));
    console.log('---');
  });
}

checkGoogleSheetsIntegration();
