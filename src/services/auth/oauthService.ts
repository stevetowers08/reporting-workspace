import { API_BASE_URLS } from '@/constants/apiVersions';
/* eslint-disable no-console */
import { debugLogger } from '@/lib/debug';
import { IntegrationPlatform } from '@/types/integration';
import { TokenManager } from './TokenManager';
import { OAuthCredentialsService } from './oauthCredentialsService';

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
                // Fallback to environment variables for Google platforms
                if (platform === 'googleAds' || platform === 'googleSheets') {
                    debugLogger.info('OAuthService', `No OAuth credentials in database, using environment variables for ${platform}`);
                    
                    // Different scopes for different Google services
                    const scopes = platform === 'googleAds' 
                        ? [
                            'https://www.googleapis.com/auth/adwords',
                            'https://www.googleapis.com/auth/userinfo.email',
                            'https://www.googleapis.com/auth/userinfo.profile'
                          ]
                        : [
                            'https://www.googleapis.com/auth/spreadsheets',
                            'https://www.googleapis.com/auth/drive.readonly',
                            'https://www.googleapis.com/auth/userinfo.email',
                            'https://www.googleapis.com/auth/userinfo.profile'
                          ];
                    
                    return {
                        clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
                        clientSecret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '',
                        redirectUri: 'https://tulenreporting.vercel.app/oauth/callback',
                        scopes: scopes,
                        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
                        tokenUrl: 'https://oauth2.googleapis.com/token'
                    };
                }
                throw new Error(`No OAuth credentials found for platform: ${platform}`);
            }

            // Use current origin for redirect URI
            const redirectUri = credentials.redirectUri.replace('https://your-domain.com', window.location.origin);

            return {
                clientId: credentials.clientId,
                clientSecret: credentials.clientSecret,
                redirectUri: redirectUri,
                scopes: credentials.scopes,
                authUrl: credentials.authUrl,
                tokenUrl: credentials.tokenUrl
            };
        } catch (error) {
            debugLogger.error('OAuthService', `Failed to get OAuth config for ${platform}`, error);
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
        
        debugLogger.debug('OAuthService', 'Generating PKCE', {
            codeVerifierLength: codeVerifier.length,
            hasCryptoSubtle: !!crypto.subtle
        });
        
        return crypto.subtle.digest('SHA-256', data).then(hash => {
            const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');
            
            debugLogger.debug('OAuthService', 'PKCE generated with crypto.subtle', {
                codeVerifierLength: codeVerifier.length,
                codeChallengeLength: codeChallenge.length
            });
            
            return { codeVerifier, codeChallenge };
        }).catch((error) => {
            debugLogger.warn('OAuthService', 'crypto.subtle failed, using fallback', error);
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
        debugLogger.debug('OAuthService', `OAuth redirect URI for ${platform}`, { redirectUri: config.redirectUri, origin: window.location.origin });

        const state = this.generateState(platform, integrationPlatform);
        
        // Generate PKCE parameters for Google OAuth
        let pkceParams = {};
        if (platform === 'googleAds' || platform === 'googleSheets') {
            try {
                const pkce = await this.generatePKCE();
                pkceParams = {
                    code_challenge: pkce.codeChallenge,
                    code_challenge_method: 'S256'
                };
                // Store code verifier for later use
                localStorage.setItem(`oauth_code_verifier_${platform}`, pkce.codeVerifier);
                
                debugLogger.debug('OAuthService', 'PKCE generated and stored', {
                    platform,
                    codeVerifierLength: pkce.codeVerifier.length,
                    codeChallengeLength: pkce.codeChallenge.length,
                    storageKey: `oauth_code_verifier_${platform}`,
                    codeVerifierPreview: pkce.codeVerifier.substring(0, 20) + '...',
                    localStorageKeys: Object.keys(localStorage).filter(key => key.includes('oauth'))
                });
            } catch (error) {
                debugLogger.warn('OAuthService', 'PKCE generation failed, falling back to standard flow', error);
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

        // Store state for validation
        localStorage.setItem(`oauth_state_${platform}`, state);

        const authUrl = `${config.authUrl}?${params.toString()}`;
        debugLogger.debug('OAuthService', 'Generated OAuth URL with PKCE', { 
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

        // Validate state
        const storedState = localStorage.getItem(`oauth_state_${platform}`);
        if (!storedState || storedState !== state) {
            debugLogger.error('OAuthService', 'State validation failed', {
                platform,
                storedState: storedState ? storedState.substring(0, 20) + '...' : 'none',
                receivedState: state ? state.substring(0, 20) + '...' : 'none'
            });
            throw new Error('Invalid OAuth state - possible CSRF attack');
        }

        // Prepare token exchange parameters
        const tokenParams: Record<string, string> = {
            client_id: config.clientId,
            code: code,
            grant_type: 'authorization_code',
            redirect_uri: config.redirectUri
        };

        // Add client secret for all platforms
        if (config.clientSecret) {
            tokenParams.client_secret = config.clientSecret;
            debugLogger.debug('OAuthService', `Using client secret for ${platform} token exchange`, {
                hasClientSecret: !!config.clientSecret,
                clientSecretLength: config.clientSecret.length
            });
        } else {
            debugLogger.error('OAuthService', `No client secret found for ${platform}`, {
                platform,
                hasClientSecret: !!config.clientSecret
            });
        }

        // Add PKCE code verifier for Google OAuth (in addition to client secret)
        if (platform === 'googleAds' || platform === 'googleSheets') {
            const codeVerifier = localStorage.getItem(`oauth_code_verifier_${platform}`);
            debugLogger.debug('OAuthService', 'PKCE code verifier lookup', {
                platform,
                storageKey: `oauth_code_verifier_${platform}`,
                hasCodeVerifier: !!codeVerifier,
                codeVerifierLength: codeVerifier?.length || 0,
                codeVerifierPreview: codeVerifier ? codeVerifier.substring(0, 20) + '...' : 'MISSING',
                localStorageKeys: Object.keys(localStorage).filter(key => key.includes('oauth')),
                allLocalStorageKeys: Object.keys(localStorage)
            });
            
            if (codeVerifier) {
                // Validate code verifier format
                if (codeVerifier.length < 43 || codeVerifier.length > 128) {
                    debugLogger.error('OAuthService', 'Invalid code verifier length', {
                        length: codeVerifier.length,
                        expectedRange: '43-128'
                    });
                    throw new Error('Invalid PKCE code verifier format');
                }
                
                tokenParams.code_verifier = codeVerifier;
                debugLogger.debug('OAuthService', 'Using PKCE code verifier in addition to client secret', {
                    codeVerifierLength: codeVerifier.length,
                    isValidLength: codeVerifier.length >= 43 && codeVerifier.length <= 128
                });
            } else {
                debugLogger.error('OAuthService', 'PKCE code verifier not found in localStorage', {
                    platform,
                    storageKey: `oauth_code_verifier_${platform}`,
                    availableKeys: Object.keys(localStorage).filter(key => key.includes('oauth'))
                });
                
                // For Google OAuth, PKCE is required - this is a critical error
                throw new Error('PKCE code verifier not found - OAuth flow may have been interrupted. Please try connecting again.');
            }
        }

        try {
            debugLogger.debug('OAuthService', 'Token exchange parameters', {
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
                debugLogger.error('OAuthService', `OAuth token exchange failed for ${platform}`, {
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

            debugLogger.debug('OAuthService', 'Token normalization', {
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

            // Clean up state and PKCE code verifier
            localStorage.removeItem(`oauth_state_${platform}`);
            localStorage.removeItem(`oauth_code_verifier_${platform}`);

            return normalizedTokens;
        } catch (error) {
            debugLogger.error('OAuthService', `OAuth token exchange failed for ${platform}`, error);
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
            debugLogger.info('OAuthService', 'Handling Google Ads OAuth callback');

            // Exchange code for tokens using the unified method
            const tokens = await this.exchangeCodeForTokens('googleAds', code, state);

            // Get user info from Google
            debugLogger.debug('OAuthService', 'Fetching user info from Google', {
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
                        debugLogger.debug('OAuthService', 'Token payload analysis', {
                            scopes: payload.scope,
                            audience: payload.aud,
                            issuer: payload.iss,
                            expiresAt: new Date(payload.exp * 1000).toISOString(),
                            issuedAt: new Date(payload.iat * 1000).toISOString()
                        });
                    }
                } catch (error) {
                    debugLogger.warn('OAuthService', 'Could not decode token payload', error);
                }
            }

            const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: {
                    'Authorization': `Bearer ${tokens.accessToken}`,
                    'Accept': 'application/json'
                }
            });

            debugLogger.debug('OAuthService', 'User info response', {
                status: userInfoResponse.status,
                statusText: userInfoResponse.statusText,
                ok: userInfoResponse.ok,
                headers: Object.fromEntries(userInfoResponse.headers.entries())
            });

            if (!userInfoResponse.ok) {
                const errorText = await userInfoResponse.text();
                debugLogger.error('OAuthService', 'Failed to get Google user info', {
                    status: userInfoResponse.status,
                    statusText: userInfoResponse.statusText,
                    errorText: errorText,
                    accessToken: tokens.accessToken ? tokens.accessToken.substring(0, 20) + '...' : 'MISSING',
                    tokenScope: tokens.scope
                });
                throw new Error(`Failed to get user information from Google: ${userInfoResponse.status} ${userInfoResponse.statusText} - ${errorText}`);
            }

            const userInfo = await userInfoResponse.json();
            debugLogger.info('OAuthService', 'Google user info retrieved', {
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
            debugLogger.error('OAuthService', 'Google Ads OAuth callback failed', error);
            throw error;
        }
    }

    /**
     * Refresh access token using refresh token
     */
    static async refreshAccessToken(platform: string): Promise<OAuthTokens> {
        const config = await this.getOAuthConfig(platform);
        const tokens = await this.getStoredTokens(platform);

        if (!tokens?.refreshToken) {
            throw new Error(`No refresh token available for ${platform}`);
        }

        const refreshParams = new URLSearchParams({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            refresh_token: tokens.refreshToken,
            grant_type: 'refresh_token'
        });

        try {
            const response = await fetch(config.tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                body: refreshParams.toString()
            });

            if (!response.ok) {
                throw new Error(`Token refresh failed: ${response.statusText}`);
            }

            const newTokens = await response.json();

            // Calculate expiration timestamp
            const expiresAt = newTokens.expires_in 
                ? new Date(Date.now() + (newTokens.expires_in * 1000)).toISOString()
                : undefined;

            // Update stored tokens
            this.storeTokens(platform, {
                ...tokens,
                accessToken: newTokens.access_token,
                refreshToken: newTokens.refresh_token || tokens.refreshToken, // Keep existing refresh token if not provided
                expiresIn: newTokens.expires_in,
                tokenType: newTokens.token_type || tokens.tokenType,
                scope: newTokens.scope || tokens.scope,
                expiresAt: expiresAt
            });

            return newTokens;
        } catch (error) {
            console.error(`Token refresh failed for ${platform}:`, error);
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
                    debugLogger.info('OAuthService', 'Using googleAds tokens for Google Sheets access');
                    console.log('OAuthService: Using googleAds tokens for Google Sheets access');
                    return {
                        accessToken: googleAdsToken,
                        refreshToken: refreshToken || undefined,
                        tokenType: 'Bearer',
                        expiresIn: undefined,
                        scope: undefined
                    };
                }
                
                debugLogger.error('OAuthService', 'No Google tokens found for either googleSheets or googleAds');
                console.error('OAuthService: No Google tokens found for either googleSheets or googleAds');
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
            console.error(`Failed to get stored tokens for ${platform}:`, error);
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
            console.error(`Failed to validate tokens for ${platform}:`, error);
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
                console.error(`Failed to revoke tokens for ${platform}:`, error);
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
     * Store tokens securely using TokenManager
     */
    private static async storeTokens(platform: string, tokens: OAuthTokens): Promise<void> {
        try {
            console.log(`OAuthService.storeTokens() - Storing tokens for ${platform}:`, {
                hasAccessToken: !!tokens.accessToken,
                hasRefreshToken: !!tokens.refreshToken,
                tokenType: tokens.tokenType,
                expiresIn: tokens.expiresIn
            });
            
            // Map platform names to IntegrationPlatform
            const platformMap: Record<string, IntegrationPlatform> = {
                'facebook': 'facebookAds',
                'google': 'googleAds',
                'gohighlevel': 'goHighLevel'
            };

            const integrationPlatform = platformMap[platform] || platform as IntegrationPlatform;

            // Store tokens using TokenManager
            await TokenManager.storeOAuthTokens(integrationPlatform, tokens, {
                id: `${platform}-user`,
                name: `${platform} Account`
            });
            
            console.log(`OAuthService.storeTokens() - Tokens stored successfully for ${platform}`);
        } catch (error) {
            console.error(`Failed to store tokens for ${platform}:`, error);
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
                console.error(`Token refresh failed for ${platform}:`, refreshError);
                throw new Error('Authentication failed and token refresh unsuccessful');
            }
        }

        return response;
    }
}
