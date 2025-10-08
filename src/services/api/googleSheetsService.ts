import { API_BASE_URLS } from '@/constants/apiVersions';

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
  private static readonly API_BASE_URL = API_BASE_URLS.GOOGLE_SHEETS;

  /**
   * Get access token for Google Sheets API with automatic refresh
   */
  static async getAccessToken(): Promise<string | null> {
    try {
      // Use the new GoogleSheetsOAuthService
      const { GoogleSheetsOAuthService } = await import('@/services/auth/googleSheetsOAuthService');
      const token = await GoogleSheetsOAuthService.getSheetsAccessToken();
      
      if (token) {
        debugLogger.debug('GoogleSheetsService', 'Using Google Sheets OAuth tokens', { hasAccessToken: true });
        return token;
      }
      
      debugLogger.error('GoogleSheetsService', 'No Google Sheets access token available');
      console.error('GoogleSheetsService: No access token available. Please connect Google Sheets first.');
      return null;
    } catch (error) {
      debugLogger.error('GoogleSheetsService', 'Failed to get access token', error);
      console.error('GoogleSheetsService: Failed to get access token:', error);
      return null;
    }
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
        const errorMsg = 'No Google OAuth access token available. Please connect your Google account first.';
        debugLogger.error('GoogleSheetsService', errorMsg);
        console.error('GoogleSheetsService:', errorMsg);
        throw new Error(errorMsg);
      }

      debugLogger.debug('GoogleSheetsService', 'Fetching Google Sheets accounts');
      console.log('GoogleSheetsService: Fetching Google Sheets accounts with token:', accessToken.substring(0, 20) + '...');

      // Get spreadsheets using Google Drive API
      const sheetsResponse = await fetch(`https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.spreadsheet'`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!sheetsResponse.ok) {
        const errorText = await sheetsResponse.text();
        const errorMsg = `Failed to get spreadsheets: ${sheetsResponse.status} - ${errorText}`;
        debugLogger.error('GoogleSheetsService', errorMsg);
        console.error('GoogleSheetsService:', errorMsg);
        throw new Error(errorMsg);
      }

      const sheetsData = await sheetsResponse.json();
      debugLogger.debug('GoogleSheetsService', 'Got spreadsheets data', { 
        fileCount: sheetsData.files?.length || 0 
      });
      console.log('GoogleSheetsService: Found', sheetsData.files?.length || 0, 'spreadsheets');

      // Transform the data
      const sheets: GoogleSheet[] = (sheetsData.files || []).map((file: any) => ({
        id: file.id,
        name: file.name,
        url: `https://docs.google.com/spreadsheets/d/${file.id}`,
        lastModified: file.modifiedTime,
        sheetCount: 1 // We'd need to fetch each sheet individually to get accurate count
      }));

      const account: GoogleSheetsAccount = {
        id: 'google-account', // Mock ID since userinfo is not available
        name: 'Google Account', // Mock name
        email: 'google@account.com', // Mock email
        sheets: sheets
      };

      debugLogger.debug('GoogleSheetsService', 'Successfully fetched Google Sheets account', {
        accountId: account.id,
        sheetCount: sheets.length
      });
      console.log('GoogleSheetsService: Successfully fetched account with', sheets.length, 'sheets');

      return [account];
    } catch (error) {
      debugLogger.error('GoogleSheetsService', 'Failed to get Google Sheets accounts', error);
      console.error('GoogleSheetsService: Failed to get Google Sheets accounts:', error);
      throw error; // Re-throw to let the component handle it
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

      console.log('GoogleSheetsService: Successfully fetched data from Google Sheets API!', {
        spreadsheetId,
        range,
        rowCount: data.values?.length || 0,
        firstRow: data.values?.[0],
        sampleData: data.values?.slice(0, 3)
      });

      return data;
    } catch (error) {
      debugLogger.error('GoogleSheetsService', 'Failed to get spreadsheet data', error);
      console.error('GoogleSheetsService: Failed to fetch data from Google Sheets API:', error);
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
