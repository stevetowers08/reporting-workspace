import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const _supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  try {
    console.log('🔍 Environment Variables Test:');
    console.log('Available env vars:', Object.keys(process.env).filter(k => 
      k.includes('SUPABASE') || k.includes('GHL') || k.includes('APP')
    ));
    
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    const ghlClientId = process.env.GHL_CLIENT_ID || process.env.VITE_GHL_CLIENT_ID;
    const ghlClientSecret = process.env.GHL_CLIENT_SECRET || process.env.VITE_GHL_CLIENT_SECRET;

    console.log('🔍 Environment Variable Status:');
    console.log('SUPABASE_URL:', !!supabaseUrl);
    console.log('SUPABASE_ANON_KEY:', !!supabaseKey);
    console.log('GHL_CLIENT_ID:', !!ghlClientId);
    console.log('GHL_CLIENT_SECRET:', !!ghlClientSecret);

    res.status(200).json({
      success: true,
      message: 'Environment test completed',
      envStatus: {
        supabaseUrl: !!supabaseUrl,
        supabaseKey: !!supabaseKey,
        ghlClientId: !!ghlClientId,
        ghlClientSecret: !!ghlClientSecret
      },
      availableEnvVars: Object.keys(process.env).filter(k => 
        k.includes('SUPABASE') || k.includes('GHL') || k.includes('APP')
      )
    });
    
  } catch (error) {
    console.error('❌ Test error:', error);
    res.status(500).json({ 
      error: 'Test failed', 
      message: error.message
    });
  }
}


