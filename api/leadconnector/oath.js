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
      res.status(400).json({ 
        error: 'Token exchange failed', 
        message: tokenData.message || tokenData.error || 'Token exchange failed',
        details: tokenData
      });
      return;
    }

    if (!tokenData.access_token) {
      console.error('❌ No access token in response:', tokenData);
      res.status(400).json({ error: 'No access token received from GoHighLevel' });
      return;
    }

    if (!tokenData.locationId) {
      console.error('❌ No location ID in response:', tokenData);
      res.status(400).json({ error: 'No location ID received from GoHighLevel' });
      return;
    }

    console.log('✅ Token exchange successful, skipping Supabase save for now');
    
    // Return success without saving to Supabase for now
    res.status(200).json({ 
      success: true, 
      message: 'Token exchange successful',
      locationId: tokenData.locationId,
      hasToken: !!tokenData.access_token
    });
    
  } catch (error) {
    console.error('❌ OAuth error:', error);
    res.status(500).json({ 
      error: 'OAuth callback failed', 
      message: error.message,
      details: error.toString()
    });
  }
}