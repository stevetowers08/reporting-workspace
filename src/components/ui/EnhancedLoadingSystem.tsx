// Enhanced Loading System with Context and Advanced States
import { cn } from '@/lib/utils';
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// ============================================================================
// LOADING CONTEXT
// ============================================================================

interface LoadingState {
  isLoading: boolean;
  message?: string;
  progress?: number;
  type?: 'page' | 'component' | 'action' | 'data';
}

interface LoadingContextType {
  loadingStates: Map<string, LoadingState>;
  setLoading: (key: string, state: LoadingState) => void;
  clearLoading: (key: string) => void;
  isAnyLoading: boolean;
  getLoadingMessage: () => string;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const LoadingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [loadingStates, setLoadingStates] = useState<Map<string, LoadingState>>(new Map());

  const setLoading = useCallback((key: string, state: LoadingState) => {
    setLoadingStates(prev => new Map(prev.set(key, state)));
  }, []);

  const clearLoading = useCallback((key: string) => {
    setLoadingStates(prev => {
      const newMap = new Map(prev);
      newMap.delete(key);
      return newMap;
    });
  }, []);

  const isAnyLoading = loadingStates.size > 0;
  
  const getLoadingMessage = useCallback(() => {
    const states = Array.from(loadingStates.values());
    if (states.length === 0) return '';
    
    // Return the most important loading message
    const pageLoading = states.find(s => s.type === 'page');
    if (pageLoading) return pageLoading.message || 'Loading...';
    
    const componentLoading = states.find(s => s.type === 'component');
    if (componentLoading) return componentLoading.message || 'Loading...';
    
    return states[0].message || 'Loading...';
  }, [loadingStates]);

  return (
    <LoadingContext.Provider value={{
      loadingStates,
      setLoading,
      clearLoading,
      isAnyLoading,
      getLoadingMessage
    }}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = (key: string) => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }

  const { setLoading, clearLoading } = context;
  const loadingState = context.loadingStates.get(key);

  return {
    isLoading: loadingState?.isLoading || false,
    message: loadingState?.message,
    progress: loadingState?.progress,
    type: loadingState?.type,
    setLoading: (state: LoadingState) => setLoading(key, state),
    clearLoading: () => clearLoading(key),
    startLoading: (message?: string, type: LoadingState['type'] = 'component') => 
      setLoading(key, { isLoading: true, message, type }),
    stopLoading: () => clearLoading(key),
    setProgress: (progress: number) => 
      setLoading(key, { ...loadingState, progress }),
  };
};

export const useGlobalLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useGlobalLoading must be used within a LoadingProvider');
  }
  return context;
};

// ============================================================================
// ENHANCED LOADING COMPONENTS
// ============================================================================

// Progress bar component
export const ProgressBar: React.FC<{ 
  progress: number; 
  className?: string;
  showPercentage?: boolean;
}> = ({ progress, className, showPercentage = true }) => (
  <div className={cn("w-full", className)}>
    <div className="flex justify-between items-center mb-2">
      <span className="text-sm text-slate-600">Loading...</span>
      {showPercentage && (
        <span className="text-sm text-slate-600">{Math.round(progress)}%</span>
      )}
    </div>
    <div className="w-full bg-slate-200 rounded-full h-2">
      <div 
        className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  </div>
);

// Enhanced page loader with progress
export const EnhancedPageLoader: React.FC<{ 
  message?: string; 
  progress?: number;
  showProgress?: boolean;
}> = ({ message = "Loading...", progress, showProgress = false }) => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center">
    <div className="text-center max-w-md mx-auto px-6">
      <div className="h-8 w-8 border-3 border-slate-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{message}</h3>
      {showProgress && progress !== undefined && (
        <ProgressBar progress={progress} className="mt-4" />
      )}
    </div>
  </div>
);

// Enhanced data skeleton with animation
export const EnhancedDataSkeleton: React.FC<{ 
  className?: string;
  lines?: number;
  animated?: boolean;
}> = ({ className, lines = 3, animated = true }) => (
  <div className={cn("bg-white border border-slate-200 rounded-lg p-6", className)}>
    <div className="space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div 
          key={i}
          className={cn(
            "h-4 bg-slate-100 rounded",
            animated && "animate-pulse",
            i === 0 && "w-1/3",
            i === 1 && "w-1/2", 
            i === 2 && "w-1/4",
            i > 2 && "w-3/4"
          )}
        />
      ))}
    </div>
  </div>
);

// Card skeleton with header and content
export const CardSkeleton: React.FC<{ 
  className?: string;
  showHeader?: boolean;
  showActions?: boolean;
}> = ({ className, showHeader = true, showActions = false }) => (
  <div className={cn("bg-white border border-slate-200 rounded-lg overflow-hidden", className)}>
    {showHeader && (
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-5 bg-slate-100 rounded w-32 animate-pulse" />
            <div className="h-4 bg-slate-100 rounded w-48 animate-pulse" />
          </div>
          {showActions && (
            <div className="h-8 bg-slate-100 rounded w-20 animate-pulse" />
          )}
        </div>
      </div>
    )}
    <div className="p-6">
      <div className="space-y-4">
        <div className="h-6 bg-slate-100 rounded w-1/2 animate-pulse" />
        <div className="h-4 bg-slate-100 rounded w-3/4 animate-pulse" />
        <div className="h-4 bg-slate-100 rounded w-1/3 animate-pulse" />
      </div>
    </div>
  </div>
);

// List skeleton for data lists
export const ListSkeleton: React.FC<{ 
  items?: number;
  className?: string;
}> = ({ items = 5, className }) => (
  <div className={cn("space-y-3", className)}>
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="flex items-center space-x-4 p-4 bg-white border border-slate-200 rounded-lg">
        <div className="h-10 w-10 bg-slate-100 rounded-full animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-slate-100 rounded w-1/3 animate-pulse" />
          <div className="h-3 bg-slate-100 rounded w-1/2 animate-pulse" />
        </div>
        <div className="h-6 bg-slate-100 rounded w-16 animate-pulse" />
      </div>
    ))}
  </div>
);

// Chart skeleton with realistic chart structure
export const ChartSkeleton: React.FC<{ 
  className?: string;
  type?: 'bar' | 'line' | 'pie' | 'area';
}> = ({ className, type = 'bar' }) => (
  <div className={cn("bg-white border border-slate-200 rounded-lg p-6", className)}>
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-5 bg-slate-100 rounded w-32 animate-pulse" />
        <div className="h-4 bg-slate-100 rounded w-20 animate-pulse" />
      </div>
      
      {type === 'bar' && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <div className="h-3 bg-slate-100 rounded w-16 animate-pulse" />
              <div 
                className="h-6 bg-slate-100 rounded animate-pulse"
                style={{ width: `${Math.random() * 60 + 20}%` }}
              />
            </div>
          ))}
        </div>
      )}
      
      {type === 'line' && (
        <div className="h-32 bg-slate-100 rounded animate-pulse" />
      )}
      
      {type === 'pie' && (
        <div className="flex items-center justify-center">
          <div className="h-32 w-32 bg-slate-100 rounded-full animate-pulse" />
        </div>
      )}
    </div>
  </div>
);

// Inline loading indicator
export const InlineLoader: React.FC<{ 
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ message, size = 'sm', className }) => (
  <div className={cn("flex items-center gap-2", className)}>
    <div className={cn(
      "border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin",
      size === 'sm' && "h-4 w-4",
      size === 'md' && "h-5 w-5",
      size === 'lg' && "h-6 w-6"
    )} />
    {message && (
      <span className="text-sm text-slate-600">{message}</span>
    )}
  </div>
);

// Loading overlay for components
export const LoadingOverlay: React.FC<{ 
  isLoading: boolean;
  message?: string;
  children: ReactNode;
  className?: string;
}> = ({ isLoading, message, children, className }) => (
  <div className={cn("relative", className)}>
    {children}
    {isLoading && (
      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
        <div className="text-center">
          <div className="h-6 w-6 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-2" />
          {message && (
            <p className="text-sm text-slate-600">{message}</p>
          )}
        </div>
      </div>
    )}
  </div>
);

// Global loading indicator
export const GlobalLoadingIndicator: React.FC = () => {
  const { isAnyLoading, getLoadingMessage } = useGlobalLoading();
  
  if (!isAnyLoading) return null;
  
  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3">
        <InlineLoader message={getLoadingMessage()} />
      </div>
    </div>
  );
};

// ============================================================================
// LEGACY COMPONENTS (for backward compatibility)
// ============================================================================

export const PageLoader: React.FC<{ message?: string }> = ({ message = "Loading..." }) => (
  <EnhancedPageLoader message={message} />
);

export const DataSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <EnhancedDataSkeleton className={className} />
);

export const TableSkeleton: React.FC<{ rows?: number; className?: string }> = ({ 
  rows = 5, 
  className 
}) => (
  <div className={cn("bg-white border border-slate-200 rounded-lg overflow-hidden", className)}>
    <div className="p-4 border-b border-slate-200">
      <div className="flex gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-4 bg-slate-100 rounded w-20 animate-pulse" />
        ))}
      </div>
    </div>
    <div className="divide-y divide-slate-200">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4">
          <div className="flex gap-4">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="h-4 bg-slate-100 rounded w-16 animate-pulse" />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const DashboardSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("space-y-6", className)}>
    {/* Header */}
    <div className="space-y-3">
      <div className="h-8 bg-slate-100 rounded w-64 animate-pulse" />
      <div className="h-4 bg-slate-100 rounded w-96 animate-pulse" />
    </div>

    {/* Metrics cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>

    {/* Charts */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ChartSkeleton />
      <ChartSkeleton />
    </div>

    {/* Table */}
    <TableSkeleton rows={6} />
  </div>
);

export const LoadingButton: React.FC<{
  isLoading: boolean;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}> = ({ isLoading, children, className, onClick, disabled }) => (
  <button
    className={cn(
      "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium",
      "bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500",
      "disabled:opacity-50 disabled:cursor-not-allowed",
      className
    )}
    onClick={onClick}
    disabled={disabled || isLoading}
  >
    {isLoading ? (
      <>
        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        Loading...
      </>
    ) : (
      children
    )}
  </button>
);

export const Spinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({ 
  size = 'md', 
  className 
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6', 
    lg: 'h-8 w-8'
  };
  
  return (
    <div 
      className={cn(
        "border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin",
        sizeClasses[size],
        className
      )} 
    />
  );
};
