import { debugLogger } from '@/lib/debug';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType: string | null;
  effectiveType: string | null;
  downlink: number | null;
  rtt: number | null;
}

// Fast Refresh compatible: Initialize state with a function to avoid navigator access during render
const getInitialNetworkStatus = (): NetworkStatus => {
  if (typeof window === 'undefined') {
    return {
      isOnline: true,
      isSlowConnection: false,
      connectionType: null,
      effectiveType: null,
      downlink: null,
      rtt: null,
    };
  }

  const connection = (navigator as any).connection || 
                    (navigator as any).mozConnection || 
                    (navigator as any).webkitConnection;

  const isOnline = navigator.onLine;
  const isSlowConnection = connection ? 
    (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') : 
    false;

  return {
    isOnline,
    isSlowConnection,
    connectionType: connection?.type || null,
    effectiveType: connection?.effectiveType || null,
    downlink: connection?.downlink || null,
    rtt: connection?.rtt || null,
  };
};

/**
 * Hook for monitoring network status and connection quality
 * Fast Refresh compatible - avoids side effects during render
 */
export const useNetworkStatus = () => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(getInitialNetworkStatus);
  const queryClient = useQueryClient();
  const isInitialized = useRef(false);

  const updateNetworkStatus = useCallback(() => {
    if (typeof window === 'undefined') {return;}

    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    const isOnline = navigator.onLine;
    const isSlowConnection = connection ? 
      (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') : 
      false;

    const newStatus: NetworkStatus = {
      isOnline,
      isSlowConnection,
      connectionType: connection?.type || null,
      effectiveType: connection?.effectiveType || null,
      downlink: connection?.downlink || null,
      rtt: connection?.rtt || null,
    };

    setNetworkStatus(newStatus);

    debugLogger.info('NetworkStatus', 'Network status updated', newStatus);

    // Update React Query network mode based on connection
    if (queryClient && isInitialized.current) {
      queryClient.setDefaultOptions({
        queries: {
          networkMode: isOnline ? 'online' : 'offline' as any,
        },
        mutations: {
          networkMode: isOnline ? 'online' : 'offline' as any,
        },
      });
    }
  }, [queryClient]);

  useEffect(() => {
    // Mark as initialized to avoid side effects during Fast Refresh
    isInitialized.current = true;

    // Initial status check
    updateNetworkStatus();

    // Listen for online/offline events
    const handleOnline = () => {
      debugLogger.info('NetworkStatus', 'Network came online');
      updateNetworkStatus();
    };

    const handleOffline = () => {
      debugLogger.warn('NetworkStatus', 'Network went offline');
      updateNetworkStatus();
    };

    // Listen for connection changes
    const handleConnectionChange = () => {
      debugLogger.info('NetworkStatus', 'Connection changed');
      updateNetworkStatus();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for connection changes if supported
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;
    
    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, [updateNetworkStatus]);

  return networkStatus;
}

/**
 * Hook for handling offline/online state with React Query
 * Fast Refresh compatible - uses refs to avoid side effects during render
 */
export const useOfflineSupport = () => {
  const { isOnline, isSlowConnection } = useNetworkStatus();
  const queryClient = useQueryClient();
  const lastOnlineState = useRef(isOnline);
  const lastSlowState = useRef(isSlowConnection);

  const handleOfflineMode = useCallback(() => {
    if (!isOnline) {
      debugLogger.info('OfflineSupport', 'Switching to offline mode');
      
      // Pause all queries when offline
      // queryClient.pauseQueries(); // Method doesn't exist in current React Query version
      
      // Show offline indicator
      return true;
    } else {
      debugLogger.info('OfflineSupport', 'Switching to online mode');
      
      // Resume queries when back online
      // queryClient.resumeQueries(); // Method doesn't exist in current React Query version
      
      // Invalidate stale queries to refresh data
      queryClient.invalidateQueries({
        predicate: (query) => query.isStale(),
      });
      
      return false;
    }
  }, [isOnline, queryClient]);

  const handleSlowConnection = useCallback(() => {
    if (isSlowConnection) {
      debugLogger.info('OfflineSupport', 'Slow connection detected, adjusting query behavior');
      
      // Increase stale time for slow connections
      queryClient.setDefaultOptions({
        queries: {
          staleTime: 15 * 60 * 1000, // 15 minutes for slow connections
          gcTime: 60 * 60 * 1000, // 1 hour for slow connections
        },
      });
      
      return true;
    } else {
      debugLogger.info('OfflineSupport', 'Fast connection detected, using normal query behavior');
      
      // Reset to normal stale time
      queryClient.setDefaultOptions({
        queries: {
          staleTime: 5 * 60 * 1000, // 5 minutes for fast connections
          gcTime: 30 * 60 * 1000, // 30 minutes for fast connections
        },
      });
      
      return false;
    }
  }, [isSlowConnection, queryClient]);

  useEffect(() => {
    // Only run side effects when state actually changes to avoid Fast Refresh issues
    if (lastOnlineState.current !== isOnline || lastSlowState.current !== isSlowConnection) {
      const isOffline = handleOfflineMode();
      const isSlow = handleSlowConnection();
      
      debugLogger.info('OfflineSupport', 'Connection state updated', {
        isOffline,
        isSlow,
        isOnline,
        isSlowConnection,
      });

      lastOnlineState.current = isOnline;
      lastSlowState.current = isSlowConnection;
    }
  }, [isOnline, isSlowConnection, handleOfflineMode, handleSlowConnection]);

  return {
    isOnline,
    isSlowConnection,
    isOffline: !isOnline,
  };
}

/**
 * Component for displaying network status
 */
export const NetworkStatusIndicator = () => {
  const { isOnline, isSlowConnection, connectionType, effectiveType } = useNetworkStatus();

  if (isOnline && !isSlowConnection) {
    return null; // Don't show indicator for good connections
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className={`px-3 py-2 rounded-md text-sm font-medium ${
        !isOnline 
          ? 'bg-red-100 text-red-800 border border-red-200' 
          : isSlowConnection 
            ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
            : 'bg-green-100 text-green-800 border border-green-200'
      }`}>
        {!isOnline ? (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span>Offline</span>
          </div>
        ) : isSlowConnection ? (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <span>Slow Connection ({effectiveType || connectionType})</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Online</span>
          </div>
        )}
      </div>
    </div>
  );
}
