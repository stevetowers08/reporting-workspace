import { useCallback, useState } from 'react';

export interface ChartError {
  message: string;
  endpoint?: string;
  reason?: string;
  errorType?: 'network' | 'api' | 'auth' | 'generic';
  details?: string;
  timestamp: number;
}

export interface UseChartErrorReturn {
  error: ChartError | null;
  setError: (error: ChartError | null) => void;
  clearError: () => void;
  isRetrying: boolean;
  retry: () => void;
  setRetrying: (retrying: boolean) => void;
}

export const useChartError = (
  onRetry?: () => void
): UseChartErrorReturn => {
  const [error, setError] = useState<ChartError | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const clearError = useCallback(() => {
    setError(null);
    setIsRetrying(false);
  }, []);

  const retry = useCallback(async () => {
    if (!onRetry) {
      return;
    }
    
    setIsRetrying(true);
    clearError();
    
    try {
      await onRetry();
    } catch (_err) {
      // Error will be handled by the component that calls this hook
    } finally {
      setIsRetrying(false);
    }
  }, [onRetry, clearError]);

  return {
    error,
    setError,
    clearError,
    isRetrying,
    retry,
    setRetrying: setIsRetrying
  };
};

export default useChartError;
