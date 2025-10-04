import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GoogleSheetsService } from '@/services/api/googleSheetsService';
import { debugLogger } from '@/lib/debug';

export const GoogleSheetsDataTest: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const spreadsheetId = '1V0C4jLBvUfrnBK8wMQaAQ_Ly2C6681e0JyNcmzrUKn4';
  const sheetName = 'Wedding Leads';

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      debugLogger.info('GoogleSheetsDataTest', 'Fetching data', { spreadsheetId, sheetName });
      
      const result = await GoogleSheetsService.getSpreadsheetData(spreadsheetId, `${sheetName}!A:Z`);
      
      if (result && result.values) {
        setData(result);
        debugLogger.info('GoogleSheetsDataTest', 'Data fetched successfully', {
          rowCount: result.values.length,
          columnCount: result.values[0]?.length || 0
        });
      } else {
        setError('No data found in the sheet');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      debugLogger.error('GoogleSheetsDataTest', 'Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>🔍 Google Sheets Data Inspector</CardTitle>
        <p className="text-sm text-gray-600">
          Testing data from Magnolia Terrace client's Google Sheet
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={fetchData} disabled={loading}>
            {loading ? 'Fetching...' : 'Fetch Sheet Data'}
          </Button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="font-semibold text-red-800">Error</h4>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {data && (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-green-800">✅ Data Fetched Successfully</h4>
              <p className="text-green-700">
                Rows: {data.values.length} | Columns: {data.values[0]?.length || 0}
              </p>
            </div>

            {data.values.length > 0 && (
              <>
                <div>
                  <h4 className="font-semibold mb-2">📋 Headers</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {data.values[0].map((header: string, index: number) => (
                      <div key={index} className="p-2 bg-gray-100 rounded text-sm">
                        {index + 1}. {header}
                      </div>
                    ))}
                  </div>
                </div>

                {data.values.length > 1 && (
                  <div>
                    <h4 className="font-semibold mb-2">📄 Sample Data (First 5 rows)</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-gray-50">
                            {data.values[0].map((header: string, index: number) => (
                              <th key={index} className="border border-gray-300 px-2 py-1 text-left text-sm">
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {data.values.slice(1, 6).map((row: string[], rowIndex: number) => (
                            <tr key={rowIndex}>
                              {data.values[0].map((header: string, colIndex: number) => (
                                <td key={colIndex} className="border border-gray-300 px-2 py-1 text-sm">
                                  {row[colIndex] || ''}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
