import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  try {
    const { query } = req;
    const code = query.code;
    const locationId = query.location_id;
    const clientId = query.client_id;

    console.log('🔍 OAuth callback received:', { code: !!code, locationId, clientId });

    // Get the state parameter (contains clientId for context)
    const state = query.state;
    console.log('🔍 State parameter (clientId):', state);

    // Check required environment variables
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    const ghlClientId = process.env.GHL_CLIENT_ID || process.env.VITE_GHL_CLIENT_ID;
    const ghlClientSecret = process.env.GHL_CLIENT_SECRET || process.env.VITE_GHL_CLIENT_SECRET;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase environment variables');
      console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
      res.status(500).json({ error: 'Missing Supabase environment variables' });
      return;
    }

    if (!ghlClientId || !ghlClientSecret) {
      console.error('❌ Missing GoHighLevel OAuth credentials');
      console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('GHL')));
      res.status(500).json({ error: 'Missing GoHighLevel OAuth credentials' });
      return;
    }

    if (!code) {
      console.error('❌ No authorization code received');
      res.status(400).json({ error: 'No authorization code received' });
      return;
    }

    console.log('🔍 Starting token exchange...');
    
    // Exchange authorization code for access token
    const tokenResponse = await fetch(
      'https://services.leadconnectorhq.com/oauth/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: ghlClientId,
          client_secret: ghlClientSecret,
          grant_type: 'authorization_code',
          code: code,
          user_type: 'Company',
          redirect_uri: `${process.env.APP_URL || process.env.VITE_APP_URL || 'https://tulenreporting.vercel.app'}/api/leadconnector/oath`
        })
      }
    );

    console.log('🔍 Token exchange response status:', tokenResponse.status);
    
    const tokenData = await tokenResponse.json();
    console.log('🔍 Token exchange response:', { 
      success: tokenResponse.ok, 
      status: tokenResponse.status,
      hasToken: !!tokenData.access_token,
      locationId: tokenData.locationId,
      error: tokenData.error,
      message: tokenData.message
    });

    if (!tokenResponse.ok) {
      console.error('❌ Token exchange failed:', tokenData);
      throw new Error(tokenData.message || tokenData.error || 'Token exchange failed');
    }

    if (!tokenData.access_token) {
      console.error('❌ No access token in response:', tokenData);
      throw new Error('No access token received from GoHighLevel');
    }

    if (!tokenData.locationId) {
      console.error('❌ No location ID in response:', tokenData);
      throw new Error('No location ID received from GoHighLevel');
    }

    console.log('🔍 Saving token to Supabase...');
    
    // Store in Supabase - use upsert with correct constraint (platform is unique)
    const { error: saveError } = await supabase
      .from('integrations')
      .upsert({
        platform: 'goHighLevel',
        account_id: tokenData.locationId,
        account_name: `Location ${tokenData.locationId}`,
        connected: true,
        config: {
          apiKey: {
            apiKey: tokenData.access_token,
            keyType: 'bearer'
          },
          refreshToken: tokenData.refresh_token,
          expiresIn: tokenData.expires_in,
          expiresAt: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
          scopes: tokenData.scope?.split(' ') || [],
          locationId: tokenData.locationId,
          userType: tokenData.userType,
          lastSync: new Date().toISOString(),
          connectedAt: new Date().toISOString()
        }
      }, {
        onConflict: 'platform'
      });

    if (saveError) {
      console.error('❌ Error saving token to database:', saveError);
      console.error('❌ Save error details:', JSON.stringify(saveError, null, 2));
      throw new Error(`Failed to save token to database: ${saveError.message}`);
    }

    console.log('✅ Token saved to database successfully');

    console.log('✅ OAuth flow completed successfully');
    
    // Redirect back to the appropriate page based on state parameter
    const baseUrl = process.env.APP_URL || process.env.VITE_APP_URL || 'https://tulenreporting.vercel.app';
    
    if (state) {
      // If we have a clientId in state, redirect back to client edit page
      res.redirect(302, `${baseUrl}/admin/clients/${state}/edit?connected=true&location=${tokenData.locationId}`);
    } else {
      // Fallback to admin panel
      res.redirect(302, `${baseUrl}/admin?connected=true&location=${tokenData.locationId}`);
    }
    
  } catch (error) {
    console.error('❌ OAuth error:', error);
    res.status(500).json({ 
      error: 'OAuth callback failed', 
      message: error.message,
      details: error.toString()
    });
  }
}
