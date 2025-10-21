// React 19 compatibility polyfill for Radix UI components
import React, { useEffect } from 'react';

// Simple useLayoutEffect polyfill for SSR compatibility
// This prevents "Cannot read properties of undefined (reading 'useLayoutEffect')" errors
if (typeof window === 'undefined') {
  // @ts-ignore
  React.useLayoutEffect = React.useEffect;
}

// Export React with all hooks available
export default React;
