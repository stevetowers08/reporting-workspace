import React, { useState, useEffect } from 'react';
import { X, AlertCircle, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useErrorContext, AppError } from '@/contexts/ErrorContext';

interface ErrorNotificationProps {
  error: AppError;
  onDismiss: (id: string) => void;
  autoDismiss?: boolean;
  autoDismissDelay?: number;
}

function ErrorNotification({ 
  error, 
  onDismiss, 
  autoDismiss = true, 
  autoDismissDelay = 5000 
}: ErrorNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoDismiss && error.type !== 'auth') {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onDismiss(error.id), 300); // Allow fade out animation
      }, autoDismissDelay);

      return () => clearTimeout(timer);
    }
  }, [autoDismiss, autoDismissDelay, error.id, error.type, onDismiss]);

  const getIcon = () => {
    switch (error.type) {
      case 'network':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'auth':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'api':
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      case 'validation':
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getBackgroundColor = () => {
    switch (error.type) {
      case 'network':
        return 'bg-red-50 border-red-200';
      case 'auth':
        return 'bg-yellow-50 border-yellow-200';
      case 'api':
        return 'bg-orange-50 border-orange-200';
      case 'validation':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-red-50 border-red-200';
    }
  };

  const getTextColor = () => {
    switch (error.type) {
      case 'network':
        return 'text-red-800';
      case 'auth':
        return 'text-yellow-800';
      case 'api':
        return 'text-orange-800';
      case 'validation':
        return 'text-blue-800';
      default:
        return 'text-red-800';
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Card className={`${getBackgroundColor()} transition-all duration-300 ease-in-out transform`}>
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className={`text-sm font-medium ${getTextColor()}`}>
                {error.type === 'network' && 'Connection Error'}
                {error.type === 'auth' && 'Authentication Error'}
                {error.type === 'api' && 'Service Error'}
                {error.type === 'validation' && 'Validation Error'}
                {error.type === 'unknown' && 'Error'}
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDismiss(error.id)}
                className="h-6 w-6 p-0 hover:bg-transparent"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className={`text-sm ${getTextColor()} mt-1`}>
              {error.message}
            </p>
            {error.context && Object.keys(error.context).length > 0 && (
              <details className="mt-2">
                <summary className={`text-xs ${getTextColor()} cursor-pointer`}>
                  More details
                </summary>
                <pre className={`text-xs ${getTextColor()} mt-1 bg-white bg-opacity-50 p-2 rounded overflow-auto`}>
                  {JSON.stringify(error.context, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ErrorNotificationContainer() {
  const { errors, removeError, clearErrors } = useErrorContext();
  const [dismissedErrors, setDismissedErrors] = useState<Set<string>>(new Set());

  const handleDismiss = (id: string) => {
    setDismissedErrors(prev => new Set([...prev, id]));
    removeError(id);
  };

  const handleClearAll = () => {
    setDismissedErrors(new Set());
    clearErrors();
  };

  const visibleErrors = errors.filter(error => !dismissedErrors.has(error.id));

  if (visibleErrors.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 w-96 max-w-full space-y-2">
      {visibleErrors.length > 1 && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-slate-600">
            {visibleErrors.length} error{visibleErrors.length > 1 ? 's' : ''}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="text-xs text-slate-500 hover:text-slate-700"
          >
            Clear all
          </Button>
        </div>
      )}
      
      {visibleErrors.map(error => (
        <ErrorNotification
          key={error.id}
          error={error}
          onDismiss={handleDismiss}
          autoDismiss={error.type !== 'auth'} // Don't auto-dismiss auth errors
          autoDismissDelay={error.type === 'network' ? 3000 : 5000}
        />
      ))}
    </div>
  );
}

// Success notification component
interface SuccessNotificationProps {
  message: string;
  onDismiss: () => void;
  autoDismiss?: boolean;
  autoDismissDelay?: number;
}

export function SuccessNotification({ 
  message, 
  onDismiss, 
  autoDismiss = true, 
  autoDismissDelay = 3000 
}: SuccessNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoDismiss) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onDismiss(), 300); // Allow fade out animation
      }, autoDismissDelay);

      return () => clearTimeout(timer);
    }
  }, [autoDismiss, autoDismissDelay, onDismiss]);

  if (!isVisible) {
    return null;
  }

  return (
    <Card className="bg-green-50 border-green-200 transition-all duration-300 ease-in-out transform">
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-green-800">
                Success
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="h-6 w-6 p-0 hover:bg-transparent"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-green-800 mt-1">
              {message}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
