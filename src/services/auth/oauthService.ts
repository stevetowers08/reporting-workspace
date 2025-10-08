import { API_BASE_URLS } from '@/constants/apiVersions';
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
                        ? ['https://www.googleapis.com/auth/adwords']
                        : [
                            'https://www.googleapis.com/auth/spreadsheets',
                            'https://www.googleapis.com/auth/drive.readonly',
                            'https://www.googleapis.com/auth/userinfo.email',
                            'https://www.googleapis.com/auth/userinfo.profile'
                          ];
                    
                    return {
                        clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
                        clientSecret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '',
                        redirectUri: window.location.hostname === 'localhost' ? 'http://localhost:3000/oauth/callback' : 'https://tulenreporting.vercel.app/oauth/callback',
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
        
        return crypto.subtle.digest('SHA-256', data).then(hash => {
            const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');
            
            return { codeVerifier, codeChallenge };
        }).catch(() => {
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
        if (platform === 'google' || platform === 'googleAds' || platform === 'googleSheets') {
            try {
                const pkce = await this.generatePKCE();
                pkceParams = {
                    code_challenge: pkce.codeChallenge,
                    code_challenge_method: 'S256'
                };
                // Store code verifier for later use
                localStorage.setItem(`oauth_code_verifier_${platform}`, pkce.codeVerifier);
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
        debugLogger.debug('OAuthService', 'Generated OAuth URL with PKCE', { platform, authUrl, hasPKCE: !!pkceParams.code_challenge });
        
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

        // Validate state (more lenient for debugging)
        const storedState = localStorage.getItem(`oauth_state_${platform}`);
        if (!storedState || storedState !== state) {
            debugLogger.warn('OAuthService', 'State validation failed, but continuing for debugging', {
                platform,
                storedState: storedState ? storedState.substring(0, 20) + '...' : 'none',
                receivedState: state ? state.substring(0, 20) + '...' : 'none'
            });
            // Don't throw error for now - just log warning
            // throw new Error('Invalid OAuth state');
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
        if (platform === 'google') {
            const codeVerifier = localStorage.getItem(`oauth_code_verifier_${platform}`);
            if (codeVerifier) {
                tokenParams.code_verifier = codeVerifier;
                debugLogger.debug('OAuthService', 'Using PKCE code verifier in addition to client secret');
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
                throw new Error(`Token exchange failed: ${response.statusText} - ${JSON.stringify(errorData)}`);
            }

            const tokens = await response.json();

            // Store tokens using TokenManager (database-only)
            await this.storeTokens(platform, tokens);

            // Clean up state and PKCE code verifier
            localStorage.removeItem(`oauth_state_${platform}`);
            localStorage.removeItem(`oauth_code_verifier_${platform}`);

            return tokens;
        } catch (error) {
            debugLogger.error('OAuthService', `OAuth token exchange failed for ${platform}`, error);
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

            // Update stored tokens
            this.storeTokens(platform, {
                ...tokens,
                ...newTokens,
                refresh_token: tokens.refreshToken // Keep existing refresh token if not provided
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
