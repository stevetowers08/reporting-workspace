import { AlertCircle, Minus } from 'lucide-react';
import React from 'react';

interface DataDisplayProps {
  value: number | string | null | undefined;
  isLoading?: boolean;
  error?: string | null;
  fallback?: string;
  className?: string;
}

/**
 * DataDisplay component following 2025 best practices for handling data states:
 * - Shows dash (-) for zero/null values (no data available)
 * - Shows error icon for API failures (data couldn't be fetched)
 * - Shows loading state during data fetching
 * - Shows actual value when data is available
 */
export const DataDisplay: React.FC<DataDisplayProps> = ({
  value,
  isLoading = false,
  error = null,
  fallback = '-',
  className = ''
}) => {
  // Loading state
  if (isLoading) {
    return (
      <div className={`animate-pulse bg-gray-200 rounded h-4 w-16 ${className}`} />
    );
  }

  // Error state - API call failed
  if (error) {
    return (
      <div className={`flex items-center text-red-500 ${className}`}>
        <AlertCircle className="h-4 w-4 mr-1" />
        <span className="text-xs">Error</span>
      </div>
    );
  }

  // No data state - API succeeded but no data (show dash)
  if (value === null || value === undefined || value === 0 || value === '') {
    return (
      <div className={`flex items-center text-gray-400 ${className}`}>
        <Minus className="h-4 w-4 mr-1" />
        <span>{fallback}</span>
      </div>
    );
  }

  // Data available - show actual value
  return (
    <span className={className}>
      {typeof value === 'number' ? value.toLocaleString() : value}
    </span>
  );
};

export default DataDisplay;
