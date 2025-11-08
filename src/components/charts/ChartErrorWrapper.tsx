import React from 'react';
import { ErrorState } from '@/components/ui/ErrorState';

export interface ChartErrorWrapperProps {
  /** The chart component to render */
  children: React.ReactNode;
  /** Error state from the hook */
  error: any;
  /** Whether the chart is loading */
  isLoading?: boolean;
  /** Retry function */
  onRetry?: () => void;
  /** Whether the chart is currently retrying */
  isRetrying?: boolean;
  /** Compact mode for smaller spaces */
  compact?: boolean;
  /** Custom error message */
  errorMessage?: string;
}

export const ChartErrorWrapper: React.FC<ChartErrorWrapperProps> = ({
  children,
  error,
  isLoading = false,
  onRetry,
  isRetrying = false,
  compact = false,
  errorMessage
}) => {
  // If loading, show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-gray-500">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          Loading...
        </div>
      </div>
    );
  }

  // If there's an error, show error state
  if (error) {
    const errorProps = {
      message: errorMessage || error.message || 'Failed to load chart data',
      endpoint: error.endpoint,
      reason: error.reason,
      errorType: error.errorType || 'api',
      details: error.details,
      showRetry: !!onRetry,
      onRetry,
      isRetrying,
      compact
    };

    return <ErrorState {...errorProps} />;
  }

  // If no error and not loading, show the chart
  return <>{children}</>;
};

export default ChartErrorWrapper;
