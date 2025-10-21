# Modern Error Handling for Chart Components

This document explains how to implement modern, efficient error handling for chart components that show API failures with endpoint details and error reasons.

## Components Created

### 1. ErrorState Component (`src/components/ui/ErrorState.tsx`)

A modern, reusable error state component that displays:
- Error icon (network, API, auth, or generic)
- Error message
- Endpoint information
- Error reason
- Retry functionality
- Compact mode for smaller spaces

**Features:**
- Color-coded error types
- Responsive design
- Retry button with loading state
- Compact mode for inline errors

### 2. useChartError Hook (`src/hooks/useChartError.ts`)

A custom hook for managing chart error states:
- Error state management
- Retry functionality
- Loading states
- Error clearing

### 3. ChartErrorWrapper Component (`src/components/charts/ChartErrorWrapper.tsx`)

A wrapper component that handles error states for chart components:
- Shows loading state
- Shows error state
- Shows chart content when no errors

## Usage Examples

### Basic Chart Component with Error Handling

```typescript
import React, { useEffect, useState } from 'react';
import { ErrorState } from '@/components/ui/ErrorState';
import { useChartError } from '@/hooks/useChartError';

export const MyChart: React.FC<MyChartProps> = ({ data, endpoint }) => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const { error, setError, retry, isRetrying } = useChartError(async () => {
    await fetchData();
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setChartData(data);
    } catch (err) {
      setError({
        message: 'Failed to load chart data',
        endpoint: endpoint,
        reason: err instanceof Error ? err.message : 'Unknown error',
        errorType: 'api',
        details: `Status: ${response?.status}`,
        timestamp: Date.now()
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [endpoint]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return (
      <ErrorState
        message={error.message}
        endpoint={error.endpoint}
        reason={error.reason}
        errorType={error.errorType}
        details={error.details}
        showRetry={true}
        onRetry={retry}
        isRetrying={isRetrying}
        compact={false}
      />
    );
  }

  return <div>{/* Your chart component */}</div>;
};
```

### Using ChartErrorWrapper

```typescript
import { ChartErrorWrapper } from '@/components/charts/ChartErrorWrapper';

export const MyChart: React.FC<MyChartProps> = ({ data, endpoint }) => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ... fetch logic ...

  return (
    <ChartErrorWrapper
      error={error}
      isLoading={loading}
      onRetry={() => fetchData()}
      compact={false}
    >
      <div>{/* Your chart component */}</div>
    </ChartErrorWrapper>
  );
};
```

## Error Types

The system supports different error types with appropriate icons and colors:

- **network**: Network connectivity issues (WifiOff icon, red)
- **api**: API/Server errors (AlertCircle icon, orange)
- **auth**: Authentication errors (AlertCircle icon, yellow)
- **generic**: General errors (AlertCircle icon, red)

## Integration with SmartChartLayout

The `SmartChartLayout` component has been updated to:
- Include endpoint information for each chart
- Handle initialization errors
- Provide retry functionality
- Show error states for individual charts

## Best Practices

1. **Always provide endpoint information** - This helps users understand which service failed
2. **Include meaningful error reasons** - Don't just show "Error occurred"
3. **Use appropriate error types** - This helps with visual distinction
4. **Provide retry functionality** - Allow users to recover from transient errors
5. **Use compact mode** for inline errors in smaller spaces
6. **Include relevant details** - Such as IDs, timestamps, or status codes

## Error State Props

```typescript
interface ErrorStateProps {
  message?: string;           // Error message to display
  endpoint?: string;         // The endpoint that failed
  reason?: string;           // The error reason/code
  showRetry?: boolean;       // Whether to show retry button
  onRetry?: () => void;      // Retry function
  errorType?: 'network' | 'api' | 'auth' | 'generic';
  isRetrying?: boolean;      // Whether currently retrying
  details?: string;          // Additional details
  compact?: boolean;         // Compact mode for smaller spaces
}
```

This error handling system provides a modern, user-friendly way to display API failures with clear information about what went wrong and how to fix it.
