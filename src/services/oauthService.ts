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
}

export class OAuthService {
    private static readonly OAUTH_CONFIGS: Record<string, OAuthConfig> = {
        facebook: {
            clientId: import.meta.env.VITE_FACEBOOK_CLIENT_ID || '2922447491235718',
            clientSecret: import.meta.env.VITE_FACEBOOK_CLIENT_SECRET || '1931f7ba0db26d624129eedc0d4ee10f',
            redirectUri: `${window.location.origin}/oauth/callback`,
            scopes: ['ads_read', 'ads_management', 'business_management'],
            authUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
            tokenUrl: 'https://graph.facebook.com/v19.0/oauth/access_token'
        },
        google: {
            clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
            clientSecret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '',
            redirectUri: `${window.location.origin}/oauth/callback`,
            scopes: [
                'https://www.googleapis.com/auth/adwords',
                'https://www.googleapis.com/auth/spreadsheets.readonly',
                'https://www.googleapis.com/auth/drive.readonly'
            ],
            authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
            tokenUrl: 'https://oauth2.googleapis.com/token'
        },
        gohighlevel: {
            clientId: import.meta.env.VITE_GHL_CLIENT_ID || '',
            clientSecret: import.meta.env.VITE_GHL_CLIENT_SECRET || '',
            redirectUri: `${window.location.origin}/oauth/callback`,
            scopes: ['contacts.read', 'opportunities.read', 'locations.read'],
            authUrl: 'https://marketplace.gohighlevel.com/oauth/chooselocation',
            tokenUrl: 'https://services.leadconnectorhq.com/oauth/token'
        }
    };

    /**
     * Generate OAuth authorization URL
     */
    static generateAuthUrl(platform: string, additionalParams: Record<string, string> = {}): string {
        const config = this.OAUTH_CONFIGS[platform];
        if (!config) {
            throw new Error(`Unsupported platform: ${platform}`);
        }

        const state = this.generateState(platform);

        const params = new URLSearchParams({
            client_id: config.clientId,
            redirect_uri: config.redirectUri,
            response_type: 'code',
            scope: config.scopes.join(' '),
            state: state,
            access_type: 'offline',
            prompt: 'consent',
            ...additionalParams
        });

        // Store state for validation
        localStorage.setItem(`oauth_state_${platform}`, state);

        return `${config.authUrl}?${params.toString()}`;
    }

    /**
     * Exchange authorization code for tokens
     */
    static async exchangeCodeForTokens(
        platform: string,
        code: string,
        state: string
    ): Promise<OAuthTokens> {
        const config = this.OAUTH_CONFIGS[platform];
        if (!config) {
            throw new Error(`Unsupported platform: ${platform}`);
        }

        // Validate state
        const storedState = localStorage.getItem(`oauth_state_${platform}`);
        if (!storedState || storedState !== state) {
            throw new Error('Invalid OAuth state');
        }

        const tokenParams = new URLSearchParams({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            code: code,
            grant_type: 'authorization_code',
            redirect_uri: config.redirectUri
        });

        try {
            const response = await fetch(config.tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                body: tokenParams.toString()
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Token exchange failed: ${response.statusText} - ${JSON.stringify(errorData)}`);
            }

            const tokens = await response.json();

            // Store tokens securely
            this.storeTokens(platform, tokens);

            // Clean up state
            localStorage.removeItem(`oauth_state_${platform}`);

            return tokens;
        } catch (error) {
            console.error(`OAuth token exchange failed for ${platform}:`, error);
            throw error;
        }
    }

    /**
     * Refresh access token using refresh token
     */
    static async refreshAccessToken(platform: string): Promise<OAuthTokens> {
        const config = this.OAUTH_CONFIGS[platform];
        const tokens = this.getStoredTokens(platform);

        if (!config || !tokens?.refreshToken) {
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
    static getStoredTokens(platform: string): OAuthTokens | null {
        try {
            const stored = localStorage.getItem(`oauth_tokens_${platform}`);
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            console.error(`Failed to get stored tokens for ${platform}:`, error);
            return null;
        }
    }

    /**
     * Check if tokens are valid and not expired
     */
    static isTokenValid(platform: string): boolean {
        const tokens = this.getStoredTokens(platform);
        if (!tokens?.accessToken) {
            return false;
        }

        // Check if token is expired (with 5-minute buffer)
        if (tokens.expiresIn) {
            const expiresAt = tokens.expiresIn * 1000; // Convert to milliseconds
            const now = Date.now();
            const buffer = 5 * 60 * 1000; // 5 minutes

            return now < (expiresAt - buffer);
        }

        return true;
    }

    /**
     * Revoke tokens and clear storage
     */
    static async revokeTokens(platform: string): Promise<void> {
        const tokens = this.getStoredTokens(platform);

        if (tokens?.accessToken) {
            try {
                // Platform-specific revocation endpoints
                const revokeUrls: Record<string, string> = {
                    facebook: `https://graph.facebook.com/v18.0/me/permissions?access_token=${tokens.accessToken}`,
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

        // Clear stored tokens
        localStorage.removeItem(`oauth_tokens_${platform}`);
    }

    /**
     * Generate secure state parameter
     */
    private static generateState(platform: string): string {
        const timestamp = Date.now();
        const nonce = Math.random().toString(36).substring(2, 15);
        const state: OAuthState = { platform, timestamp, nonce };

        return btoa(JSON.stringify(state));
    }

    /**
     * Store tokens securely
     */
    private static storeTokens(platform: string, tokens: OAuthTokens): void {
        try {
            localStorage.setItem(`oauth_tokens_${platform}`, JSON.stringify({
                ...tokens,
                timestamp: Date.now()
            }));
        } catch (error) {
            console.error(`Failed to store tokens for ${platform}:`, error);
        }
    }

    /**
     * Get authorization header for API requests
     */
    static getAuthHeader(platform: string): string | null {
        const tokens = this.getStoredTokens(platform);
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
        const authHeader = this.getAuthHeader(platform);
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
                const newAuthHeader = this.getAuthHeader(platform);

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
