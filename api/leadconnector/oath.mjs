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
          user_type: 'Location',
          redirect_uri: `${process.env.APP_URL || process.env.VITE_APP_URL || 'https://tulenreporting.vercel.app'}/oauth/callback`
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

    // Update client's GoHighLevel account if we have a clientId in state
    if (state && !state.startsWith('new_')) {
      console.log('🔍 Updating client GoHighLevel account with locationId:', tokenData.locationId);
      
      // First get the current client data to merge accounts properly
      const { data: currentClient, error: fetchError } = await supabase
        .from('clients')
        .select('accounts')
        .eq('id', state)
        .single();

      if (fetchError) {
        console.error('❌ Error fetching current client data:', fetchError);
      } else {
        // Merge the GoHighLevel account data with existing accounts
        const updatedAccounts = {
          ...currentClient.accounts,
          goHighLevel: {
            locationId: tokenData.locationId,
            locationName: tokenData.locationName || 'GoHighLevel Location'
          }
        };

        const { error: clientUpdateError } = await supabase
          .from('clients')
          .update({
            accounts: updatedAccounts
          })
          .eq('id', state);

        if (clientUpdateError) {
          console.error('❌ Error updating client GoHighLevel account:', clientUpdateError);
          // Don't throw error here - token is saved, just client update failed
        } else {
          console.log('✅ Client GoHighLevel account updated successfully');
        }
      }
    }

    console.log('✅ OAuth flow completed successfully');
    
    // Redirect back to the appropriate page based on state parameter
    const baseUrl = process.env.APP_URL || process.env.VITE_APP_URL || 'https://tulenreporting.vercel.app';
    
    if (state) {
      // Check if this is a new client creation (state starts with 'new_')
      if (state.startsWith('new_')) {
        // For new client creation, redirect back to admin panel with success message
        res.redirect(302, `${baseUrl}/admin?ghl_connected=true&location=${tokenData.locationId}&location_name=${encodeURIComponent(tokenData.locationName || 'Unknown Location')}`);
      } else {
        // If we have an existing clientId in state, redirect back to client edit page
        res.redirect(302, `${baseUrl}/admin/clients/${state}/edit?connected=true&location=${tokenData.locationId}&location_name=${encodeURIComponent(tokenData.locationName || 'Unknown Location')}`);
      }
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
