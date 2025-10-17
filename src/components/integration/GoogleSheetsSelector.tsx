import { LoadingSpinner } from '@/components/ui/LoadingStates';
import { Button } from '@/components/ui/button-simple';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { GoogleSheetsAccount, GoogleSheetsService } from '@/services/api/googleSheetsService';
import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface GoogleSheetsSelectorProps {
  onSelectionComplete?: (_spreadsheetId: string, _sheetName: string, _spreadsheetName?: string) => void;
  initialSpreadsheetId?: string;
  initialSheetName?: string;
  hideSaveButton?: boolean;
  onSheetSelectionChange?: (isVisible: boolean) => void;
}

export const GoogleSheetsSelector: React.FC<GoogleSheetsSelectorProps> = ({ 
  onSelectionComplete, 
  initialSpreadsheetId, 
  initialSheetName,
  hideSaveButton = false,
  onSheetSelectionChange
}) => {
  const [accounts, setAccounts] = useState<GoogleSheetsAccount[]>([]);
  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState<string>(initialSpreadsheetId || '');
  const [selectedSheet, setSelectedSheet] = useState<string>(initialSheetName || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
    const [loadingSheets, setLoadingSheets] = useState(false);

  // Don't auto-load on mount - let user trigger loading by clicking dropdown

  // Load sheet names if initial spreadsheet is provided
  useEffect(() => {
    if (initialSpreadsheetId && accounts.length > 0) {
      fetchSheetNames(initialSpreadsheetId);
    }
  }, [initialSpreadsheetId, accounts]);

  // Notify parent when sheet selection is visible
  useEffect(() => {
    if (onSheetSelectionChange) {
      // Sheet selection is visible when spreadsheet is selected AND sheet names are loaded
      const isSheetSelectionVisible = !!selectedSpreadsheet && sheetNames.length > 0;
      onSheetSelectionChange(isSheetSelectionVisible);
    }
  }, [selectedSpreadsheet, sheetNames.length, onSheetSelectionChange]);

  const fetchSheetsAccounts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const accessToken = await GoogleSheetsService.getAccessToken();
      
      if (!accessToken) {
        throw new Error('No Google OAuth access token found. Please connect your Google account first.');
      }
      
      const fetchedAccounts = await GoogleSheetsService.getSheetsAccounts();
      setAccounts(fetchedAccounts);
      
      if (fetchedAccounts.length === 0) {
        setError('No Google Sheets found. Please create a spreadsheet in your Google Drive.');
      }
    } catch (_error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch Google Sheets. Please check your connection.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };


  const handleSpreadsheetChange = (spreadsheetId: string) => {
    setSelectedSpreadsheet(spreadsheetId);
    setSelectedSheet('');
    setSheetNames([]);
    
    if (spreadsheetId) {
      fetchSheetNames(spreadsheetId);
    }
  };

  const fetchSheetNames = async (spreadsheetId: string) => {
    setLoadingSheets(true);
    setError(null);
    
    try {
      const accessToken = await GoogleSheetsService.getAccessToken();
      
      if (!accessToken) {
        throw new Error('No access token available');
      }

      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch sheet names: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const sheets = data.sheets?.map((sheet: any) => sheet.properties?.title).filter(Boolean) || [];
      setSheetNames(sheets);
    } catch (_error) {
      setError(`Failed to load sheet names: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoadingSheets(false);
    }
  };

  const handleSheetChange = (sheetName: string) => {
    setSelectedSheet(sheetName);
    
    const spreadsheet = accounts[0]?.sheets.find(sheet => sheet.id === selectedSpreadsheet);
    const spreadsheetName = spreadsheet?.name || 'Unknown Spreadsheet';
    
    if (hideSaveButton && selectedSpreadsheet && sheetName && onSelectionComplete) {
      onSelectionComplete(selectedSpreadsheet, sheetName, spreadsheetName);
    }
  };

  const handleSaveSelection = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!selectedSpreadsheet || !selectedSheet) {
      setError('Please select a spreadsheet and sheet.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const account = accounts[0];
      const spreadsheet = account?.sheets.find(sheet => sheet.id === selectedSpreadsheet);

      if (!account || !spreadsheet) {
        throw new Error('Selected spreadsheet not found');
      }

      if (onSelectionComplete) {
        onSelectionComplete(selectedSpreadsheet, selectedSheet);
      }
      
    } catch (_error) {
      setError('Failed to save selection. Please try again.');
    } finally {
      setSaving(false);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <LoadingSpinner size="sm" className="mr-2" />
        <span className="text-sm text-gray-600">Loading...</span>
      </div>
    );
  }

  if (error && accounts.length === 0) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span className="font-medium text-red-800">Error Loading Google Sheets</span>
        </div>
        <p className="text-sm text-red-700 mb-4">{error}</p>
        <Button onClick={fetchSheetsAccounts} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-800">{error}</span>
          </div>
        </div>
      )}

      <div className="space-y-2">

        {/* Spreadsheet Selection */}
        <div className="mt-3">
          <SearchableSelect 
            options={accounts.length > 0 ? accounts[0]?.sheets.map((sheet) => ({
              value: sheet.id,
              label: sheet.name
            })) || [] : []}
            value={selectedSpreadsheet || ""} 
            onValueChange={handleSpreadsheetChange}
            placeholder="Select a spreadsheet"
            searchPlaceholder="Search spreadsheets..."
            className="w-full h-8 text-sm"
            onOpenChange={(open) => {
              if (open && accounts.length === 0 && !loading) {
                fetchSheetsAccounts();
              }
            }}
          />
        </div>

        {/* Sheet Selection - Always visible */}
        <div className="mt-2">
          <SearchableSelect 
            options={loadingSheets ? [{ value: 'loading', label: 'Loading sheets...' }] : sheetNames.map((sheetName) => ({
              value: sheetName,
              label: sheetName
            }))}
            value={selectedSheet || ""} 
            onValueChange={handleSheetChange}
            placeholder={loadingSheets ? "Loading sheets..." : "Select a sheet"}
            searchPlaceholder="Search sheets..."
            className="w-full h-8 text-sm"
          />
        </div>

        {/* Save Button */}
        {!hideSaveButton && selectedSpreadsheet && selectedSheet && (
          <div className="pt-4">
            <Button 
              type="button"
              onClick={handleSaveSelection} 
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {saving ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Save Selection
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
