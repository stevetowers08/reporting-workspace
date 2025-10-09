// React 19 compatibility polyfill for Radix UI components
import React from 'react';

// Ensure useLayoutEffect is available for older libraries
if (typeof window !== 'undefined' && !React.useLayoutEffect) {
  // Fallback to useEffect for SSR compatibility
  React.useLayoutEffect = React.useEffect;
}

// Export React with all hooks available
export default React;
