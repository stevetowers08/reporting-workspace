import { Spinner } from '@/components/ui/UnifiedLoadingSystem';
import { Button } from '@/components/ui/button-simple';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { debugLogger } from '@/lib/debug';
import { GoogleSheetsAccount, GoogleSheetsService } from '@/services/api/googleSheetsService';
import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface GoogleSheetsSelectorProps {
  onSelectionComplete?: (_spreadsheetId: string, _sheetName: string) => void;
  initialSpreadsheetId?: string;
  initialSheetName?: string;
  hideSaveButton?: boolean;
}

export const GoogleSheetsSelector: React.FC<GoogleSheetsSelectorProps> = ({ 
  onSelectionComplete, 
  initialSpreadsheetId, 
  initialSheetName,
  hideSaveButton = false
}) => {
  const [accounts, setAccounts] = useState<GoogleSheetsAccount[]>([]);
  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState<string>(initialSpreadsheetId || '');
  const [selectedSheet, setSelectedSheet] = useState<string>(initialSheetName || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [loadingSheets, setLoadingSheets] = useState(false);

  // Fetch Google Sheets accounts on component mount
  useEffect(() => {
    fetchSheetsAccounts();
  }, []);

  // Load sheet names if initial spreadsheet is provided
  useEffect(() => {
    if (initialSpreadsheetId && accounts.length > 0) {
      fetchSheetNames(initialSpreadsheetId);
    }
  }, [initialSpreadsheetId, accounts]);

  const fetchSheetsAccounts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      debugLogger.info('GoogleSheetsSelector', 'Fetching Google Sheets accounts');
      
      // First check if we have access tokens
      const accessToken = await GoogleSheetsService.getAccessToken();
      
      if (!accessToken) {
        throw new Error('No Google OAuth access token found. Please connect your Google account first.');
      }
      
      const fetchedAccounts = await GoogleSheetsService.getSheetsAccounts();
      
      debugLogger.info('GoogleSheetsSelector', 'Fetched accounts', { 
        accountCount: fetchedAccounts.length,
        totalSheets: fetchedAccounts.reduce((sum, acc) => sum + acc.sheets.length, 0)
      });
      
      setAccounts(fetchedAccounts);
      
      if (fetchedAccounts.length === 0) {
        setError('No Google Sheets found. Please create a spreadsheet in your Google Drive.');
      }
    } catch (error) {
      debugLogger.error('GoogleSheetsSelector', 'Failed to fetch Google Sheets accounts', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch Google Sheets. Please check your connection.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // No account selection needed - we'll use the first account automatically

  // Filter spreadsheets based on search term
  const getFilteredSheets = () => {
    if (!accounts.length) {return [];}
    
    const allSheets = accounts[0].sheets;
    if (!searchTerm.trim()) {return allSheets;}
    
    return allSheets.filter(sheet => 
      sheet.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const handleSpreadsheetChange = (spreadsheetId: string) => {
    setSelectedSpreadsheet(spreadsheetId);
    setSelectedSheet('');
    setSheetNames([]);
    
    // Fetch sheet names for the selected spreadsheet
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
      
      debugLogger.info('GoogleSheetsSelector', 'Fetched sheet names', { 
        spreadsheetId, 
        sheetCount: sheets.length,
        sheetNames: sheets 
      });
    } catch (error) {
      debugLogger.error('GoogleSheetsSelector', 'Failed to fetch sheet names', error);
      setError(`Failed to load sheet names: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoadingSheets(false);
    }
  };

  const handleSheetChange = (sheetName: string) => {
    debugLogger.info('GoogleSheetsSelector', 'Sheet changed', { sheetName, selectedSpreadsheet });
    
    setSelectedSheet(sheetName);
    
    // If hideSaveButton is true, automatically call onSelectionComplete when both are selected
    if (hideSaveButton && selectedSpreadsheet && sheetName && onSelectionComplete) {
      debugLogger.info('GoogleSheetsSelector', 'Auto-calling onSelectionComplete', { selectedSpreadsheet, sheetName });
      onSelectionComplete(selectedSpreadsheet, sheetName);
    } else {
      // No action needed when hideSaveButton is false
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
      // Since we only have one account, use the first one
      const account = accounts[0];
      const spreadsheet = account?.sheets.find(sheet => sheet.id === selectedSpreadsheet);

      if (!account || !spreadsheet) {
        throw new Error('Selected spreadsheet not found');
      }

      // Call the completion callback with the selected spreadsheet and sheet
      if (onSelectionComplete) {
        debugLogger.info('GoogleSheetsSelector', 'Calling onSelectionComplete callback', { selectedSpreadsheet, selectedSheet });
        onSelectionComplete(selectedSpreadsheet, selectedSheet);
      } else {
        debugLogger.warn('GoogleSheetsSelector', 'No onSelectionComplete callback provided');
      }
      
      debugLogger.info('GoogleSheetsSelector', 'Selection completed successfully', {
        spreadsheetId: selectedSpreadsheet,
        sheetName: selectedSheet,
        spreadsheetName: spreadsheet.name
      });
      
    } catch (error) {
      debugLogger.error('GoogleSheetsSelector', 'Failed to save Google Sheets selection', error);
      setError('Failed to save selection. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const _getSelectedSpreadsheet = () => {
    if (!accounts.length) {return null;}
    return accounts[0].sheets.find(sheet => sheet.id === selectedSpreadsheet);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner size="md" className="mr-3" />
        <span className="text-gray-600">Loading your Google Sheets...</span>
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Select Google Sheets</h3>
        <Button onClick={fetchSheetsAccounts} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-800">{error}</span>
          </div>
        </div>
      )}

      <div className="space-y-4">

        {/* Spreadsheet Selection */}
        {accounts.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Spreadsheet
            </label>
            
            {/* Custom Searchable Dropdown */}
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search spreadsheets..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
            
            {/* Dropdown Results */}
            <div className="mt-2 border border-gray-300 rounded-md max-h-52 overflow-y-auto">
              {getFilteredSheets().map((sheet) => (
                <button
                  key={sheet.id}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSpreadsheetChange(sheet.id);
                  }}
                  className={`w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                    selectedSpreadsheet === sheet.id ? 'bg-blue-50 text-blue-700' : ''
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">{sheet.name}</span>
                    <span className="text-xs text-gray-500">{sheet.id}</span>
                  </div>
                </button>
              ))}
              {getFilteredSheets().length === 0 && searchTerm && (
                <div className="px-3 py-2 text-sm text-gray-500">
                  No spreadsheets found matching "{searchTerm}"
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sheet Selection */}
        {selectedSpreadsheet && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Sheet
            </label>
            {loadingSheets ? (
              <div className="flex items-center gap-2 p-3 border border-gray-300 rounded-md">
                <Spinner size="sm" />
                <span className="text-sm text-gray-600">Loading sheet names...</span>
              </div>
            ) : sheetNames.length > 0 ? (
              <Select value={selectedSheet} onValueChange={handleSheetChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a sheet" />
                </SelectTrigger>
                <SelectContent>
                  {sheetNames.map((sheetName) => (
                    <SelectItem key={sheetName} value={sheetName}>
                      {sheetName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={selectedSheet}
                  onChange={(e) => setSelectedSheet(e.target.value)}
                  placeholder="Enter sheet name (e.g., Sheet1, Form Responses)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500">
                  Enter the exact name of the sheet/tab within the spreadsheet
                </p>
              </div>
            )}
          </div>
        )}

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
                  <Spinner size="sm" className="mr-2" />
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
