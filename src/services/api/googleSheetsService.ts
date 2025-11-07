import { API_BASE_URLS } from '@/constants/apiVersions';
import { DevLogger } from '@/lib/logger';

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
        DevLogger.debug('GoogleSheetsService', 'Using Google Sheets OAuth tokens', { hasAccessToken: true });
        return token;
      }
      
      DevLogger.error('GoogleSheetsService', 'No Google Sheets access token available');
      DevLogger.error('GoogleSheetsService', 'No access token available. Please connect Google Sheets first.');
      return null;
    } catch (error) {
      DevLogger.error('GoogleSheetsService', 'Failed to get access token', error);
      DevLogger.error('GoogleSheetsService', 'Failed to get access token:', error);
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
        DevLogger.error('GoogleSheetsService', 'No access token available');
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
      DevLogger.error('GoogleSheetsService', 'Google Sheets connection test failed', error);
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
        DevLogger.error('GoogleSheetsService', errorMsg);
        throw new Error(errorMsg);
      }

      DevLogger.debug('GoogleSheetsService', 'Fetching Google Sheets accounts');
      DevLogger.debug('GoogleSheetsService', 'Fetching Google Sheets accounts with token:', accessToken.substring(0, 20) + '...');

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
        DevLogger.error('GoogleSheetsService', errorMsg);
        throw new Error(errorMsg);
      }

      const sheetsData = await sheetsResponse.json();
      DevLogger.debug('GoogleSheetsService', 'Got spreadsheets data', { 
        fileCount: sheetsData.files?.length || 0 
      });
      DevLogger.info('GoogleSheetsService', `Found ${sheetsData.files?.length || 0} spreadsheets`);

      // Get user info
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!userInfoResponse.ok) {
        const errorText = await userInfoResponse.text();
        DevLogger.error('GoogleSheetsService', 'Failed to get user info', { status: userInfoResponse.status, error: errorText });
        throw new Error(`Failed to get user info: ${userInfoResponse.status} ${errorText}`);
      }

      const userInfo = await userInfoResponse.json();
      DevLogger.info('GoogleSheetsService', 'Retrieved user info', { email: userInfo.email });

      // Transform the data
      const sheets: GoogleSheet[] = (sheetsData.files || []).map((file: { id: string; name: string; modifiedTime: string }) => ({
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

      DevLogger.debug('GoogleSheetsService', 'Successfully fetched Google Sheets account', {
        accountId: account.id,
        sheetCount: sheets.length
      });
      DevLogger.success('GoogleSheetsService', `Successfully fetched account with ${sheets.length} sheets`);

      return [account];
    } catch (error) {
      DevLogger.error('GoogleSheetsService', 'Failed to get Google Sheets accounts', error);
      DevLogger.error('GoogleSheetsService', 'Failed to get Google Sheets accounts:', error);
      throw error; // Re-throw to let the component handle it
    }
  }

  /**
   * Validate and normalize sheet range format
   * Google Sheets API requires ranges in A1 notation: 'SheetName!A1:Z100' or 'SheetName!A:Z'
   */
  private static validateRange(range: string): string {
    // Remove any leading/trailing whitespace
    const trimmed = range.trim();
    
    // Check if range contains sheet name separator
    if (!trimmed.includes('!')) {
      DevLogger.warn('GoogleSheetsService', 'Range missing sheet name separator (!), adding default format', { range: trimmed });
      // If no sheet name, assume it's just a range - this might cause issues
      return trimmed;
    }
    
    // Validate A1 notation format (basic check)
    const parts = trimmed.split('!');
    if (parts.length !== 2) {
      DevLogger.warn('GoogleSheetsService', 'Invalid range format, multiple ! separators', { range: trimmed });
      return trimmed; // Return as-is and let API handle error
    }
    
    const [sheetName, cellRange] = parts;
    
    // Validate cell range format (should match A1:A1, A:Z, A1:Z100, etc.)
    const cellRangePattern = /^[A-Z]+(\d+)?:[A-Z]+(\d+)?$/;
    if (!cellRangePattern.test(cellRange)) {
      DevLogger.warn('GoogleSheetsService', 'Cell range format may be invalid', { range: trimmed, cellRange });
    }
    
    return trimmed;
  }

  /**
   * Get specific spreadsheet data with improved error handling
   */
  static async getSpreadsheetData(spreadsheetId: string, range?: string): Promise<{ values?: string[][]; range?: string } | null> {
    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        DevLogger.error('GoogleSheetsService', 'No access token available');
        return null;
      }

      // Validate spreadsheetId
      if (!spreadsheetId || spreadsheetId.trim().length === 0) {
        DevLogger.error('GoogleSheetsService', 'Invalid spreadsheet ID', { spreadsheetId });
        return null;
      }

      // Validate and normalize range if provided
      let normalizedRange = range;
      if (range) {
        normalizedRange = this.validateRange(range);
      }

      // Build URL with proper encoding
      // Google Sheets API v4 format: /v4/spreadsheets/{spreadsheetId}/values/{range}
      const rangeParam = normalizedRange ? `/${encodeURIComponent(normalizedRange)}` : '';
      const url = `${this.API_BASE_URL}/spreadsheets/${spreadsheetId}/values${rangeParam}`;

      DevLogger.debug('GoogleSheetsService', 'Fetching spreadsheet data', { 
        spreadsheetId, 
        originalRange: range,
        normalizedRange,
        url: url.replace(accessToken.substring(0, 20), 'TOKEN...') // Log URL without exposing token
      });

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorDetails;
        try {
          errorDetails = JSON.parse(errorText);
        } catch {
          errorDetails = errorText;
        }

        DevLogger.error('GoogleSheetsService', 'Failed to get spreadsheet data', { 
          status: response.status,
          statusText: response.statusText,
          spreadsheetId,
          originalRange: range,
          normalizedRange,
          error: errorDetails
        });

        // Provide helpful error messages
        if (response.status === 400) {
          DevLogger.error('GoogleSheetsService', 'Bad Request (400) - Likely invalid range format', {
            range,
            normalizedRange,
            suggestion: 'Range should be in A1 notation: "SheetName!A1:Z100" or "SheetName!A:Z"'
          });
        }

        return null;
      }

      const data = await response.json();
      DevLogger.debug('GoogleSheetsService', 'Successfully fetched spreadsheet data', {
        spreadsheetId,
        rowCount: data.values?.length || 0
      });

      DevLogger.success('GoogleSheetsService', 'Successfully fetched data from Google Sheets API!', {
        spreadsheetId,
        range,
        rowCount: data.values?.length || 0,
        firstRow: data.values?.[0]
      });

      return data;
    } catch (error) {
      DevLogger.error('GoogleSheetsService', 'Failed to get spreadsheet data', error);
      DevLogger.error('GoogleSheetsService', 'Failed to fetch data from Google Sheets API:', error);
      return null;
    }
  }

  /**
   * Disconnect Google Sheets service
   */
  static disconnect(): void {
    DevLogger.debug('GoogleSheetsService', 'Disconnecting Google Sheets service');
    // Clear any cached data if needed
  }
}
