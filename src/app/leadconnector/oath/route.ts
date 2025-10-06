// OAuth callback handler for GoHighLevel at /leadconnector/oath
// File: src/app/leadconnector/oath/route.ts

import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const locationId = searchParams.get('location_id');
  const clientId = searchParams.get('client_id');

  console.log('🔍 OAuth callback received at /leadconnector/oath:', { code: !!code, locationId, clientId });

  if (!code) {
    console.error('❌ No authorization code received');
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/admin/clients?error=no_code`,
      302
    );
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
          client_id: process.env.VITE_GHL_CLIENT_ID || process.env.GHL_CLIENT_ID!,
          client_secret: process.env.VITE_GHL_CLIENT_SECRET || process.env.GHL_CLIENT_SECRET!,
          grant_type: 'authorization_code',
          code: code,
          user_type: 'Company',
          redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL || 'https://tulenreporting.vercel.app'}/leadconnector/oath`
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
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/admin/clients?connected=true&location=${tokenData.locationId}`,
      302
    );

  } catch (error) {
    console.error('❌ OAuth error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/admin/clients?error=connection_failed`,
      302
    );
  }
}
