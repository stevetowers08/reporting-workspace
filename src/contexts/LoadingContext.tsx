import React, { createContext, useCallback, useContext, useMemo } from 'react';
import { LoadingOverlay, ModernSpinner } from '../components/ui/LoadingSystem';

// Types for loading state management
export interface LoadingTask {
  id: string;
  message: string;
  progress: number;
  startTime: number;
}

export interface LoadingContextType {
  // Global loading state
  isLoading: boolean;
  loadingTasks: LoadingTask[];
  
  // Task management
  startTask: (id: string, message: string) => void;
  updateTask: (id: string, progress: number, message?: string) => void;
  completeTask: (id: string) => void;
  removeTask: (id: string) => void;
  
  // Batch operations
  startBatch: (tasks: Array<{ id: string; message: string }>) => void;
  updateBatchProgress: (taskId: string, progress: number) => void;
  completeBatch: () => void;
  
  // Quick loading states
  setGlobalLoading: (loading: boolean, message?: string) => void;
  
  // Computed values
  overallProgress: number;
  currentMessage: string;
  hasActiveTasks: boolean;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

// Loading provider component
export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loadingTasks, setLoadingTasks] = React.useState<LoadingTask[]>([]);
  const [globalLoading, setGlobalLoading] = React.useState(false);
  const [globalMessage, setGlobalMessage] = React.useState('Loading...');

  // Start a new loading task
  const startTask = useCallback((id: string, message: string) => {
    setLoadingTasks(prev => {
      const existing = prev.find(task => task.id === id);
      if (existing) {
        return prev.map(task => 
          task.id === id 
            ? { ...task, message, progress: 0, startTime: Date.now() }
            : task
        );
      }
      return [...prev, { id, message, progress: 0, startTime: Date.now() }];
    });
  }, []);

  // Update task progress
  const updateTask = useCallback((id: string, progress: number, message?: string) => {
    setLoadingTasks(prev => 
      prev.map(task => 
        task.id === id 
          ? { ...task, progress: Math.min(100, Math.max(0, progress)), ...(message && { message }) }
          : task
      )
    );
  }, []);

  // Complete a task
  const completeTask = useCallback((id: string) => {
    setLoadingTasks(prev => 
      prev.map(task => 
        task.id === id 
          ? { ...task, progress: 100 }
          : task
      )
    );
    
    // Remove task after a short delay
    setTimeout(() => {
      setLoadingTasks(prev => prev.filter(task => task.id !== id));
    }, 500);
  }, []);

  // Remove a task immediately
  const removeTask = useCallback((id: string) => {
    setLoadingTasks(prev => prev.filter(task => task.id !== id));
  }, []);

  // Start multiple tasks at once
  const startBatch = useCallback((tasks: Array<{ id: string; message: string }>) => {
    const newTasks = tasks.map(task => ({
      ...task,
      progress: 0,
      startTime: Date.now()
    }));
    
    setLoadingTasks(prev => {
      const existingIds = new Set(prev.map(t => t.id));
      const uniqueNewTasks = newTasks.filter(t => !existingIds.has(t.id));
      return [...prev, ...uniqueNewTasks];
    });
  }, []);

  // Update batch progress
  const updateBatchProgress = useCallback((taskId: string, progress: number) => {
    updateTask(taskId, progress);
  }, [updateTask]);

  // Complete all tasks
  const completeBatch = useCallback(() => {
    setLoadingTasks(prev => 
      prev.map(task => ({ ...task, progress: 100 }))
    );
    
    setTimeout(() => {
      setLoadingTasks([]);
    }, 500);
  }, []);

  // Set global loading state
  const setGlobalLoadingState = useCallback((loading: boolean, message = 'Loading...') => {
    setGlobalLoading(loading);
    setGlobalMessage(message);
  }, []);

  // Computed values
  const overallProgress = useMemo(() => {
    if (loadingTasks.length === 0) return 0;
    const totalProgress = loadingTasks.reduce((sum, task) => sum + task.progress, 0);
    return totalProgress / loadingTasks.length;
  }, [loadingTasks]);

  const currentMessage = useMemo(() => {
    if (globalLoading) return globalMessage;
    if (loadingTasks.length === 0) return '';
    
    // Get the most recent task or the one with highest progress
    const activeTasks = loadingTasks.filter(task => task.progress < 100);
    if (activeTasks.length === 0) return '';
    
    const latestTask = activeTasks.reduce((latest, current) => 
      current.startTime > latest.startTime ? current : latest
    );
    
    return latestTask.message;
  }, [globalLoading, globalMessage, loadingTasks]);

  const hasActiveTasks = useMemo(() => {
    return globalLoading || loadingTasks.some(task => task.progress < 100);
  }, [globalLoading, loadingTasks]);

  const contextValue: LoadingContextType = useMemo(() => ({
    isLoading: hasActiveTasks,
    loadingTasks,
    startTask,
    updateTask,
    completeTask,
    removeTask,
    startBatch,
    updateBatchProgress,
    completeBatch,
    setGlobalLoading: setGlobalLoadingState,
    overallProgress,
    currentMessage,
    hasActiveTasks
  }), [
    hasActiveTasks,
    loadingTasks,
    startTask,
    updateTask,
    completeTask,
    removeTask,
    startBatch,
    updateBatchProgress,
    completeBatch,
    setGlobalLoadingState,
    overallProgress,
    currentMessage
  ]);

  return (
    <LoadingContext.Provider value={contextValue}>
      {children}
      <LoadingOverlay 
        isLoading={hasActiveTasks}
        progress={overallProgress}
        message={currentMessage}
      />
    </LoadingContext.Provider>
  );
};

// Hook to use loading context
export const useLoading = (): LoadingContextType => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

// Hook for managing a single loading task
export const useLoadingTask = (taskId: string, initialMessage = 'Loading...') => {
  const { startTask, updateTask, completeTask, removeTask } = useLoading();
  
  const start = useCallback((message = initialMessage) => {
    startTask(taskId, message);
  }, [taskId, initialMessage, startTask]);
  
  const update = useCallback((progress: number, message?: string) => {
    updateTask(taskId, progress, message);
  }, [taskId, updateTask]);
  
  const complete = useCallback(() => {
    completeTask(taskId);
  }, [taskId, completeTask]);
  
  const remove = useCallback(() => {
    removeTask(taskId);
  }, [taskId, removeTask]);
  
  return { start, update, complete, remove };
};

// Hook for batch operations
export const useBatchLoading = () => {
  const { startBatch, updateBatchProgress, completeBatch } = useLoading();
  
  return {
    startBatch,
    updateProgress: updateBatchProgress,
    completeBatch
  };
};

// Higher-order component for loading states
export const withLoading = <P extends object>(
  Component: React.ComponentType<P>,
  loadingComponent?: React.ComponentType<{ message?: string }>
) => {
  return React.memo((props: P & { isLoading?: boolean; loadingMessage?: string }) => {
    const { isLoading, loadingMessage, ...restProps } = props;
    
    if (isLoading) {
      const LoadingComponent = loadingComponent || (() => (
        <div className="flex items-center justify-center p-8">
          <ModernSpinner size="lg" />
          <span className="ml-3 text-slate-600">{loadingMessage || 'Loading...'}</span>
        </div>
      ));
      
      return <LoadingComponent message={loadingMessage} />;
    }
    
    return <Component {...(restProps as P)} />;
  });
};

// Loading button component
export const LoadingButton: React.FC<{
  isLoading: boolean;
  loadingText?: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}> = ({ 
  isLoading, 
  loadingText = 'Loading...', 
  children, 
  className = '',
  onClick,
  disabled = false
}) => {
  return (
    <button
      className={`relative inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      onClick={onClick}
      disabled={disabled || isLoading}
    >
      {isLoading ? (
        <>
          <ModernSpinner size="sm" className="mr-2" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </button>
  );
};

// Loading state for async operations
export const useAsyncLoading = <T,>(
  asyncFn: () => Promise<T>,
  dependencies: React.DependencyList = []
) => {
  const [data, setData] = React.useState<T | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  
  const execute = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await asyncFn();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, dependencies);
  
  React.useEffect(() => {
    execute();
  }, [execute]);
  
  return { data, isLoading, error, refetch: execute };
};
