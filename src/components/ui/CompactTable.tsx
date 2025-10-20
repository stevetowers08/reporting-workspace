import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/LoadingStates";
import { ChevronDown, ChevronUp, TrendingDown, TrendingUp } from "lucide-react";
import React, { useState } from "react";

export interface TableColumn {
  key: string;
  label: string;
  width?: string;
  align?: 'left' | 'right' | 'center';
  format?: 'text' | 'number' | 'currency' | 'percentage';
  sortable?: boolean;
  showTrend?: boolean;
}

export interface CompactTableProps {
  data: any[];
  columns: TableColumn[];
  density?: 'dense' | 'compact' | 'comfortable';
  showExpandable?: boolean;
  maxRows?: number;
  loading?: boolean;
  error?: string;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  onRowClick?: (row: any) => void;
  renderRowActions?: (_row: any) => React.ReactNode;
  showTotals?: boolean;
  totals?: Record<string, any>;
}

const CompactTable: React.FC<CompactTableProps> = ({
  data,
  columns,
  density = 'compact',
  showExpandable = false,
  maxRows = 50,
  loading = false,
  error,
  emptyMessage = "No data available",
  emptyIcon,
  onRowClick,
  renderRowActions: _renderRowActions,
  showTotals = false,
  totals
}) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const densityClasses = {
    dense: {
      header: 'py-2 px-3',
      cell: 'py-2 px-3',
      text: 'text-xs'
    },
    compact: {
      header: 'py-3 px-4',
      cell: 'py-3 px-4',
      text: 'text-sm'
    },
    comfortable: {
      header: 'py-4 px-5',
      cell: 'py-4 px-5',
      text: 'text-sm'
    }
  };

  const formatValue = (value: any, format?: string): string => {
    if (value === null || value === undefined) return '-';
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(value);
      case 'percentage':
        return `${(value * 100).toFixed(1)}%`;
      case 'number':
        return new Intl.NumberFormat('en-US').format(value);
      default:
        return String(value);
    }
  };

  const calculatePercentageChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const renderTrendIndicator = (current: number, previous: number, _format?: string) => {
    if (previous === undefined || previous === null) return null;
    
    const change = calculatePercentageChange(current, previous);
    const isPositive = change > 0;
    const isNegative = change < 0;
    
    if (Math.abs(change) < 0.1) return null; // Don't show trend for very small changes
    
    return (
      <div className={`flex items-center gap-1 text-xs ${
        isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-slate-500'
      }`}>
        {isPositive ? (
          <TrendingUp className="h-3 w-3" />
        ) : isNegative ? (
          <TrendingDown className="h-3 w-3" />
        ) : null}
        <span className="font-medium">
          {isPositive ? '+' : ''}{change.toFixed(1)}%
        </span>
      </div>
    );
  };

  const toggleRowExpansion = (rowId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rowId)) {
      newExpanded.delete(rowId);
    } else {
      newExpanded.add(rowId);
    }
    setExpandedRows(newExpanded);
  };

  if (loading) {
    return (
      <Card className="border border-slate-200">
        <CardContent className="p-6">
          <LoadingState message="Loading data..." />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border border-red-200">
        <CardContent className="p-6">
          <div className="text-center">
            <div className="text-red-600 mb-4">{error}</div>
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
              size="sm"
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="border border-slate-200">
        <CardContent className="p-6">
          <div className="text-center">
            {emptyIcon && <div className="text-slate-400 mb-4">{emptyIcon}</div>}
            <h3 className="text-lg font-medium text-slate-900 mb-2">No Data Found</h3>
            <p className="text-slate-600">{emptyMessage}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayData = data.slice(0, maxRows);

  return (
    <Card className="border border-slate-200 p-0">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {columns.map((column) => (
                  <th 
                    key={column.key}
                    className={`${densityClasses[density].header} ${densityClasses[density].text} font-semibold text-slate-700 ${
                      column.align === 'right' ? 'text-right' : 
                      column.align === 'center' ? 'text-center' : 'text-left'
                    }`}
                  >
                    {column.label}
                  </th>
                ))}
                {showExpandable && (
                  <th className={`${densityClasses[density].header} ${densityClasses[density].text} font-semibold text-slate-700 text-center w-12`}>
                    {/* Expand column header */}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayData.map((row, index) => {
                const rowId = row.id || row.clientId || index.toString();
                const isExpanded = expandedRows.has(rowId);
                
                return (
                  <React.Fragment key={rowId}>
                    <tr 
                      className={`transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                      onClick={() => onRowClick?.(row)}
                    >
                      {columns.map((column) => (
        <td 
          key={column.key}
          className={`${densityClasses[density].cell} ${densityClasses[density].text} ${
            column.align === 'right' ? 'text-right' : 
            column.align === 'center' ? 'text-center' : 'text-left'
          }`}
        >
          <div className={column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left'}>
            <div className="font-semibold text-slate-900">
              {formatValue(row[column.key], column.format)}
            </div>
            {column.showTrend && row[`${column.key}_previous`] !== undefined && (
              <div className="mt-0.5">
                {renderTrendIndicator(row[column.key], row[`${column.key}_previous`], column.format)}
              </div>
            )}
          </div>
        </td>
                      ))}
                      {showExpandable && (
                        <td className={`${densityClasses[density].cell} text-center`}>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRowExpansion(rowId);
                            }}
                            className="h-6 w-6 p-0"
                          >
                            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </Button>
                        </td>
                      )}
                    </tr>
                    {showExpandable && isExpanded && (
                      <tr>
                        <td colSpan={columns.length + 1} className="px-3 py-2 bg-slate-50">
                          <div className="text-xs text-slate-600">
                            {/* Expanded content - can be customized */}
                            <div className="grid grid-cols-2 gap-4">
                              {Object.entries(row).map(([key, value]) => (
                                <div key={key}>
                                  <span className="font-medium">{key}:</span> {String(value)}
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
            {showTotals && totals && (
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr className="font-semibold">
                  {columns.map((column) => (
                    <td 
                      key={column.key}
                      className={`${densityClasses[density].cell} ${densityClasses[density].text} ${
                        column.align === 'right' ? 'text-right' : 
                        column.align === 'center' ? 'text-center' : 'text-left'
                      }`}
                    >
                      {column.key === 'venue' ? 'TOTAL' : formatValue(totals[column.key], column.format)}
                    </td>
                  ))}
                  {showExpandable && (
                    <td className={`${densityClasses[density].cell} text-center`}>-</td>
                  )}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        
        {data.length > maxRows && (
          <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 text-xs text-slate-600">
            Showing {maxRows} of {data.length} venues
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CompactTable;
