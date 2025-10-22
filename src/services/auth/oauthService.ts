import { API_BASE_URLS } from '@/constants/apiVersions';
import { DevLogger } from '@/lib/logger';
import { IntegrationPlatform } from '@/types/integration';
import { TokenManager } from './TokenManager';
import { OAuthCredentialsService } from './oauthCredentialsService';

// Use window.window.sessionStorage for proper typing

// Production-ready OAuth 2.0 service for all integrations
export interface OAuthConfig {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    scopes: string[];
    authUrl: string;
    tokenUrl: string;
}

export interface OAuthTokens {
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
    expiresAt?: string;
    tokenType: string;
    scope?: string;
}

export interface OAuthState {
    platform: string;
    timestamp: number;
    nonce: string;
    integrationPlatform?: string;
}

export class OAuthService {
    /**
     * Get OAuth configuration from database
     */
    private static async getOAuthConfig(platform: string): Promise<OAuthConfig> {
        try {
            const credentials = await OAuthCredentialsService.getCredentials(platform);
            if (!credentials) {
                // For Google platforms, use public client ID only (no secrets in frontend)
                if (platform === 'googleAds' || platform === 'googleSheets' || platform === 'goHighLevel') {
                    DevLogger.info('OAuthService', `No OAuth credentials in database, using public config for ${platform}`);
                    
                    // Different scopes for different services
                    const scopes = platform === 'googleAds' 
                        ? [
                            'https://www.googleapis.com/auth/adwords',
                            'https://www.googleapis.com/auth/userinfo.email',
                            'https://www.googleapis.com/auth/userinfo.profile'
                          ]
                        : platform === 'googleSheets'
                        ? [
                            'https://www.googleapis.com/auth/spreadsheets',
                            'https://www.googleapis.com/auth/drive.readonly',
                            'https://www.googleapis.com/auth/userinfo.email',
                            'https://www.googleapis.com/auth/userinfo.profile'
                          ]
                        : [
                            'contacts.readonly',
                            'opportunities.readonly',
                            'calendars.readonly',
                            'funnels/funnel.readonly',
                            'funnels/page.readonly',
                            'locations.readonly'
                          ];
                    
                    // Use frontend OAuth callback for GoHighLevel (corrected)
                    const redirectUri = platform === 'goHighLevel' 
                        ? (import.meta.env.VITE_GHL_REDIRECT_URI || 
                           (window.location.hostname === 'localhost' 
                               ? `${window.location.origin}/oauth/ghl-callback`
                               : 'https://reporting.tulenagency.com/oauth/ghl-callback'))
                        : (window.location.hostname === 'localhost' 
                            ? `${window.location.origin}/oauth/callback`
                            : 'https://reporting.tulenagency.com/oauth/callback');
                    
                    return {
                        clientId: platform === 'goHighLevel' 
                            ? import.meta.env.VITE_GHL_CLIENT_ID || ''
                            : import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
                        clientSecret: platform === 'goHighLevel'
                            ? import.meta.env.VITE_GHL_CLIENT_SECRET || ''
                            : import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '', // Required for Google OAuth with PKCE
                        redirectUri: redirectUri,
                        scopes: scopes,
                        authUrl: platform === 'goHighLevel'
                            ? 'https://marketplace.leadconnectorhq.com/oauth/chooselocation'
                            : 'https://accounts.google.com/o/oauth2/v2/auth',
                        tokenUrl: platform === 'goHighLevel'
                            ? 'https://services.leadconnectorhq.com/oauth/token'
                            : 'https://oauth2.googleapis.com/token'
                    };
                }
                throw new Error(`No OAuth credentials found for platform: ${platform}`);
            }

            // Use frontend OAuth callback for all platforms
            const redirectUri = credentials.redirectUri.replace('https://your-domain.com', window.location.origin);

            return {
                clientId: credentials.clientId,
                clientSecret: credentials.clientSecret, // Use client secret from database
                redirectUri: redirectUri,
                scopes: credentials.scopes,
                authUrl: credentials.authUrl,
                tokenUrl: credentials.tokenUrl
            };
        } catch (error) {
            DevLogger.error('OAuthService', `Failed to get OAuth config for ${platform}`, error);
            throw new Error(`Failed to get OAuth configuration for ${platform}: ${error}`);
        }
    }

    /**
     * Generate PKCE code verifier and challenge
     */
    private static async generatePKCE(): Promise<{ codeVerifier: string; codeChallenge: string }> {
        const codeVerifier = this.generateRandomString(128);
        const encoder = new TextEncoder();
        const data = encoder.encode(codeVerifier);
        
        DevLogger.debug('OAuthService', 'Generating PKCE', {
            codeVerifierLength: codeVerifier.length,
            hasCryptoSubtle: !!crypto.subtle
        });
        
        return crypto.subtle.digest('SHA-256', data).then(hash => {
            const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');
            
            DevLogger.debug('OAuthService', 'PKCE generated with crypto.subtle', {
                codeVerifierLength: codeVerifier.length,
                codeChallengeLength: codeChallenge.length
            });
            
            return { codeVerifier, codeChallenge };
        }).catch((error) => {
            DevLogger.warn('OAuthService', 'crypto.subtle failed, using fallback', error);
            // Fallback if crypto.subtle is not available
            const codeChallenge = btoa(codeVerifier)
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');
            return { codeVerifier, codeChallenge };
        });
    }

    /**
     * Generate random string for PKCE
     */
    private static generateRandomString(length: number): string {
        const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        return result;
    }

    /**
     * Generate OAuth authorization URL with PKCE
     */
    static async generateAuthUrl(platform: string, additionalParams: Record<string, string> = {}, integrationPlatform?: string): Promise<string> {
        const config = await this.getOAuthConfig(platform);

        // Debug: Log the redirect URI being used
        DevLogger.debug('OAuthService', `OAuth redirect URI for ${platform}`, { redirectUri: config.redirectUri, origin: window.location.origin });

        const state = this.generateState(platform, integrationPlatform);
        
        // Generate PKCE parameters for Google OAuth
        let pkceParams: { code_challenge?: string; code_challenge_method?: string } = {};
        if (platform === 'googleSheets' || platform === 'googleAds') {
            try {
                const pkce = await this.generatePKCE();
                pkceParams = {
                    code_challenge: pkce.codeChallenge,
                    code_challenge_method: 'S256'
                };
                
                // Store code verifier securely in window.sessionStorage (not localStorage)
                // SessionStorage is cleared when tab closes, reducing XSS attack window
                window.sessionStorage.setItem(`oauth_code_verifier_${platform}`, pkce.codeVerifier);
                
                DevLogger.debug('OAuthService', 'PKCE generated and stored securely', {
                    platform,
                    codeVerifierLength: pkce.codeVerifier.length,
                    codeChallengeLength: pkce.codeChallenge.length,
                    storageKey: `oauth_code_verifier_${platform}`,
                    codeVerifierPreview: pkce.codeVerifier.substring(0, 20) + '...',
                    storageType: 'sessionStorage'
                });
            } catch (error) {
                DevLogger.warn('OAuthService', 'PKCE generation failed, falling back to standard flow', error);
            }
        }

        const params = new URLSearchParams({
            client_id: config.clientId,
            redirect_uri: config.redirectUri,
            response_type: 'code',
            scope: config.scopes.join(' '),
            state: state,
            access_type: 'offline',
            prompt: 'consent',
            ...pkceParams,
            ...additionalParams
        });

        // Store state securely in window.sessionStorage for validation (skip for GoHighLevel)
        if (platform !== 'goHighLevel') {
            window.sessionStorage.setItem(`oauth_state_${platform}`, state);
        }

        const authUrl = `${config.authUrl}?${params.toString()}`;
        DevLogger.debug('OAuthService', 'Generated OAuth URL with PKCE', { 
            platform, 
            authUrl, 
            hasPKCE: !!pkceParams.code_challenge,
            scopes: config.scopes,
            scopeString: config.scopes.join(' '),
            clientId: config.clientId.substring(0, 10) + '...',
            redirectUri: config.redirectUri
        });
        
        return authUrl;
    }

    /**
     * Exchange authorization code for tokens
     */
    static async exchangeCodeForTokens(
        platform: string,
        code: string,
        state: string
    ): Promise<OAuthTokens> {
        const config = await this.getOAuthConfig(platform);

        // Validate state (skip for GoHighLevel - internal app)
        if (platform !== 'goHighLevel') {
            const storedState = window.sessionStorage.getItem(`oauth_state_${platform}`);
            if (!storedState || storedState !== state) {
                DevLogger.error('OAuthService', 'State validation failed', {
                    platform,
                    storedState: storedState ? storedState.substring(0, 20) + '...' : 'none',
                    receivedState: state ? state.substring(0, 20) + '...' : 'none'
                });
                throw new Error('Invalid OAuth state - possible CSRF attack');
            }
        }

        // Prepare token exchange parameters
        const tokenParams: Record<string, string> = {
            client_id: config.clientId,
            code: code,
            grant_type: 'authorization_code',
            redirect_uri: config.redirectUri
        };

        // Add client secret for all platforms (Google OAuth with PKCE still requires client secret)
        if (config.clientSecret) {
            tokenParams.client_secret = config.clientSecret;
            DevLogger.debug('OAuthService', `Using client secret for ${platform} token exchange`, {
                hasClientSecret: !!config.clientSecret,
                clientSecretLength: config.clientSecret.length
            });
        } else {
            DevLogger.warn('OAuthService', `No client secret available for ${platform} - this may cause OAuth errors`);
        }

        // Add PKCE code verifier for Google OAuth platforms only
        if (platform === 'googleSheets' || platform === 'googleAds') {
            const codeVerifier = window.sessionStorage.getItem(`oauth_code_verifier_${platform}`);
            DevLogger.debug('OAuthService', 'PKCE code verifier lookup', {
                platform,
                storageKey: `oauth_code_verifier_${platform}`,
                hasCodeVerifier: !!codeVerifier,
                codeVerifierLength: codeVerifier?.length || 0,
                codeVerifierPreview: codeVerifier ? codeVerifier.substring(0, 20) + '...' : 'MISSING',
                sessionStorageKeys: Object.keys(window.sessionStorage).filter(key => key.includes('oauth'))
            });
            
            if (codeVerifier) {
                // Validate code verifier format
                if (codeVerifier.length < 43 || codeVerifier.length > 128) {
                    DevLogger.error('OAuthService', 'Invalid code verifier length', {
                        length: codeVerifier.length,
                        expectedRange: '43-128'
                    });
                    throw new Error('Invalid PKCE code verifier format');
                }
                
                tokenParams.code_verifier = codeVerifier;
                DevLogger.debug('OAuthService', 'Using PKCE code verifier', {
                    codeVerifierLength: codeVerifier.length,
                    isValidLength: codeVerifier.length >= 43 && codeVerifier.length <= 128
                });
            } else {
                DevLogger.error('OAuthService', 'PKCE code verifier not found in window.sessionStorage', {
                    platform,
                    storageKey: `oauth_code_verifier_${platform}`,
                    availableKeys: Object.keys(window.sessionStorage).filter(key => key.includes('oauth'))
                });
                
                // For Google OAuth, PKCE is required - this is a critical error
                throw new Error('PKCE code verifier not found - OAuth flow may have been interrupted. Please try connecting again.');
            }
        }

        // Add GoHighLevel specific parameters
        if (platform === 'goHighLevel') {
            tokenParams.user_type = 'Location';
        }

        try {
            DevLogger.debug('OAuthService', 'Token exchange parameters', {
                platform,
                clientId: config.clientId,
                hasClientSecret: !!config.clientSecret,
                redirectUri: config.redirectUri,
                tokenUrl: config.tokenUrl,
                paramKeys: Object.keys(tokenParams)
            });

            const response = await fetch(config.tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                body: new URLSearchParams(tokenParams).toString()
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                DevLogger.error('OAuthService', `OAuth token exchange failed for ${platform}`, {
                    status: response.status,
                    statusText: response.statusText,
                    errorData: errorData
                });
                
                // Handle specific OAuth errors
                if (response.status === 401) {
                    throw new Error('OAuth token exchange failed: Invalid credentials or token revoked');
                } else if (response.status === 400) {
                    throw new Error(`OAuth token exchange failed: ${JSON.stringify(errorData)}`);
                } else {
                    throw new Error(`OAuth token exchange failed: ${response.status} ${response.statusText}`);
                }
            }

            const tokens = await response.json();

            // Normalize token response from Google (snake_case to camelCase)
            const normalizedTokens: OAuthTokens = {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                expiresIn: tokens.expires_in,
                tokenType: tokens.token_type,
                scope: tokens.scope
            };

            DevLogger.debug('OAuthService', 'Token normalization', {
                platform,
                originalTokens: {
                    hasAccessToken: !!tokens.access_token,
                    hasRefreshToken: !!tokens.refresh_token,
                    expiresIn: tokens.expires_in,
                    tokenType: tokens.token_type,
                    scope: tokens.scope
                },
                normalizedTokens: {
                    hasAccessToken: !!normalizedTokens.accessToken,
                    hasRefreshToken: !!normalizedTokens.refreshToken,
                    expiresIn: normalizedTokens.expiresIn,
                    tokenType: normalizedTokens.tokenType,
                    scope: normalizedTokens.scope
                }
            });

            // Store tokens using TokenManager (database-only)
            await this.storeTokens(platform, normalizedTokens);

            // Clean up state and PKCE code verifier (skip state cleanup for GoHighLevel)
            if (platform !== 'goHighLevel') {
                window.sessionStorage.removeItem(`oauth_state_${platform}`);
            }
            window.sessionStorage.removeItem(`oauth_code_verifier_${platform}`);

            return normalizedTokens;
        } catch (error) {
            DevLogger.error('OAuthService', `OAuth token exchange failed for ${platform}`, error);
            throw error;
        }
    }

    /**
     * Exchange authorization code for tokens using backend (for Google Ads)
     */
    private static async exchangeCodeForTokensBackend(
        platform: string,
        code: string,
        state: string
    ): Promise<OAuthTokens> {
        DevLogger.info('OAuthService', `Using backend OAuth flow for ${platform}`);

        // Validate state
        const storedState = window.sessionStorage.getItem(`oauth_state_${platform}`);
        if (!storedState || storedState !== state) {
            DevLogger.error('OAuthService', 'State validation failed', {
                platform,
                storedState: storedState ? storedState.substring(0, 20) + '...' : 'none',
                receivedState: state ? state.substring(0, 20) + '...' : 'none'
            });
            throw new Error('Invalid OAuth state - possible CSRF attack');
        }

        try {
            // Call backend OAuth exchange endpoint
            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-ads-oauth-exchange`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({
                    code: code,
                    state: state,
                    platform: platform
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Backend OAuth exchange failed: ${response.status} ${JSON.stringify(errorData)}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(`Backend OAuth exchange failed: ${result.error}`);
            }

            DevLogger.info('OAuthService', `Backend OAuth exchange successful for ${platform}`);
            
            // Clean up state (skip for GoHighLevel)
            if (platform !== 'goHighLevel') {
                window.sessionStorage.removeItem(`oauth_state_${platform}`);
            }
            window.sessionStorage.removeItem(`oauth_code_verifier_${platform}`);

            // Return tokens that will be retrieved from database
            return {
                accessToken: 'backend-stored',
                refreshToken: 'backend-stored',
                tokenType: 'Bearer',
                expiresIn: 3600
            };
        } catch (error) {
            DevLogger.error('OAuthService', `Backend OAuth exchange failed for ${platform}:`, error);
            throw error;
        }
    }

    /**
     * Handle Google Ads OAuth callback
     */
    static async handleGoogleAdsCallback(code: string, state: string): Promise<{
        tokens: OAuthTokens;
        userInfo: {
            googleUserId: string;
            googleUserEmail: string;
            googleUserName: string;
        };
    }> {
        try {
            DevLogger.info('OAuthService', 'Handling Google Ads OAuth callback');

            // Exchange code for tokens using the unified method
            const tokens = await this.exchangeCodeForTokens('googleAds', code, state);

            // Get user info from Google
            DevLogger.debug('OAuthService', 'Fetching user info from Google', {
                accessToken: tokens.accessToken ? tokens.accessToken.substring(0, 20) + '...' : 'MISSING',
                tokenType: tokens.tokenType,
                scope: tokens.scope,
                tokenLength: tokens.accessToken?.length || 0
            });

            // Debug: Try to decode the token to see what scopes it has (for debugging only)
            if (tokens.accessToken) {
                try {
                    const tokenParts = tokens.accessToken.split('.');
                    if (tokenParts.length === 3) {
                        const payload = JSON.parse(atob(tokenParts[1]));
                        DevLogger.debug('OAuthService', 'Token payload analysis', {
                            scopes: payload.scope,
                            audience: payload.aud,
                            issuer: payload.iss,
                            expiresAt: new Date(payload.exp * 1000).toISOString(),
                            issuedAt: new Date(payload.iat * 1000).toISOString()
                        });
                    }
                } catch (error) {
                    DevLogger.warn('OAuthService', 'Could not decode token payload', error);
                }
            }

            const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: {
                    'Authorization': `Bearer ${tokens.accessToken}`,
                    'Accept': 'application/json'
                }
            });

            DevLogger.debug('OAuthService', 'User info response', {
                status: userInfoResponse.status,
                statusText: userInfoResponse.statusText,
                ok: userInfoResponse.ok,
                headers: Object.fromEntries(userInfoResponse.headers.entries())
            });

            if (!userInfoResponse.ok) {
                const errorText = await userInfoResponse.text();
                DevLogger.error('OAuthService', 'Failed to get Google user info', {
                    status: userInfoResponse.status,
                    statusText: userInfoResponse.statusText,
                    errorText: errorText,
                    accessToken: tokens.accessToken ? tokens.accessToken.substring(0, 20) + '...' : 'MISSING',
                    tokenScope: tokens.scope
                });
                throw new Error(`Failed to get user information from Google: ${userInfoResponse.status} ${userInfoResponse.statusText} - ${errorText}`);
            }

            const userInfo = await userInfoResponse.json();
            DevLogger.info('OAuthService', 'Google user info retrieved', {
                googleUserId: userInfo.id,
                email: userInfo.email
            });

            return {
                tokens,
                userInfo: {
                    googleUserId: userInfo.id,
                    googleUserEmail: userInfo.email,
                    googleUserName: userInfo.name
                }
            };
        } catch (error) {
            DevLogger.error('OAuthService', 'Google Ads OAuth callback failed', error);
            throw error;
        }
    }

    /**
     * Refresh access token using refresh token
     */
    static async refreshAccessToken(platform: string): Promise<OAuthTokens> {
        try {
            DevLogger.info('OAuthService', `Refreshing access token for ${platform}`);

            const config = await this.getOAuthConfig(platform);
            const tokens = await this.getStoredTokens(platform);

            if (!tokens?.refreshToken) {
                throw new Error(`No refresh token available for ${platform}`);
            }

            // Make refresh token request to Google's token endpoint
            const refreshParams = new URLSearchParams({
                client_id: config.clientId,
                client_secret: config.clientSecret,
                refresh_token: tokens.refreshToken,
                grant_type: 'refresh_token'
            });

            const response = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                body: refreshParams.toString()
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Token refresh failed: ${response.status} ${JSON.stringify(errorData)}`);
            }

            const newTokens = await response.json();

            // Calculate expiration timestamp (Google tokens expire in 1 hour)
            const expiresAt = new Date(Date.now() + (newTokens.expires_in * 1000)).toISOString();

            // Prepare updated token data
            const updatedTokens = {
                accessToken: newTokens.access_token,
                refreshToken: newTokens.refresh_token || tokens.refreshToken, // Keep existing if not provided
                expiresIn: newTokens.expires_in,
                tokenType: newTokens.token_type || 'Bearer',
                scope: newTokens.scope || tokens.scope,
                expiresAt: expiresAt
            };

            // Store updated tokens directly in database (avoid circular dependency)
            await this.storeTokensDirectly(platform, updatedTokens);

            DevLogger.success('OAuthService', `Token refreshed successfully for ${platform}`);
            return updatedTokens;

        } catch (error) {
            DevLogger.error('OAuthService', `Token refresh failed for ${platform}:`, error);
            throw error;
        }
    }

    /**
     * Refresh access token using backend endpoint
     */
    private static async refreshAccessTokenBackend(platform: string): Promise<OAuthTokens> {
        try {
            DevLogger.info('OAuthService', `Using backend token refresh for ${platform}`);

            const tokens = await this.getStoredTokens(platform);
            if (!tokens?.refreshToken) {
                throw new Error(`No refresh token available for ${platform}`);
            }

            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/token-refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({
                    platform: platform,
                    refreshToken: tokens.refreshToken
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Backend token refresh failed: ${response.status} ${JSON.stringify(errorData)}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(`Backend token refresh failed: ${result.error}`);
            }

            DevLogger.info('OAuthService', `Backend token refresh successful for ${platform}`);
            return result.tokens;
        } catch (error) {
            DevLogger.error('OAuthService', `Backend token refresh failed for ${platform}:`, error);
            throw error;
        }
    }

    /**
     * Get stored tokens for a platform
     */
    static async getStoredTokens(platform: string): Promise<OAuthTokens | null> {
        try {
            // Map platform names to IntegrationPlatform
            const platformMap: Record<string, IntegrationPlatform> = {
                'facebook': 'facebookAds',
                'google': 'googleAds',
                'gohighlevel': 'goHighLevel'
            };

            const integrationPlatform = platformMap[platform] || platform as IntegrationPlatform;
            
            // Direct database query to avoid circular dependency
            const { supabase } = await import('@/lib/supabase');
            const { data: integration, error } = await supabase
                .from('integrations')
                .select('config')
                .eq('platform', integrationPlatform)
                .eq('connected', true)
                .single();

            if (error || !integration) {
                DevLogger.warn('OAuthService', `No stored tokens found for ${platform}`);
                return null;
            }

            const config = integration.config as any;
            if (!config.tokens) {
                DevLogger.warn('OAuthService', `No tokens in config for ${platform}`);
                return null;
            }

            return {
                accessToken: config.tokens.accessToken,
                refreshToken: config.tokens.refreshToken,
                expiresIn: config.tokens.expiresIn,
                tokenType: config.tokens.tokenType || 'Bearer',
                scope: config.tokens.scope,
                expiresAt: config.tokens.expiresAt
            };
        } catch (error) {
            DevLogger.error('OAuthService', `Failed to get stored tokens for ${platform}:`, error);
            return null;
        }
    }

    static async getStoredTokensOld(platform: string): Promise<OAuthTokens | null> {
        try {
            // Map platform names to IntegrationPlatform
            const platformMap: Record<string, IntegrationPlatform> = {
                'facebook': 'facebookAds',
                'google': 'googleAds',
                'gohighlevel': 'goHighLevel'
            };

            const integrationPlatform = platformMap[platform] || platform as IntegrationPlatform;
            
            // For Google platforms, check both googleSheets and googleAds integrations
            if (platform === 'google') {
                // First try googleSheets integration
                const googleSheetsToken = await TokenManager.getAccessToken('googleSheets');
                if (googleSheetsToken) {
                    const refreshToken = await TokenManager.getRefreshToken('googleSheets');
                    return {
                        accessToken: googleSheetsToken,
                        refreshToken: refreshToken || undefined,
                        tokenType: 'Bearer',
                        expiresIn: undefined,
                        scope: undefined
                    };
                }
                
                // Fallback to googleAds integration (shares OAuth with Sheets)
                const googleAdsToken = await TokenManager.getAccessToken('googleAds');
                if (googleAdsToken) {
                    const refreshToken = await TokenManager.getRefreshToken('googleAds');
                    DevLogger.info('OAuthService', 'Using googleAds tokens for Google Sheets access');
                    DevLogger.info('OAuthService', 'Using googleAds tokens for Google Sheets access');
                    return {
                        accessToken: googleAdsToken,
                        refreshToken: refreshToken || undefined,
                        tokenType: 'Bearer',
                        expiresIn: undefined,
                        scope: undefined
                    };
                }
                
                DevLogger.error('OAuthService', 'No Google tokens found for either googleSheets or googleAds');
                DevLogger.error('OAuthService', 'No Google tokens found for either googleSheets or googleAds');
            }
            
            const accessToken = await TokenManager.getAccessToken(integrationPlatform);
            const refreshToken = await TokenManager.getRefreshToken(integrationPlatform);

            if (!accessToken) {
                return null;
            }

            return {
                accessToken,
                refreshToken: refreshToken || undefined,
                tokenType: 'Bearer',
                expiresIn: undefined, // Will be handled by TokenManager
                scope: undefined
            };
        } catch (error) {
            DevLogger.error('OAuthService', `Failed to get stored tokens for ${platform}:`, error);
            return null;
        }
    }

    /**
     * Check if tokens are valid and not expired
     */
    static async isTokenValid(platform: string): Promise<boolean> {
        try {
            const tokens = await this.getStoredTokens(platform);
            if (!tokens?.accessToken) {
                return false;
            }

            // Check if token needs refresh using TokenManager
            const platformMap: Record<string, IntegrationPlatform> = {
                'facebook': 'facebookAds',
                'google': 'googleAds',
                'gohighlevel': 'goHighLevel'
            };

            const integrationPlatform = platformMap[platform] || platform as IntegrationPlatform;
            const needsRefresh = await TokenManager.needsTokenRefresh(integrationPlatform);
            
            return !needsRefresh;
        } catch (error) {
            DevLogger.error('OAuthService', `Failed to validate tokens for ${platform}:`, error);
            return false;
        }
    }

    /**
     * Revoke tokens and clear storage
     */
    static async revokeTokens(platform: string): Promise<void> {
        const tokens = await this.getStoredTokens(platform);

        if (tokens?.accessToken) {
            try {
                // Platform-specific revocation endpoints
                const revokeUrls: Record<string, string> = {
                    facebook: `${API_BASE_URLS.FACEBOOK}/me/permissions?access_token=${tokens.accessToken}`,
                    google: `https://oauth2.googleapis.com/revoke?token=${tokens.accessToken}`,
                    gohighlevel: 'https://services.leadconnectorhq.com/oauth/revoke'
                };

                const revokeUrl = revokeUrls[platform];
                if (revokeUrl) {
                    await fetch(revokeUrl, { method: 'DELETE' });
                }
            } catch (error) {
                DevLogger.error('OAuthService', `Failed to revoke tokens for ${platform}:`, error);
            }
        }

        // Clear stored tokens using TokenManager
        const platformMap: Record<string, IntegrationPlatform> = {
            'facebook': 'facebookAds',
            'google': 'googleAds',
            'gohighlevel': 'goHighLevel'
        };

        const integrationPlatform = platformMap[platform] || platform as IntegrationPlatform;
        await TokenManager.removeTokens(integrationPlatform);
    }

    /**
     * Generate secure state parameter
     */
    private static generateState(platform: string, integrationPlatform?: string): string {
        const timestamp = Date.now();
        const nonce = Math.random().toString(36).substring(2, 15);
        const state: OAuthState = { 
            platform, 
            timestamp, 
            nonce,
            integrationPlatform: integrationPlatform || platform
        };

        return btoa(JSON.stringify(state));
    }

    /**
     * Store tokens directly in database (avoid circular dependency)
     */
    private static async storeTokensDirectly(platform: string, tokens: OAuthTokens): Promise<void> {
        try {
            DevLogger.info('OAuthService', `Storing tokens directly for ${platform}`);

            // Map platform names to IntegrationPlatform
            const platformMap: Record<string, IntegrationPlatform> = {
                'facebook': 'facebookAds',
                'googleAds': 'googleAds',
                'googleSheets': 'googleSheets',
                'gohighlevel': 'goHighLevel'
            };

            const integrationPlatform = platformMap[platform] || platform as IntegrationPlatform;

            // Import supabase directly to avoid circular dependency
            const { supabase } = await import('@/lib/supabase');

            // Get existing integration config
            const { data: existingData, error: fetchError } = await supabase
                .from('integrations')
                .select('config')
                .eq('platform', integrationPlatform)
                .eq('connected', true)
                .single();

            if (fetchError) {
                throw new Error(`Failed to fetch existing config: ${fetchError.message}`);
            }

            // Update the tokens in the existing config
            const existingConfig = existingData.config as any;
            const updatedConfig = {
                ...existingConfig,
                tokens: {
                    ...existingConfig.tokens,
                    ...tokens
                }
            };

            // Update the database
            const { error: updateError } = await supabase
                .from('integrations')
                .update({
                    config: updatedConfig,
                    updated_at: new Date().toISOString()
                })
                .eq('platform', integrationPlatform)
                .eq('connected', true);

            if (updateError) {
                throw new Error(`Failed to update tokens: ${updateError.message}`);
            }

            DevLogger.success('OAuthService', `Tokens stored directly for ${platform}`);
        } catch (error) {
            DevLogger.error('OAuthService', `Failed to store tokens directly for ${platform}:`, error);
            throw error;
        }
    }

    /**
     * Store tokens securely using TokenManager
     */
    private static async storeTokens(platform: string, tokens: OAuthTokens): Promise<void> {
        try {
            DevLogger.info('OAuthService', `Storing tokens for ${platform}:`, {
                hasAccessToken: !!tokens.accessToken,
                hasRefreshToken: !!tokens.refreshToken,
                tokenType: tokens.tokenType,
                expiresIn: tokens.expiresIn
            });
            
            // Map platform names to IntegrationPlatform
            const platformMap: Record<string, IntegrationPlatform> = {
                'facebook': 'facebookAds',
                'googleAds': 'googleAds',
                'googleSheets': 'googleSheets',
                'gohighlevel': 'goHighLevel'
            };

            const integrationPlatform = platformMap[platform] || platform as IntegrationPlatform;

            // Store tokens using TokenManager
            await TokenManager.storeOAuthTokens(integrationPlatform, tokens, {
                id: `${platform}-user`,
                name: `${platform} Account`
            });
            
            DevLogger.success('OAuthService', `Tokens stored successfully for ${platform}`);
        } catch (error) {
            DevLogger.error('OAuthService', `Failed to store tokens for ${platform}:`, error);
            throw error;
        }
    }

    /**
     * Get authorization header for API requests
     */
    static async getAuthHeader(platform: string): Promise<string | null> {
        const tokens = await this.getStoredTokens(platform);
        if (!tokens?.accessToken) {
            return null;
        }

        return `${tokens.tokenType || 'Bearer'} ${tokens.accessToken}`;
    }

    /**
     * Make authenticated API request
     */
    static async makeAuthenticatedRequest(
        platform: string,
        url: string,
        options: RequestInit = {}
    ): Promise<Response> {
        const authHeader = await this.getAuthHeader(platform);
        if (!authHeader) {
            throw new Error(`No valid tokens for ${platform}`);
        }

        const response = await fetch(url, {
            ...options,
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        // Handle token expiration
        if (response.status === 401 && platform !== 'facebook') {
            try {
                await this.refreshAccessToken(platform);
                const newAuthHeader = await this.getAuthHeader(platform);

                if (!newAuthHeader) {
                    throw new Error('Failed to get new auth header after token refresh');
                }

                return fetch(url, {
                    ...options,
                    headers: {
                        'Authorization': newAuthHeader,
                        'Content-Type': 'application/json',
                        ...options.headers
                    }
                });
            } catch (refreshError) {
                DevLogger.error('OAuthService', `Token refresh failed for ${platform}:`, refreshError);
                throw new Error('Authentication failed and token refresh unsuccessful');
            }
        }

        return response;
    }
}
