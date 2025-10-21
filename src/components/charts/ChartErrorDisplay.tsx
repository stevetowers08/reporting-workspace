/**
 * Chart Error Display Component
 * Implements best practices for showing chart errors with retry functionality
 */

import { Button } from '@/components/ui/button-simple';
import { Card, CardContent } from '@/components/ui/card';
import { debugLogger } from '@/lib/debug';
import { AlertCircle, RefreshCw, TriangleAlert, WifiOff } from 'lucide-react';
import React from 'react';

interface ChartErrorDisplayProps {
  error: string;
  chartName?: string;
  retryAction?: () => void;
  showRetry?: boolean;
  errorType?: 'network' | 'data' | 'permission' | 'api' | 'unknown';
}

export const ChartErrorDisplay: React.FC<ChartErrorDisplayProps> = ({ 
  error, 
  chartName = 'Chart',
  retryAction,
  showRetry = true,
  errorType = 'unknown'
}) => {
  const handleRetry = () => {
    debugLogger.debug('ChartErrorDisplay', 'Retry action triggered', { chartName, error, errorType });
    if (retryAction) {
      retryAction();
    }
  };

  const getErrorConfig = () => {
    switch (errorType) {
      case 'network':
        return {
          icon: <WifiOff className="h-5 w-5 text-orange-500" />,
          color: 'bg-orange-50 border-orange-200 text-orange-800',
          message: 'Network connection issue. Please check your internet connection.',
          title: 'Connection Error'
        };
      case 'permission':
        return {
          icon: <AlertCircle className="h-5 w-5 text-purple-500" />,
          color: 'bg-purple-50 border-purple-200 text-purple-800',
          message: 'Permission denied. Please check your access rights.',
          title: 'Access Denied'
        };
      case 'api':
        return {
          icon: <TriangleAlert className="h-5 w-5 text-red-500" />,
          color: 'bg-red-50 border-red-200 text-red-800',
          message: 'API service unavailable. Please try again later.',
          title: 'Service Error'
        };
      case 'data':
        return {
          icon: <AlertCircle className="h-5 w-5 text-blue-500" />,
          color: 'bg-blue-50 border-blue-200 text-blue-800',
          message: 'Data is currently unavailable. Please try again later.',
          title: 'Data Unavailable'
        };
      default:
        return {
          icon: <TriangleAlert className="h-5 w-5 text-red-500" />,
          color: 'bg-red-50 border-red-200 text-red-800',
          message: error,
          title: 'Error'
        };
    }
  };

  const config = getErrorConfig();

  return (
    <Card className={`${config.color} p-4`} role="alert" aria-live="polite">
      <CardContent className="flex items-start space-x-3 p-0">
        {config.icon}
        <div className="flex-1">
          <h4 className="font-semibold mb-1">
            {config.title}: {chartName}
          </h4>
          <p className="text-sm mb-3">
            {config.message}
          </p>
          {showRetry && retryAction && (
            <Button
              onClick={handleRetry}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
              aria-label={`Retry loading ${chartName}`}
            >
              <RefreshCw className="h-4 w-4" />
              <span>Retry</span>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

