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

    console.log('🔍 OAuth callback received:', { 
      code: !!code, 
      locationId, 
      clientId,
      fullQuery: query,
      url: req.url,
      method: req.method
    });

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
          user_type: 'Location',
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

    // Validate location ID format
    if (typeof tokenData.locationId !== 'string' || tokenData.locationId.trim() === '') {
      console.error('❌ Invalid location ID format:', tokenData.locationId);
      throw new Error('Invalid location ID format received from GoHighLevel');
    }

    console.log('🔍 Saving token to Supabase...');
    
    // Store per-client token in integrations table
    // Use account_id to identify the specific location
    const { error: saveError } = await supabase
      .from('integrations')
      .upsert({
        platform: 'goHighLevel',
        account_id: tokenData.locationId, // Use locationId as account_id
        connected: true,
        config: {
          tokens: {
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            expiresIn: tokenData.expires_in,
            expiresAt: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
            tokenType: 'Bearer',
            scope: tokenData.scope
          },
          accountInfo: {
            id: tokenData.locationId,
            name: tokenData.locationName || 'GoHighLevel Location'
          },
          locationId: tokenData.locationId,
          userType: tokenData.userType,
          lastSync: new Date().toISOString(),
          syncStatus: 'idle',
          connectedAt: new Date().toISOString()
        }
      }, {
        onConflict: 'platform,account_id' // Use platform + account_id for conflict resolution
      });

    if (saveError) {
      console.error('❌ Error saving token to database:', saveError);
      console.error('❌ Save error details:', JSON.stringify(saveError, null, 2));
      throw new Error(`Failed to save token to database: ${saveError.message}`);
    }

    console.log('✅ Token saved to database successfully');

    // Fetch location name from GoHighLevel API
    let locationName = 'Unknown Location';
    try {
      console.log('🔍 Fetching location name from GoHighLevel API...');
      const locationResponse = await fetch(
        `https://services.leadconnectorhq.com/locations/${tokenData.locationId}`,
        {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (locationResponse.ok) {
        const locationData = await locationResponse.json();
        locationName = locationData.name || locationData.locationName || 'Unknown Location';
        console.log('✅ Location name fetched:', locationName);
      } else {
        console.log('⚠️ Failed to fetch location name, using default');
      }
    } catch (locationError) {
      console.log('⚠️ Error fetching location name:', locationError.message);
    }

    // Update client's GoHighLevel account if we have a clientId in state
    if (state) {
      try {
        // Decode the state parameter to get the actual client ID
        const decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
        const clientId = decodedState.integrationPlatform || decodedState.clientId;
        
        if (clientId && !clientId.startsWith('new_')) {
          console.log('🔍 Updating client GoHighLevel account with locationId:', tokenData.locationId, 'for client:', clientId);
          
          // First get the current client data to merge accounts properly
          const { data: currentClient, error: fetchError } = await supabase
            .from('clients')
            .select('accounts')
            .eq('id', clientId)
            .single();

          if (fetchError) {
            console.error('❌ Error fetching current client data:', fetchError);
          } else {
            // Merge the GoHighLevel account data with existing accounts
            const updatedAccounts = {
              ...currentClient.accounts,
              goHighLevel: {
                locationId: tokenData.locationId,
                locationName: locationName
              }
            };

            const { error: clientUpdateError } = await supabase
              .from('clients')
              .update({
                accounts: updatedAccounts
              })
              .eq('id', clientId);

            if (clientUpdateError) {
              console.error('❌ Error updating client GoHighLevel account:', clientUpdateError);
              // Don't throw error here - token is saved, just client update failed
            } else {
              console.log('✅ Client GoHighLevel account updated successfully');
            }
          }
        }
      } catch (decodeError) {
        console.error('❌ Error decoding state for client update:', decodeError);
      }
    }

    console.log('✅ OAuth flow completed successfully');
    
    // Redirect to the frontend callback page instead of direct redirects
    // This allows the popup to handle the success message properly
    const baseUrl = process.env.APP_URL || process.env.VITE_APP_URL || 'https://tulenreporting.vercel.app';
    
    // Always redirect to the frontend callback page with success parameters
    const callbackUrl = `${baseUrl}/leadconnector/oath?success=true&location=${tokenData.locationId}&location_name=${encodeURIComponent(locationName)}&state=${encodeURIComponent(state || '')}`;
    
    console.log('🔍 Redirecting to frontend callback:', callbackUrl);
    res.redirect(302, callbackUrl);
    
  } catch (error) {
    console.error('❌ OAuth error:', error);
    res.status(500).json({ 
      error: 'OAuth callback failed', 
      message: error.message,
      details: error.toString()
    });
  }
}
