/**
 * Hook for determining error type from error message
 * Implements best practices for error categorization
 */

export const useErrorType = (error: string): 'network' | 'data' | 'permission' | 'api' | 'unknown' => {
  const errorLower = error.toLowerCase();
  
  if (errorLower.includes('network') || errorLower.includes('connection') || errorLower.includes('timeout')) {
    return 'network';
  }
  if (errorLower.includes('permission') || errorLower.includes('unauthorized') || errorLower.includes('forbidden')) {
    return 'permission';
  }
  if (errorLower.includes('api') || errorLower.includes('service') || errorLower.includes('endpoint')) {
    return 'api';
  }
  if (errorLower.includes('data') || errorLower.includes('unavailable') || errorLower.includes('not found')) {
    return 'data';
  }
  
  return 'unknown';
};

