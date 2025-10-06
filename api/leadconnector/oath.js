const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

module.exports = async function handler(req, res) {
  try {
    const { query } = req;
    const code = query.code;
    const locationId = query.location_id;
    const clientId = query.client_id;

    console.log('🔍 OAuth callback received:', { code: !!code, locationId, clientId });

    // Check required environment variables
    if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
      console.error('❌ Missing Supabase environment variables');
      res.status(500).json({ error: 'Missing Supabase environment variables' });
      return;
    }

    if (!process.env.VITE_GHL_CLIENT_ID || !process.env.VITE_GHL_CLIENT_SECRET) {
      console.error('❌ Missing GoHighLevel OAuth credentials');
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
          client_id: process.env.VITE_GHL_CLIENT_ID,
          client_secret: process.env.VITE_GHL_CLIENT_SECRET,
          grant_type: 'authorization_code',
          code: code,
          user_type: 'Company',
          redirect_uri: `${process.env.VITE_APP_URL || 'https://tulenreporting.vercel.app'}/api/leadconnector/oath`
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
    
    // Store in Supabase - use insert with on_conflict for proper upsert
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
        onConflict: 'platform,account_id'
      });

    if (saveError) {
      console.error('❌ Error saving token to database:', saveError);
      console.error('❌ Save error details:', JSON.stringify(saveError, null, 2));
      throw new Error(`Failed to save token to database: ${saveError.message}`);
    }

    console.log('✅ Token saved to database successfully');

    console.log('✅ OAuth flow completed successfully');
    
    // Redirect back to dashboard with success
    res.redirect(302, `${process.env.VITE_APP_URL || 'https://tulenreporting.vercel.app'}/admin/clients?connected=true&location=${tokenData.locationId}`);
    
  } catch (error) {
    console.error('❌ OAuth error:', error);
    res.status(500).json({ 
      error: 'OAuth callback failed', 
      message: error.message,
      details: error.toString()
    });
  }
}
