import { DevLogger } from '@/lib/logger';
import { TokenManager } from '@/services/auth/TokenManager';

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
  private static readonly API_BASE_URL = 'https://bdmcdyxjdkgitphieklb.supabase.co/functions/v1/google-sheets-data';
  private static readonly GOOGLE_SHEETS_API_BASE = 'https://sheets.googleapis.com/v4';
  private static readonly GOOGLE_DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';

  /**
   * Get Google Sheets access token from TokenManager
   */
  static async getAccessToken(): Promise<string | null> {
    try {
      DevLogger.debug('GoogleSheetsService', 'Getting Google Sheets access token');
      const token = await TokenManager.getAccessToken('googleSheets');
      
      if (token) {
        DevLogger.debug('GoogleSheetsService', 'Successfully retrieved Google Sheets access token');
        return token;
      }
      
      DevLogger.warn('GoogleSheetsService', 'No Google Sheets access token available');
      return null;
    } catch (error) {
      DevLogger.error('GoogleSheetsService', 'Error getting Google Sheets access token', error);
      return null;
    }
  }

  /**
   * Get available Google Sheets accounts/spreadsheets
   */
  static async getSheetsAccounts(): Promise<GoogleSheetsAccount[]> {
    try {
      DevLogger.debug('GoogleSheetsService', 'Fetching Google Sheets accounts');
      
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        throw new Error('No Google Sheets access token available');
      }

      // Get spreadsheets from Google Drive
      const driveResponse = await fetch(`${this.GOOGLE_DRIVE_API_BASE}/files?q=mimeType='application/vnd.google-apps.spreadsheet'&fields=files(id,name,modifiedTime,webViewLink)`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!driveResponse.ok) {
        const errorText = await driveResponse.text();
        DevLogger.error('GoogleSheetsService', 'Failed to fetch spreadsheets from Google Drive', { 
          status: driveResponse.status, 
          error: errorText 
        });
        throw new Error(`Failed to fetch spreadsheets: ${driveResponse.status} - ${errorText}`);
      }

      const driveData = await driveResponse.json();
      const spreadsheets = driveData.files || [];

      // Convert to our format
      const sheets: GoogleSheet[] = spreadsheets.map((file: any) => ({
        id: file.id,
        name: file.name,
        url: file.webViewLink,
        lastModified: file.modifiedTime,
        sheetCount: 1 // We'll get actual sheet count when needed
      }));

      // Create a single account with all sheets
      const account: GoogleSheetsAccount = {
        id: 'google-sheets-user',
        name: 'Google Sheets Account',
        email: 'user@example.com', // This could be fetched from user info
        sheets
      };

      DevLogger.debug('GoogleSheetsService', 'Successfully fetched Google Sheets accounts', {
        accountCount: 1,
        sheetCount: sheets.length
      });

      return [account];
    } catch (error) {
      DevLogger.error('GoogleSheetsService', 'Error fetching Google Sheets accounts', error);
      throw error;
    }
  }

  /**
   * Get sheet names for a specific spreadsheet
   */
  static async getSheetNames(spreadsheetId: string): Promise<string[]> {
    try {
      DevLogger.debug('GoogleSheetsService', 'Fetching sheet names', { spreadsheetId });
      
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        throw new Error('No Google Sheets access token available');
      }

      const response = await fetch(`${this.GOOGLE_SHEETS_API_BASE}/spreadsheets/${spreadsheetId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        DevLogger.error('GoogleSheetsService', 'Failed to fetch sheet names', { 
          status: response.status, 
          error: errorText 
        });
        throw new Error(`Failed to fetch sheet names: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const sheetNames = data.sheets?.map((sheet: any) => sheet.properties?.title).filter(Boolean) || [];

      DevLogger.debug('GoogleSheetsService', 'Successfully fetched sheet names', {
        spreadsheetId,
        sheetCount: sheetNames.length
      });

      return sheetNames;
    } catch (error) {
      DevLogger.error('GoogleSheetsService', 'Error fetching sheet names', error);
      throw error;
    }
  }

  /**
   * Update values in a Google Sheet via Supabase Edge Function
   * Note: Direct client-side writes fail due to CORS issues
   */
  static async updateValues(spreadsheetId: string, range: string, values: any[][]): Promise<void> {
    try {
      DevLogger.debug('GoogleSheetsService', 'Updating sheet values via Supabase Edge Function', { spreadsheetId, range });
      
      const response = await fetch(`${this.API_BASE_URL}/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          spreadsheetId,
          range,
          values
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        DevLogger.error('GoogleSheetsService', 'Failed to update sheet values via Edge Function', { 
          status: response.status, 
          error: errorText 
        });
        throw new Error(`Failed to update sheet values: ${response.status} - ${errorText}`);
      }

      const responseData = await response.json();
      
      if (!responseData.success) {
        DevLogger.error('GoogleSheetsService', 'Edge function returned error for update', responseData);
        throw new Error('Failed to update sheet values');
      }

      DevLogger.debug('GoogleSheetsService', 'Successfully updated sheet values via Edge Function', {
        spreadsheetId,
        range,
        rowCount: values.length
      });
    } catch (error) {
      DevLogger.error('GoogleSheetsService', 'Error updating sheet values via Edge Function', error);
      throw error;
    }
  }

  /**
   * Get specific spreadsheet data using Supabase Edge Function
   */
  static async getSpreadsheetData(spreadsheetId: string, range?: string): Promise<{ values?: string[][]; range?: string } | null> {
    try {
      DevLogger.debug('GoogleSheetsService', 'Fetching spreadsheet data via Supabase Edge Function', { spreadsheetId, range });

      const response = await fetch(this.API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          spreadsheetId,
          range
        })
      });

      if (!response.ok) {
        DevLogger.error('GoogleSheetsService', 'Failed to get spreadsheet data', { 
          status: response.status,
          spreadsheetId,
          range 
        });
        return null;
      }

      const responseData = await response.json();
      
      if (!responseData.success) {
        DevLogger.error('GoogleSheetsService', 'Edge function returned error', responseData);
        return null;
      }

      // Extract the actual data from the response
      const data = responseData.data;

      DevLogger.debug('GoogleSheetsService', 'Successfully fetched spreadsheet data', {
        spreadsheetId,
        rowCount: data.values?.length || 0
      });

      DevLogger.success('GoogleSheetsService', 'Successfully fetched data from Google Sheets API!', {
        spreadsheetId,
        range,
        rowCount: data.values?.length || 0,
        firstRow: data.values?.[0],
        sampleData: data.values?.slice(0, 3)
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
