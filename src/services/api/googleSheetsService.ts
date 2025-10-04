import { debugLogger } from '@/lib/debug';
import { OAuthService } from '@/services/auth/oauthService';

export interface GoogleSheet {
  id: string;
  name: string;
  url: string;
  lastModified: string;
  sheetCount: number;
}

export interface GoogleSheetsAccount {
  id: string;
  name: string;
  email: string;
  sheets: GoogleSheet[];
}

export class GoogleSheetsService {
  private static readonly API_BASE_URL = 'https://sheets.googleapis.com/v4';

  /**
   * Get access token for Google Sheets API
   */
  private static async getAccessToken(): Promise<string | null> {
    // First try TokenManager (database-only)
    const tokens = await OAuthService.getStoredTokens('google');
    if (tokens?.accessToken) {
      debugLogger.debug('GoogleSheetsService', 'Using tokens from TokenManager', { hasAccessToken: true });
      return tokens.accessToken;
    }
    
    // Fallback to database
    try {
      const { DatabaseService } = await import('@/services/data/databaseService');
      const integrations = await DatabaseService.getIntegrations();
      const googleIntegration = integrations.find(i => i.platform === 'googleSheets' && i.connected);
      
      if (googleIntegration?.config?.tokens?.accessToken) {
        const dbTokens = googleIntegration.config.tokens;
        
        // Check if token is expired
        if (dbTokens.expiresIn) {
          const now = Date.now();
          const expiresAt = dbTokens.expiresIn * 1000; // Convert to milliseconds
          const isExpired = now >= expiresAt;
          
          if (isExpired && dbTokens.refreshToken) {
            debugLogger.debug('GoogleSheetsService', 'Token expired, attempting refresh', { 
              expiredAt: new Date(expiresAt).toISOString(),
              now: new Date(now).toISOString()
            });
            
            try {
              // Refresh the token
              const refreshedTokens = await OAuthService.refreshAccessToken('google');
              debugLogger.debug('GoogleSheetsService', 'Token refreshed successfully', { hasNewToken: !!refreshedTokens.accessToken });
              
              // Update database with new tokens
              await DatabaseService.saveIntegration('googleSheets', {
                connected: true,
                accountName: 'Google Sheets Account',
                lastSync: new Date().toISOString(),
                config: { 
                  tokens: { 
                    accessToken: refreshedTokens.accessToken,
                    refreshToken: refreshedTokens.refreshToken || dbTokens.refreshToken,
                    expiresIn: refreshedTokens.expiresIn,
                    tokenType: refreshedTokens.tokenType,
                    scope: refreshedTokens.scope
                  } 
                }
              });
              
              return refreshedTokens.accessToken;
            } catch (refreshError) {
              debugLogger.error('GoogleSheetsService', 'Token refresh failed', refreshError);
              // Continue with expired token - it might still work for a short time
            }
          }
        }
        
        debugLogger.debug('GoogleSheetsService', 'Using tokens from database', { hasAccessToken: true });
        return dbTokens.accessToken;
      }
    } catch (error) {
      debugLogger.error('GoogleSheetsService', 'Failed to get tokens from database', error);
    }
    
    debugLogger.debug('GoogleSheetsService', 'No access token found', { 
      hasLocalStorageTokens: !!tokens,
      hasAccessToken: !!tokens?.accessToken 
    });
    return null;
  }

  /**
   * Test Google Sheets API connection
   */
  static async testConnection(): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      if (!token) {
        debugLogger.error('GoogleSheetsService', 'No access token available');
        return false;
      }

      // Test with a simple API call to get user info
      const response = await fetch(`${this.API_BASE_URL}/spreadsheets`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      return response.ok;
    } catch (error) {
      debugLogger.error('GoogleSheetsService', 'Google Sheets connection test failed', error);
      return false;
    }
  }

  /**
   * Get Google Sheets accounts
   */
  static async getSheetsAccounts(): Promise<GoogleSheetsAccount[]> {
    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        debugLogger.error('GoogleSheetsService', 'No access token available');
        return [];
      }

      debugLogger.debug('GoogleSheetsService', 'Fetching Google Sheets accounts');

      // Get user info first
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!userResponse.ok) {
        debugLogger.error('GoogleSheetsService', 'Failed to get user info', { status: userResponse.status });
        return [];
      }

      const userInfo = await userResponse.json();
      debugLogger.debug('GoogleSheetsService', 'Got user info', { email: userInfo.email });

      // Get spreadsheets using Google Drive API
      const sheetsResponse = await fetch(`https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.spreadsheet'`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!sheetsResponse.ok) {
        debugLogger.error('GoogleSheetsService', 'Failed to get spreadsheets', { status: sheetsResponse.status });
        return [];
      }

      const sheetsData = await sheetsResponse.json();
      debugLogger.debug('GoogleSheetsService', 'Got spreadsheets data', { 
        fileCount: sheetsData.files?.length || 0 
      });

      // Transform the data
      const sheets: GoogleSheet[] = (sheetsData.files || []).map((file: any) => ({
        id: file.id,
        name: file.name,
        url: `https://docs.google.com/spreadsheets/d/${file.id}`,
        lastModified: file.modifiedTime,
        sheetCount: 1 // We'd need to fetch each sheet individually to get accurate count
      }));

      const account: GoogleSheetsAccount = {
        id: userInfo.id,
        name: userInfo.name || userInfo.email,
        email: userInfo.email,
        sheets: sheets
      };

      debugLogger.debug('GoogleSheetsService', 'Successfully fetched Google Sheets account', {
        accountId: account.id,
        sheetCount: sheets.length
      });

      return [account];
    } catch (error) {
      debugLogger.error('GoogleSheetsService', 'Failed to get Google Sheets accounts', error);
      return [];
    }
  }

  /**
   * Get specific spreadsheet data
   */
  static async getSpreadsheetData(spreadsheetId: string, range?: string): Promise<any> {
    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        debugLogger.error('GoogleSheetsService', 'No access token available');
        return null;
      }

      const rangeParam = range ? `?range=${encodeURIComponent(range)}` : '';
      const url = `${this.API_BASE_URL}/spreadsheets/${spreadsheetId}/values${rangeParam}`;

      debugLogger.debug('GoogleSheetsService', 'Fetching spreadsheet data', { spreadsheetId, range });

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        debugLogger.error('GoogleSheetsService', 'Failed to get spreadsheet data', { 
          status: response.status,
          spreadsheetId,
          range 
        });
        return null;
      }

      const data = await response.json();
      debugLogger.debug('GoogleSheetsService', 'Successfully fetched spreadsheet data', {
        spreadsheetId,
        rowCount: data.values?.length || 0
      });

      return data;
    } catch (error) {
      debugLogger.error('GoogleSheetsService', 'Failed to get spreadsheet data', error);
      return null;
    }
  }

  /**
   * Disconnect Google Sheets service
   */
  static disconnect(): void {
    debugLogger.debug('GoogleSheetsService', 'Disconnecting Google Sheets service');
    // Clear any cached data if needed
  }
}
