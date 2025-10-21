import { AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import React from 'react';
import { Button } from './button';
import { Card } from './card';

export interface ErrorStateProps {
  /** The error message to display */
  message?: string;
  /** The endpoint that failed */
  endpoint?: string;
  /** The error reason/code */
  reason?: string;
  /** Whether to show a retry button */
  showRetry?: boolean;
  /** Retry function */
  onRetry?: () => void;
  /** Custom error type for different icons */
  errorType?: 'network' | 'api' | 'auth' | 'generic';
  /** Whether the error is currently retrying */
  isRetrying?: boolean;
  /** Additional details to show */
  details?: string;
  /** Compact mode for smaller spaces */
  compact?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message = 'Something went wrong',
  endpoint,
  reason,
  showRetry = true,
  onRetry,
  errorType = 'generic',
  isRetrying = false,
  details,
  compact = false
}) => {
  const getErrorIcon = () => {
    switch (errorType) {
      case 'network':
        return <WifiOff className="h-6 w-6 text-red-500" />;
      case 'api':
        return <AlertCircle className="h-6 w-6 text-orange-500" />;
      case 'auth':
        return <AlertCircle className="h-6 w-6 text-yellow-500" />;
      default:
        return <AlertCircle className="h-6 w-6 text-red-500" />;
    }
  };

  const getErrorColor = () => {
    switch (errorType) {
      case 'network':
        return 'border-red-200 bg-red-50';
      case 'api':
        return 'border-orange-200 bg-orange-50';
      case 'auth':
        return 'border-yellow-200 bg-yellow-50';
      default:
        return 'border-red-200 bg-red-50';
    }
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-2 p-3 rounded-lg border ${getErrorColor()}`}>
        {getErrorIcon()}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{message}</p>
          {endpoint && (
            <p className="text-xs text-gray-600 truncate">Endpoint: {endpoint}</p>
          )}
        </div>
        {showRetry && onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            disabled={isRetrying}
            className="shrink-0"
          >
            {isRetrying ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={`border ${getErrorColor()}`}>
      <div className="p-6 text-center">
        <div className="flex justify-center mb-4">
          {getErrorIcon()}
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {message}
        </h3>
        
        {(endpoint || reason || details) && (
          <div className="space-y-2 mb-4 text-sm text-gray-600">
            {endpoint && (
              <div className="flex items-center justify-center gap-2">
                <Wifi className="h-4 w-4" />
                <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">
                  {endpoint}
                </span>
              </div>
            )}
            
            {reason && (
              <div>
                <span className="font-medium">Reason:</span> {reason}
              </div>
            )}
            
            {details && (
              <div className="text-xs text-gray-500">
                {details}
              </div>
            )}
          </div>
        )}
        
        {showRetry && onRetry && (
          <Button
            variant="outline"
            onClick={onRetry}
            disabled={isRetrying}
            className="mt-4"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </>
            )}
          </Button>
        )}
      </div>
    </Card>
  );
};

export default ErrorState;
