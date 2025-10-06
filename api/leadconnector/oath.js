const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

module.exports = async function handler(req, res) {
  const { query } = req;
  const code = query.code;
  const locationId = query.location_id;
  const clientId = query.client_id;

  console.log('🔍 OAuth callback received:', { code: !!code, locationId, clientId });

  if (!code) {
    console.error('❌ No authorization code received');
    res.redirect(302, `${process.env.VITE_APP_URL || 'https://tulenreporting.vercel.app'}/admin/clients?error=no_code`);
    return;
  }

  try {
    // Exchange authorization code for access token
    const tokenResponse = await fetch(
      'https://services.leadconnectorhq.com/oauth/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: process.env.VITE_GHL_CLIENT_ID || process.env.GHL_CLIENT_ID,
          client_secret: process.env.VITE_GHL_CLIENT_SECRET || process.env.GHL_CLIENT_SECRET,
          grant_type: 'authorization_code',
          code: code,
          user_type: 'Company',
          redirect_uri: `${process.env.VITE_APP_URL || 'https://tulenreporting.vercel.app'}/api/leadconnector/oath`
        })
      }
    );
    
    const tokenData = await tokenResponse.json();
    console.log('🔍 Token exchange response:', { 
      success: tokenResponse.ok, 
      hasToken: !!tokenData.access_token,
      locationId: tokenData.locationId 
    });

    if (!tokenResponse.ok) {
      throw new Error(tokenData.message || 'Token exchange failed');
    }

    // Store in Supabase
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
      });

    if (saveError) {
      console.error('❌ Error saving token to database:', saveError);
      throw new Error('Failed to save token to database');
    }

    // Fetch location details for display name
    try {
      const locationDetails = await fetch(
        `https://services.leadconnectorhq.com/locations/${tokenData.locationId}`,
        {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'Version': '2021-07-28'
          }
        }
      ).then(r => r.json());

      if (locationDetails.location) {
        // Update with location name
        await supabase
          .from('integrations')
          .update({
            account_name: locationDetails.location.name,
            config: {
              ...tokenData,
              locationName: locationDetails.location.name
            }
          })
          .eq('platform', 'goHighLevel')
          .eq('account_id', tokenData.locationId);
      }
    } catch (locationError) {
      console.warn('⚠️ Could not fetch location details:', locationError);
    }

    console.log('✅ OAuth flow completed successfully');
    
    // Redirect back to dashboard with success
    res.redirect(302, `${process.env.VITE_APP_URL || 'https://tulenreporting.vercel.app'}/admin/clients?connected=true&location=${tokenData.locationId}`);
    
  } catch (error) {
    console.error('❌ OAuth error:', error);
    res.redirect(302, `${process.env.VITE_APP_URL || 'https://tulenreporting.vercel.app'}/admin/clients?error=connection_failed`);
  }
}
