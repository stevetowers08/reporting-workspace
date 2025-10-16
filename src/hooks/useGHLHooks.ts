import { debugLogger } from '@/lib/debug';
import { GoHighLevelAnalyticsService, GoHighLevelApiService } from '@/services/ghl/goHighLevelService';
import { useCallback, useEffect, useRef, useState } from 'react';

// Use React's built-in memoization instead of custom cache
const useGHLMetrics = (locationId: string, dateRange?: { start: string; end: string }) => {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastFetchRef = useRef<string>('');

  const fetchData = useCallback(async () => {
    if (!locationId) {return;}
    
    // Prevent duplicate requests for same parameters
    const requestKey = `${locationId}-${dateRange?.start || 'no-start'}-${dateRange?.end || 'no-end'}`;
    if (lastFetchRef.current === requestKey) {
      return; // ✅ FIX: Don't check data, just prevent duplicate requests
    }
    
    lastFetchRef.current = requestKey;

    try {
      setLoading(true);
      setError(null);
      
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      
      const apiDateRange = dateRange ? {
        startDate: dateRange.start,
        endDate: dateRange.end
      } : undefined;
      
      const metrics = await GoHighLevelAnalyticsService.getGHLMetrics(locationId, apiDateRange);
      setData(metrics);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Request was cancelled
      }
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch GHL metrics';
      debugLogger.error('useGHLMetrics', errorMessage, err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [locationId, dateRange?.start, dateRange?.end]); // ✅ FIX: Remove 'data' dependency to prevent infinite loops

  useEffect(() => {
    fetchData();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  return { data, loading, error };
};

// Shared hook for GHL funnel analytics
export const useGHLFunnelAnalytics = (locationId: string, dateRange?: { start: string; end: string }) => {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastFetchRef = useRef<string>('');

  const fetchData = useCallback(async () => {
    if (!locationId) {return;}
    
    const requestKey = `funnel-${locationId}-${dateRange?.start || 'no-start'}-${dateRange?.end || 'no-end'}`;
    if (lastFetchRef.current === requestKey) {
      return; // ✅ FIX: Don't check data, just prevent duplicate requests
    }
    
    lastFetchRef.current = requestKey;

    try {
      setLoading(true);
      setError(null);
      
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      
      const apiDateRange = dateRange ? {
        startDate: dateRange.start,
        endDate: dateRange.end
      } : undefined;
      
      const analytics = await GoHighLevelAnalyticsService.getFunnelAnalytics(locationId, apiDateRange);
      setData(analytics);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch funnel analytics';
      debugLogger.error('useGHLFunnelAnalytics', errorMessage, err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [locationId, dateRange?.start, dateRange?.end]); // ✅ FIX: Remove 'data' dependency to prevent infinite loops

  useEffect(() => {
    fetchData();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  return { data, loading, error };
};

// Shared hook for GHL contact count
export const useGHLContactCount = (locationId: string, dateRange?: { start: string; end: string }) => {
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastFetchRef = useRef<string>('');

  const fetchData = useCallback(async () => {
    if (!locationId) {return;}
    
    const requestKey = `contacts-${locationId}-${dateRange?.start || 'no-start'}-${dateRange?.end || 'no-end'}`;
    if (lastFetchRef.current === requestKey) {
      return; // ✅ FIX: Don't check count, just prevent duplicate requests
    }
    
    lastFetchRef.current = requestKey;

    try {
      setLoading(true);
      setError(null);
      
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      
      const dateParams = dateRange ? {
        startDate: dateRange.start,
        endDate: dateRange.end
      } : undefined;
      
      const contactCount = await GoHighLevelApiService.getContactCount(locationId, dateParams);
      setCount(contactCount);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch contact count';
      debugLogger.error('useGHLContactCount', errorMessage, err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [locationId, dateRange?.start, dateRange?.end]); // ✅ FIX: Remove 'count' dependency to prevent infinite loops

  useEffect(() => {
    fetchData();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  return { count, loading, error };
};

// Shared loading state hook
export const useLoadingState = (initialLoading = false) => {
  const [loading, setLoading] = useState(initialLoading);
  const [error, setError] = useState<string | null>(null);

  const setLoadingWithError = (isLoading: boolean, errorMessage?: string | null) => {
    setLoading(isLoading);
    if (errorMessage !== undefined) {
      setError(errorMessage);
    }
  };

  const clearError = () => setError(null);

  return { loading, error, setLoading: setLoadingWithError, clearError };
};
